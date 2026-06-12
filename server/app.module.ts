import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ModelsModule } from './modules/models/models.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PrometheusModule } from './modules/prometheus/prometheus.module';
import { MetricSyncModule } from './modules/metric-sync/metric-sync.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    PrometheusModule,
    MetricSyncModule,
    DashboardModule,
    ModelsModule,
    AnalysisModule,
    AlertsModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
