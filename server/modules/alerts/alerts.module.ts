import { Module } from '@nestjs/common';
import { AlertRulesController } from './alert-rules.controller';
import { AlertRecordsController } from './alert-records.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertRulesController, AlertRecordsController],
  providers: [AlertsService],
})
export class AlertsModule {}
