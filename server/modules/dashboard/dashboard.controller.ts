import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  async getKpis(@Query('timeRange') timeRange: string = '24h') {
    return this.dashboardService.getKpis(timeRange);
  }

  @Get('trends')
  async getTrends(@Query('timeRange') timeRange: string = '24h') {
    return this.dashboardService.getTrends(timeRange);
  }
}
