import { Module } from '@nestjs/common';
import { MetricSyncService } from './metric-sync.service';
import { MetricSyncAutomation } from './metric-sync.automation';
import { MetricSyncController } from './metric-sync.controller';
import { PrometheusModule } from '@server/modules/prometheus/prometheus.module';

@Module({
  imports: [PrometheusModule],
  controllers: [MetricSyncController],
  providers: [MetricSyncService, MetricSyncAutomation],
})
export class MetricSyncModule {}
