import { Controller, Post } from '@nestjs/common';
import { MetricSyncService } from './metric-sync.service';

@Controller('api/metric-sync')
export class MetricSyncController {
  constructor(private readonly metricSyncService: MetricSyncService) {}

  @Post('sync')
  async sync() {
    await this.metricSyncService.syncAll();
    return { success: true };
  }
}
