import { Controller, Get, Param, Query } from '@nestjs/common';
import { ModelsService } from './models.service';

@Controller('api/models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
  ) {}

  @Get()
  async getModelList(
    @Query('keyword') keyword?: string,
  ) {
    return this.modelsService.getModelList(keyword);
  }

  @Get(':id/metrics')
  async getModelMetrics(
    @Param('id') id: string,
    @Query('timeRange') timeRange = '24h',
  ) {
    return this.modelsService.getModelMetrics(id, timeRange);
  }
}
