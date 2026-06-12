import { Logger } from '@nestjs/common';
import { Automation, BindTrigger } from '@lark-apaas/fullstack-nestjs-core';
import { MetricSyncService } from './metric-sync.service';

const EXTRA_SYNC_DELAYS_MIN = [5, 10, 15, 25];

@Automation()
export class MetricSyncAutomation {
  private readonly logger = new Logger(MetricSyncAutomation.name);

  constructor(private readonly metricSyncService: MetricSyncService) {}

  @BindTrigger('metric_sync_cron')
  async syncMetrics(): Promise<void> {
    this.logger.log('Starting scheduled metric sync');
    await this.doSync();

    for (const delayMin of EXTRA_SYNC_DELAYS_MIN) {
      setTimeout(
        () => this.doSync(),
        delayMin * 60 * 1000,
      );
    }
  }

  private async doSync(): Promise<void> {
    try {
      await this.metricSyncService.syncAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Metric sync failed: ${msg}`);
    }
  }
}
