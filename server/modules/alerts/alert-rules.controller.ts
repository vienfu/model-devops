import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AlertsService } from './alerts.service';
import type {
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from '@shared/api.interface';

@Controller('api/alert-rules')
export class AlertRulesController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async getRuleList() {
    return this.alertsService.getRuleList();
  }

  @NeedLogin()
  @Post()
  async createRule(@Body() body: CreateAlertRuleRequest) {
    return this.alertsService.createRule(body);
  }

  @NeedLogin()
  @Put(':id')
  async updateRule(
    @Param('id') id: string,
    @Body() body: UpdateAlertRuleRequest,
  ) {
    return this.alertsService.updateRule(id, body);
  }

  @NeedLogin()
  @Delete(':id')
  async deleteRule(@Param('id') id: string) {
    return this.alertsService.deleteRule(id);
  }

  @NeedLogin()
  @Patch(':id/toggle')
  async toggleRule(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.alertsService.toggleRule(id, body.enabled);
  }
}
