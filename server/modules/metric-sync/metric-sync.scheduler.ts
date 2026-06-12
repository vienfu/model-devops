import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MetricSyncService } from './metric-sync.service';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 默认 5 分钟

@Injectable()
export class MetricSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricSyncScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly metricSyncService: MetricSyncService) {}

  onModuleInit(): void {
    const intervalMs = this.resolveIntervalMs();
    this.logger.log(
      `MetricSyncScheduler started, interval=${intervalMs}ms`,
    );
    // 启动后立即跑一次，避免冷启动期间前端无数据
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private resolveIntervalMs(): number {
    const raw = process.env.METRIC_SYNC_INTERVAL_MS;
    if (!raw) return DEFAULT_INTERVAL_MS;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 1000) {
      this.logger.warn(
        `Invalid METRIC_SYNC_INTERVAL_MS=${raw}, fallback to ${DEFAULT_INTERVAL_MS}ms`,
      );
      return DEFAULT_INTERVAL_MS;
    }
    return num;
  }

  private async tick(): Promise<void> {
    if (this.running) {
      this.logger.warn('Previous metric sync still running, skip this tick');
      return;
    }
    this.running = true;
    const startedAt = Date.now();
    try {
      await this.metricSyncService.syncAll();
      this.logger.log(
        `Scheduled metric sync done in ${Date.now() - startedAt}ms`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Scheduled metric sync failed: ${msg}`);
    } finally {
      this.running = false;
    }
  }
}
