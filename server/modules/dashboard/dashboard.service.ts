import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { count, and, gte, lt } from 'drizzle-orm';
import { model, metricData } from '@server/database/schema';
import type {
  DashboardKpisResponse,
  DashboardTrendsResponse,
  TrendPoint,
  TokenTrendPoint,
} from '@shared/api.interface';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private getTimeParams(timeRange: string) {
    const end = new Date();
    let durationMs: number;
    let bucketSec: number;
    let sparkBucketSec: number;

    switch (timeRange) {
      case '7d':
        durationMs = 7 * 86400000;
        bucketSec = 21600;
        sparkBucketSec = 86400;
        break;
      case '30d':
        durationMs = 30 * 86400000;
        bucketSec = 86400;
        sparkBucketSec = 345600;
        break;
      default:
        durationMs = 86400000;
        bucketSec = 3600;
        sparkBucketSec = 10800;
        break;
    }

    const start = new Date(end.getTime() - durationMs);
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    return { start, end, prevStart, prevEnd, bucketSec, sparkBucketSec };
  }

  private async getCounterDeltas(
    start: Date,
    end: Date,
  ): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        modelId: metricData.modelId,
        metricType: metricData.metricType,
        value: metricData.value,
        recordedAt: metricData.recordedAt,
      })
      .from(metricData)
      .where(
        and(gte(metricData.recordedAt, start), lt(metricData.recordedAt, end)),
      );

    const series: Record<string, Array<{ ts: number; val: number }>> = {};
    for (const row of rows) {
      const val = parseFloat(row.value);
      if (isNaN(val)) continue;
      const key = `${row.modelId ?? 'global'}::${row.metricType}`;
      if (!series[key]) series[key] = [];
      series[key].push({ ts: row.recordedAt.getTime(), val });
    }

    const deltas: Record<string, number> = {};
    for (const [key, points] of Object.entries(series)) {
      const metricType = key.split('::').pop()!;
      points.sort((a, b) => a.ts - b.ts);
      let delta = points.length > 0 ? points[0].val : 0;
      for (let i = 1; i < points.length; i++) {
        const diff = points[i].val - points[i - 1].val;
        delta += diff >= 0 ? diff : points[i].val;
      }
      deltas[metricType] = (deltas[metricType] ?? 0) + delta;
    }

    return deltas;
  }

  private async getBucketedCounterDeltas(
    start: Date,
    end: Date,
    bucketSec: number,
  ): Promise<Map<number, Record<string, number>>> {
    const rows = await this.db
      .select({
        modelId: metricData.modelId,
        metricType: metricData.metricType,
        value: metricData.value,
        recordedAt: metricData.recordedAt,
      })
      .from(metricData)
      .where(
        and(gte(metricData.recordedAt, start), lt(metricData.recordedAt, end)),
      );

    const series: Record<string, Array<{ ts: number; val: number }>> = {};
    for (const row of rows) {
      const val = parseFloat(row.value);
      if (isNaN(val)) continue;
      const key = `${row.modelId ?? 'global'}::${row.metricType}`;
      if (!series[key]) series[key] = [];
      series[key].push({ ts: row.recordedAt.getTime(), val });
    }

    const deltaPoints: Array<{ metricType: string; ts: number; delta: number }> =
      [];
    for (const [key, points] of Object.entries(series)) {
      const metricType = key.split('::').pop()!;
      points.sort((a, b) => a.ts - b.ts);
      if (points.length > 0) {
        // First sample of a (model, metric) series: treat as delta from a 0 baseline
        // so that initial sync still produces visible trend points.
        deltaPoints.push({
          metricType,
          ts: points[0].ts,
          delta: points[0].val,
        });
      }
      for (let i = 1; i < points.length; i++) {
        const diff = points[i].val - points[i - 1].val;
        const delta = diff >= 0 ? diff : points[i].val;
        deltaPoints.push({ metricType, ts: points[i].ts, delta });
      }
    }

    const bucketMs = bucketSec * 1000;
    const buckets = new Map<number, Record<string, number>>();
    for (const dp of deltaPoints) {
      const bucketTs = Math.floor(dp.ts / bucketMs) * bucketMs;
      if (!buckets.has(bucketTs)) buckets.set(bucketTs, {});
      const bucket = buckets.get(bucketTs)!;
      bucket[dp.metricType] = (bucket[dp.metricType] ?? 0) + dp.delta;
    }

    return buckets;
  }

  /**
   * 取每个 (modelId, metricType) 在全表内的最新累计值并按 metricType 求和，
   * 用于「累计API调用量」「累计Token消耗」等不随时间窗变化的全局累计指标。
   */
  private async getCounterLatestAllTime(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        modelId: metricData.modelId,
        metricType: metricData.metricType,
        value: metricData.value,
      })
      .from(metricData);

    const latest = new Map<string, number>();
    for (const row of rows) {
      const val = parseFloat(row.value);
      if (isNaN(val)) continue;
      const key = `${row.modelId ?? 'global'}::${row.metricType}`;
      const existing = latest.get(key);
      if (existing === undefined || val > existing) {
        latest.set(key, val);
      }
    }

    const result: Record<string, number> = {};
    for (const [key, val] of latest) {
      const metricType = key.split('::').pop()!;
      result[metricType] = (result[metricType] ?? 0) + val;
    }
    return result;
  }

  private async getCounterLatest(
    start: Date,
    end: Date,
  ): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        modelId: metricData.modelId,
        metricType: metricData.metricType,
        value: metricData.value,
        recordedAt: metricData.recordedAt,
      })
      .from(metricData)
      .where(
        and(gte(metricData.recordedAt, start), lt(metricData.recordedAt, end)),
      );

    const latest = new Map<string, number>();
    for (const row of rows) {
      const val = parseFloat(row.value);
      if (isNaN(val)) continue;
      const key = `${row.modelId ?? 'global'}::${row.metricType}`;
      const existing = latest.get(key);
      if (existing === undefined || val > existing) {
        latest.set(key, val);
      }
    }

    const result: Record<string, number> = {};
    for (const [key, val] of latest) {
      const metricType = key.split('::').pop()!;
      result[metricType] = (result[metricType] ?? 0) + val;
    }
    return result;
  }

  async getKpis(timeRange: string): Promise<DashboardKpisResponse> {
    const { start, end, prevStart, prevEnd, sparkBucketSec } =
      this.getTimeParams(timeRange);

    const result = await this.db.select({ count: count() }).from(model);
    const totalModels: number = Number(result[0]?.count ?? 0);

    // 「模型总数 / 累计API调用量 / 累计Token消耗」是全局累计值，不随 timeRange 变化
    const allTime = await this.getCounterLatestAllTime();
    const totalApiCalls = allTime['api_calls_total'] ?? 0;
    const totalTokenConsumption =
      (allTime['prompt_tokens_total'] ?? 0) +
      (allTime['generation_tokens_total'] ?? 0);

    // 以下随 timeRange 变化（成功率 / 平均延迟基于当前窗内 counter 增量）
    const currentLatest = await this.getCounterLatest(start, end);
    const prevLatest = await this.getCounterLatest(prevStart, prevEnd);

    const successTotal = currentLatest['success_calls_total'] ?? 0;
    const failTotal = currentLatest['fail_calls_total'] ?? 0;
    const total = successTotal + failTotal;
    const successRate = total > 0 ? (successTotal / total) * 100 : 100;
    const e2eSumDelta = currentLatest['e2e_latency_sum_total'] ?? 0;
    const e2eCountDelta = currentLatest['e2e_latency_count_total'] ?? 0;
    const avgLatencyMs =
      e2eCountDelta > 0 ? (e2eSumDelta / e2eCountDelta) * 1000 : 0;

    const prevApiCalls = prevLatest['api_calls_total'] ?? 0;
    const prevTokenConsumption =
      (prevLatest['prompt_tokens_total'] ?? 0) +
      (prevLatest['generation_tokens_total'] ?? 0);
    const prevSuccessTotal = prevLatest['success_calls_total'] ?? 0;
    const prevFailTotal = prevLatest['fail_calls_total'] ?? 0;
    const prevTotal = prevSuccessTotal + prevFailTotal;
    const prevSuccessRate =
      prevTotal > 0 ? (prevSuccessTotal / prevTotal) * 100 : 100;
    const prevE2eSumDelta = prevLatest['e2e_latency_sum_total'] ?? 0;
    const prevE2eCountDelta = prevLatest['e2e_latency_count_total'] ?? 0;
    const prevAvgLatencyMs =
      prevE2eCountDelta > 0
        ? (prevE2eSumDelta / prevE2eCountDelta) * 1000
        : 0;

    // 累计型 KPI 的环比：用当前窗增量 vs 上一窗增量来反映「最近活跃度」
    const currApiDelta = currentLatest['api_calls_total'] ?? 0;
    const currTokenDelta =
      (currentLatest['prompt_tokens_total'] ?? 0) +
      (currentLatest['generation_tokens_total'] ?? 0);

    const change = {
      totalApiCalls:
        prevApiCalls > 0
          ? Number(
              ((currApiDelta - prevApiCalls) / prevApiCalls * 100).toFixed(1),
            )
          : 0,
      totalTokenConsumption:
        prevTokenConsumption > 0
          ? Number(
              (
                (currTokenDelta - prevTokenConsumption) /
                prevTokenConsumption *
                100
              ).toFixed(1),
            )
          : 0,
      successRate: Number((successRate - prevSuccessRate).toFixed(2)),
      avgLatency:
        prevAvgLatencyMs > 0
          ? Number(
              (
                (avgLatencyMs - prevAvgLatencyMs) /
                prevAvgLatencyMs *
                100
              ).toFixed(1),
            )
          : 0,
    };

    const sparkBuckets = await this.getBucketedCounterDeltas(
      start,
      end,
      sparkBucketSec,
    );
    // 同样补齐缺失桶，使 sparkline 反映完整时间窗
    const sparkBucketMs = sparkBucketSec * 1000;
    const sparkFirst = Math.floor(start.getTime() / sparkBucketMs) * sparkBucketMs;
    const sparkLast = Math.floor((end.getTime() - 1) / sparkBucketMs) * sparkBucketMs;
    const sortedSpark: Array<[number, Record<string, number>]> = [];
    for (let ts = sparkFirst; ts <= sparkLast; ts += sparkBucketMs) {
      sortedSpark.push([ts, sparkBuckets.get(ts) ?? {}]);
    }

    const sparklines = {
      apiCalls: sortedSpark.map(([, m]) =>
        Math.round(m['api_calls_total'] ?? 0),
      ),
      tokenConsumption: sortedSpark.map(([, m]) =>
        Math.round(
          (m['prompt_tokens_total'] ?? 0) +
            (m['generation_tokens_total'] ?? 0),
        ),
      ),
      successRate: sortedSpark.map(([, m]) => {
        const s = m['success_calls_total'] ?? 0;
        const f = m['fail_calls_total'] ?? 0;
        const t = s + f;
        return t > 0 ? Number(((s / t) * 100).toFixed(2)) : 100;
      }),
      avgLatency: sortedSpark.map(([, m]) => {
        const sumR = m['e2e_latency_sum_total'] ?? 0;
        const cntR = m['e2e_latency_count_total'] ?? 0;
        return cntR > 0 ? Math.round((sumR / cntR) * 1000) : 0;
      }),
    };

    return {
      totalModels,
      totalApiCalls: Math.round(totalApiCalls),
      totalTokenConsumption: Math.round(totalTokenConsumption),
      successRate: Number(successRate.toFixed(1)),
      avgLatency: Number(avgLatencyMs.toFixed(0)),
      change,
      sparklines,
    };
  }

  async getTrends(timeRange: string): Promise<DashboardTrendsResponse> {
    const { start, end, bucketSec } = this.getTimeParams(timeRange);

    const buckets = await this.getBucketedCounterDeltas(start, end, bucketSec);

    // 生成完整桶序列：覆盖整个时间窗，缺失桶补 0，避免横轴只显示有数据的点位
    const bucketMs = bucketSec * 1000;
    const firstBucket = Math.floor(start.getTime() / bucketMs) * bucketMs;
    const lastBucket = Math.floor((end.getTime() - 1) / bucketMs) * bucketMs;
    const fullSeries: Array<[number, Record<string, number>]> = [];
    for (let ts = firstBucket; ts <= lastBucket; ts += bucketMs) {
      fullSeries.push([ts, buckets.get(ts) ?? {}]);
    }

    const apiCallsTrend: TrendPoint[] = fullSeries.map(([ts, m]) => ({
      timestamp: new Date(ts).toISOString(),
      value: Math.round(m['api_calls_total'] ?? 0),
    }));

    const tokenConsumptionTrend: TokenTrendPoint[] = fullSeries.map(
      ([ts, m]) => ({
        timestamp: new Date(ts).toISOString(),
        input: Math.round(m['prompt_tokens_total'] ?? 0),
        output: Math.round(m['generation_tokens_total'] ?? 0),
      }),
    );

    const successRateTrend: TrendPoint[] = fullSeries.map(([ts, m]) => {
      const s = m['success_calls_total'] ?? 0;
      const f = m['fail_calls_total'] ?? 0;
      const t = s + f;
      return {
        timestamp: new Date(ts).toISOString(),
        value: t > 0 ? Number(((s / t) * 100).toFixed(2)) : 100,
      };
    });

    const avgLatencyTrend: TrendPoint[] = fullSeries.map(([ts, m]) => {
      const sumR = m['e2e_latency_sum_total'] ?? 0;
      const cntR = m['e2e_latency_count_total'] ?? 0;
      return {
        timestamp: new Date(ts).toISOString(),
        value: cntR > 0 ? Math.round((sumR / cntR) * 1000) : 0,
      };
    });

    return {
      apiCallsTrend,
      tokenConsumptionTrend,
      successRateTrend,
      avgLatencyTrend,
    };
  }
}
