import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { metricData, model } from '@server/database/schema';
import { eq, notInArray, lt } from 'drizzle-orm';
import { PrometheusService } from '@server/modules/prometheus/prometheus.service';

const PER_MODEL_QUERIES: Array<{ metricType: string; queryTemplate: string }> = [
  {
    metricType: 'api_calls_total',
    queryTemplate:
      'sum(vllm:request_success_total{model_name="{name}"})',
  },
  {
    metricType: 'success_calls_total',
    queryTemplate:
      'sum(vllm:request_success_total{model_name="{name}",finished_reason=~"length|stop"})',
  },
  {
    metricType: 'fail_calls_total',
    queryTemplate:
      'sum(vllm:request_success_total{model_name="{name}",finished_reason="abort"})',
  },
  {
    metricType: 'e2e_latency_sum_total',
    queryTemplate:
      'sum(vllm:e2e_request_latency_seconds_sum{model_name="{name}"})',
  },
  {
    metricType: 'e2e_latency_count_total',
    queryTemplate:
      'sum(vllm:e2e_request_latency_seconds_count{model_name="{name}"})',
  },
  {
    metricType: 'ttft_sum_total',
    queryTemplate:
      'sum(vllm:time_to_first_token_seconds_sum{model_name="{name}"})',
  },
  {
    metricType: 'ttft_count_total',
    queryTemplate:
      'sum(vllm:time_to_first_token_seconds_count{model_name="{name}"})',
  },
  {
    metricType: 'tpot_sum_total',
    queryTemplate:
      'sum(vllm:request_time_per_output_token_seconds_sum{model_name="{name}"})',
  },
  {
    metricType: 'tpot_count_total',
    queryTemplate:
      'sum(vllm:request_time_per_output_token_seconds_count{model_name="{name}"})',
  },
  {
    metricType: 'itl_sum_total',
    queryTemplate:
      'sum(vllm:inter_token_latency_seconds_sum{model_name="{name}"})',
  },
  {
    metricType: 'itl_count_total',
    queryTemplate:
      'sum(vllm:inter_token_latency_seconds_count{model_name="{name}"})',
  },
  {
    metricType: 'prompt_tokens_total',
    queryTemplate:
      'sum(vllm:prompt_tokens_total{model_name="{name}"})',
  },
  {
    metricType: 'generation_tokens_total',
    queryTemplate:
      'sum(vllm:generation_tokens_total{model_name="{name}"})',
  },
];

const RETRY_COUNT = 1;
const RETRY_DELAY_MS = 3000;

@Injectable()
export class MetricSyncService {
  private readonly logger = new Logger(MetricSyncService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly prom: PrometheusService,
  ) {}

  private async retryGetScalar(
    query: string,
    fallback = 0,
  ): Promise<number> {
    for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
      const val = await this.prom.getScalar(query, -1);
      if (val >= 0) return val;
      if (attempt < RETRY_COUNT) {
        this.logger.warn(
          `Query failed (attempt ${String(attempt + 1)}), retrying: ${query.substring(0, 80)}`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    return fallback;
  }

  async syncAll(): Promise<void> {
    this.logger.log('Starting metric sync from Prometheus');
    const startTime = Date.now();

    try {
      await this.syncModels();
      await this.syncMetrics();
      await this.cleanup();
      const duration = Date.now() - startTime;
      this.logger.log(`Metric sync completed in ${String(duration)}ms`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Metric sync failed: ${msg}`);
      throw err;
    }
  }

  private async syncModels(): Promise<void> {
    let modelNames: string[] = [];
    for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
      modelNames = await this.prom.getModelNames();
      if (modelNames.length > 0) break;
      if (attempt < RETRY_COUNT) {
        this.logger.warn(
          `getModelNames returned empty (attempt ${String(attempt + 1)}), retrying`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    this.logger.log(
      `Discovered ${String(modelNames.length)} models from Prometheus`,
    );

    if (modelNames.length > 0) {
      const deleted = await this.db
        .delete(model)
        .where(notInArray(model.name, modelNames))
        .returning({ name: model.name });
      if (deleted.length > 0) {
        this.logger.log(
          `Removed ${String(deleted.length)} stale models: ${deleted.map((d) => d.name).join(', ')}`,
        );
      }
    }

    for (const name of modelNames) {
      const existing = await this.db
        .select({ id: model.id })
        .from(model)
        .where(eq(model.name, name));

      if (existing.length === 0) {
        await this.db.insert(model).values({
          name,
          description: `vLLM model: ${name}`,
          status: 'active',
        });
        this.logger.log(`Inserted new model: ${name}`);
      }
    }
  }

  private async syncMetrics(): Promise<void> {
    const models = await this.db
      .select({ id: model.id, name: model.name })
      .from(model);

    const allRows: Array<{
      modelId: string;
      metricType: string;
      value: string;
    }> = [];

    for (const m of models) {
      for (const { metricType, queryTemplate } of PER_MODEL_QUERIES) {
        const query = queryTemplate.replace('{name}', m.name);
        const val = await this.retryGetScalar(query, -1);
        if (val >= 0) {
          allRows.push({
            modelId: m.id,
            metricType,
            value: String(val),
          });
        }
      }
    }

    if (allRows.length > 0) {
      await this.db.insert(metricData).values(
        allRows.map((r) => ({
          modelId: r.modelId,
          metricType: r.metricType,
          value: r.value,
        })),
      );
    }

    this.logger.log(
      `Synced ${String(allRows.length)} model rows`,
    );
  }

  private async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deleted = await this.db
      .delete(metricData)
      .where(lt(metricData.recordedAt, cutoff))
      .returning({ id: metricData.id });
    if (deleted.length > 0) {
      this.logger.log(
        `Cleaned up ${String(deleted.length)} metric rows older than 90 days`,
      );
    }
  }
}
