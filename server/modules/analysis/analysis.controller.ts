import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AnalysisService } from './analysis.service';
import type { CreateAnalysisReportRequest } from '@shared/api.interface';

@Controller('api/analysis-reports')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @NeedLogin()
  @Post()
  async createReport(@Body() body: CreateAnalysisReportRequest) {
    this.logger.log('Creating analysis report');
    return this.analysisService.createReport(body);
  }

  @Get()
  async getReportList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    const pageNum: number = parseInt(page, 10) || 1;
    const pageSizeNum: number = parseInt(pageSize, 10) || 10;
    return this.analysisService.getReportList(pageNum, pageSizeNum);
  }

  @Get(':id')
  async getReportDetail(@Param('id') id: string) {
    const report = await this.analysisService.getReportDetail(id);
    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return report;
  }
}
