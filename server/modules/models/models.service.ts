import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { model, metricData } from '@server/database/schema';
import { eq, ilike, and, gte, lt } from 'drizzle-orm';
import { PrometheusService } from '@server/modules/prometheus/prometheus.service';
import type {
  ModelListResponse,
  ModelMetricsResponse,
  ModelListItem,
} from '@shared/api.interface';

@Injectable()
export class ModelsService {
  private readonly logger = new Logger(ModelsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly prometheusService: PrometheusService,
  ) {}

  private computeCounterDeltas(
    rows: Array<{ metricType: string; value: string; recordedAt: Date }>,
  ): Record<string, number> {
    const series: Record<string, Array<{ ts: number; val: number }>> = {};
    for (const row of rows) {
      const val = parseFloat(row.value);
      if (isNaN(val)) continue;
      if (!series[row.metricType]) series[row.metricType] = [];
      series[row.metricType].push({ ts: row.recordedAt.getTime(), val });
    }

    const deltas: Record<string, number> = {};
    for (const [key, points] of Object.entries(series)) {
      points.sort((a, b) => a.ts - b.ts);
      let delta = 0;
      // 首点也计入：从 0 基线起累加（与 Dashboard 一致）
      for (let i = 0; i < points.length; i++) {
        const prev = i === 0 ? 0 : points[i - 1].val;
        const diff = points[i].val - prev;
        delta += diff >= 0 ? diff : points[i].val;
      }
      deltas[key] = delta;
    }
    return deltas;
  }

  private computeBucketedCounterDeltas(
    rows: Array<{ metricType: string; value: string; recordedAt: Date }>,
    bucketSec: number,
  ): Map<number, Record<string, number>> {
    const series: Record<string, Array<{ ts: number; val: number }>> = {};
    for (const row of rows) {
      const val = parseFloat(row.value);
      if (isNaN(val)) continue;
      if (!series[row.metricType]) series[row.metricType] = [];
      series[row.metricType].push({ ts: row.recordedAt.getTime(), val });
    }

    const deltaPoints: Array<{
      metricType: string;
      ts: number;
      delta: number;
    }> = [];
    for (const [metricType, points] of Object.entries(series)) {
      points.sort((a, b) => a.ts - b.ts);
      // 首点视为从 0 基线起的 delta（与 Dashboard 一致），避免「首次同步无趋势」
      for (let i = 0; i < points.length; i++) {
        const prev = i === 0 ? 0 : points[i - 1].val;
        const diff = points[i].val - prev;
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

  async getModelList(keyword?: string): Promise<ModelListResponse> {
    this.logger.log(
      'Fetching model list' + (keyword ? ` with keyword: ${keyword}` : ''),
    );

    const conditions = [];
    if (keyword) {
      conditions.push(ilike(model.name, `%${keyword}%`));
    }

    const query =
      conditions.length > 0
        ? this.db.select().from(model).where(and(...conditions))
        : this.db.select().from(model);

    const rows = await query;

    // 查询每个 model_name 当前关联的 Pod 名称（来自 vllm metric label）
    const podsByModel = await this.prometheusService.getModelPods();

    const start24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const metricRows = await this.db
      .select({
        modelId: metricData.modelId,
        metricType: metricData.metricType,
        value: metricData.value,
        recordedAt: metricData.recordedAt,
      })
      .from(metricData)
      .where(gte(metricData.recordedAt, start24h));

    const modelSeries = new Map<
      string,
      Array<{ metricType: string; value: string; recordedAt: Date }>
    >();
    for (const row of metricRows) {
      if (!row.modelId) continue;
      if (!modelSeries.has(row.modelId)) modelSeries.set(row.modelId, []);
      modelSeries.get(row.modelId)!.push({
        metricType: row.metricType,
        value: row.value,
        recordedAt: row.recordedAt,
      });
    }

    const items: ModelListItem[] = rows.map((row) => {
      const series = modelSeries.get(row.id) ?? [];
      const metrics = this.computeCounterDeltas(series);
      const apiCalls = metrics['api_calls_total'] ?? 0;
      const successTotal = metrics['success_calls_total'] ?? 0;
      const failTotal = metrics['fail_calls_total'] ?? 0;
      const total = successTotal + failTotal;
      const successRate = total > 0 ? (successTotal / total) * 100 : 100;
      const e2eSumDelta = metrics['e2e_latency_sum_total'] ?? 0;
      const e2eCountDelta = metrics['e2e_latency_count_total'] ?? 0;
      const avgLatency =
        e2eCountDelta > 0 ? (e2eSumDelta / e2eCountDelta) * 1000 : 0;

      return {
        id: row.id,
        name: row.name,
        status: row.status,
        apiCalls: Math.round(apiCalls),
        successRate: Number(successRate.toFixed(2)),
        avgLatency: Number(avgLatency.toFixed(1)),
        pods: podsByModel[row.name] ?? [],
      };
    });

    return { items };
  }

  async getModelMetrics(
    id: string,
    timeRange: string,
  ): Promise<ModelMetricsResponse> {
    this.logger.log(
      `Fetching metrics for model ${id}, timeRange: ${timeRange}`,
    );

    const rows = await this.db
      .select()
      .from(model)
      .where(eq(model.id, id));
    const modelName = rows[0]?.name ?? '';

    if (!modelName) {
      this.logger.warn(`Model ${id} not found in database`);
    }

    const { start, end, bucketSec } = this.getTimeParams(timeRange);

    const metricRows = await this.db
      .select({
        metricType: metricData.metricType,
        value: metricData.value,
        recordedAt: metricData.recordedAt,
      })
      .from(metricData)
      .where(
        and(
          eq(metricData.modelId, id),
          gte(metricData.recordedAt, start),
          lt(metricData.recordedAt, end),
        ),
      );

    const totals = this.computeCounterDeltas(metricRows);
    const bucketMap = this.computeBucketedCounterDeltas(metricRows, bucketSec);
    // 按 start/end/bucketSec 构造完整桶序列，缺失桶用空对象兜底，
    // 让前端横轴显示完整时间窗，而不是只画有数据的几个点。
    const bucketMs = bucketSec * 1000;
    const firstBucket = Math.floor(start.getTime() / bucketMs) * bucketMs;
    const lastBucket = Math.floor((end.getTime() - 1) / bucketMs) * bucketMs;
    const sortedBuckets: Array<[number, Record<string, number>]> = [];
    for (let ts = firstBucket; ts <= lastBucket; ts += bucketMs) {
      sortedBuckets.push([ts, bucketMap.get(ts) ?? {}]);
    }

    const successTotal = totals['success_calls_total'] ?? 0;
    const failTotal = totals['fail_calls_total'] ?? 0;
    const total = successTotal + failTotal;
    const successRate = total > 0 ? (successTotal / total) * 100 : 100;

    const callQualityTrend = sortedBuckets.map(([ts, m]) => {
      const s = m['success_calls_total'] ?? 0;
      const f = m['fail_calls_total'] ?? 0;
      const t = s + f;
      const sr = t > 0 ? (s / t) * 100 : 100;
      return {
        timestamp: new Date(ts).toISOString(),
        successRate: Number(sr.toFixed(2)),
        failureRate: Number((100 - sr).toFixed(2)),
      };
    });

    const e2eCountDelta = totals['e2e_latency_count_total'] ?? 0;
    const e2eAvg =
      e2eCountDelta > 0
        ? ((totals['e2e_latency_sum_total'] ?? 0) / e2eCountDelta) * 1000
        : 0;
    const ttftCountDelta = totals['ttft_count_total'] ?? 0;
    const ttftAvg =
      ttftCountDelta > 0
        ? ((totals['ttft_sum_total'] ?? 0) / ttftCountDelta) * 1000
        : 0;
    const tpotCountDelta = totals['tpot_count_total'] ?? 0;
    const tpotAvg =
      tpotCountDelta > 0
        ? ((totals['tpot_sum_total'] ?? 0) / tpotCountDelta) * 1000
        : 0;
    const itlCountDelta = totals['itl_count_total'] ?? 0;
    const itlAvg =
      itlCountDelta > 0
        ? ((totals['itl_sum_total'] ?? 0) / itlCountDelta) * 1000
        : 0;

    const latencyTrend = sortedBuckets.map(([ts, m]) => ({
      timestamp: new Date(ts).toISOString(),
      e2e: Number(
        (
          ((m['e2e_latency_sum_total'] ?? 0) /
            (m['e2e_latency_count_total'] || 1)) *
          1000
        ).toFixed(1),
      ),
      ttft: Number(
        (
          ((m['ttft_sum_total'] ?? 0) / (m['ttft_count_total'] || 1)) *
          1000
        ).toFixed(1),
      ),
      tpot: Number(
        (
          ((m['tpot_sum_total'] ?? 0) / (m['tpot_count_total'] || 1)) *
          1000
        ).toFixed(1),
      ),
      itl: Number(
        (
          ((m['itl_sum_total'] ?? 0) / (m['itl_count_total'] || 1)) *
          1000
        ).toFixed(1),
      ),
    }));

    const totalInput = Math.round(totals['prompt_tokens_total'] ?? 0);
    const totalOutput = Math.round(totals['generation_tokens_total'] ?? 0);

    const dailyTrend = sortedBuckets.map(([ts, m]) => ({
      date: new Date(ts).toISOString(),
      input: Math.round(m['prompt_tokens_total'] ?? 0),
      output: Math.round(m['generation_tokens_total'] ?? 0),
    }));

    // GPU 资源使用：基于该模型实际占用的 Pod 计算（与 timeRange 无关，反映当下值）。
    // 显存：跨多 Pod / 多卡 sum；算力：跨多 Pod 取平均。
    const [podsByModel, podGpuMem, podGpuUtil] = await Promise.all([
      this.prometheusService.getModelPods(),
      this.prometheusService.getPodGpuMemory(),
      this.prometheusService.getPodGpuUtilization(),
    ]);
    const ownPods = podsByModel[modelName] ?? [];
    let allocatedBytes = 0;
    let usedBytes = 0;
    let computeSum = 0;
    let computeCount = 0;
    for (const pod of ownPods) {
      const m = podGpuMem[pod];
      if (m) {
        allocatedBytes += m.allocatedBytes;
        usedBytes += m.usedBytes;
      }
      const u = podGpuUtil[pod];
      if (typeof u === 'number') {
        computeSum += u;
        computeCount += 1;
      }
    }
    const memoryAllocatedPercent =
      allocatedBytes > 0 ? (usedBytes / allocatedBytes) * 100 : 0;
    const computePercent = computeCount > 0 ? computeSum / computeCount : 0;

    return {
      callQuality: {
        successRate: Number(successRate.toFixed(2)),
        failureRate: Number((100 - successRate).toFixed(2)),
        totalCalls: Math.round(total),
        trend: callQualityTrend,
      },
      latencyMetrics: {
        e2e: Number(e2eAvg.toFixed(1)),
        ttft: Number(ttftAvg.toFixed(1)),
        tpot: Number(tpotAvg.toFixed(1)),
        itl: Number(itlAvg.toFixed(1)),
        trend: latencyTrend,
      },
      tokenStatistics: {
        totalInput,
        totalOutput,
        dailyTrend,
      },
      resourceUsage: {
        memoryAllocatedPercent: Number(memoryAllocatedPercent.toFixed(1)),
        memoryUsedBytes: usedBytes,
        memoryAllocatedBytes: allocatedBytes,
        computePercent: Number(computePercent.toFixed(1)),
      },
    };
  }

  private getTimeParams(timeRange: string) {
    const end = new Date();
    let durationMs: number;
    let bucketSec: number;

    switch (timeRange) {
      case '7d':
        durationMs = 7 * 86400000;
        bucketSec = 21600;
        break;
      case '30d':
        durationMs = 30 * 86400000;
        bucketSec = 86400;
        break;
      default:
        durationMs = 86400000;
        bucketSec = 3600;
        break;
    }

    return {
      start: new Date(end.getTime() - durationMs),
      end,
      bucketSec,
    };
  }
}
