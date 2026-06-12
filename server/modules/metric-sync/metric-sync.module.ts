import { Module } from '@nestjs/common';
import { MetricSyncService } from './metric-sync.service';
import { MetricSyncScheduler } from './metric-sync.scheduler';
import { MetricSyncController } from './metric-sync.controller';
import { PrometheusModule } from '@server/modules/prometheus/prometheus.module';

@Module({
  imports: [PrometheusModule],
  controllers: [MetricSyncController],
  providers: [MetricSyncService, MetricSyncScheduler],
})
export class MetricSyncModule {}
