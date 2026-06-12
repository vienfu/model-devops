import {
  Controller,
  Get,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AlertsService } from './alerts.service';

@Controller('api/alert-records')
export class AlertRecordsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async getRecordList(
    @Query('timeRange') timeRange?: string,
    @Query('level') level?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.alertsService.getRecordList({
      timeRange,
      level,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @NeedLogin()
  @Post(':id/resend')
  async resendNotification(@Param('id') id: string) {
    return this.alertsService.resendNotification(id);
  }
}
