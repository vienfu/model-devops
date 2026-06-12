import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { analysisReport } from '@server/database/schema';
import { desc, eq, count, sql } from 'drizzle-orm';
import type {
  CreateAnalysisReportRequest,
  AnalysisReportListItem,
  AnalysisReportListResponse,
  AnalysisReportDetail,
} from '@shared/api.interface';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async createReport(
    data: CreateAnalysisReportRequest,
  ): Promise<{ id: string }> {
    const modelIdsText: string | null = data.modelIds
      ? JSON.stringify(data.modelIds)
      : null;

    const result = await this.db
      .insert(analysisReport)
      .values({
        scope: data.scope,
        modelIds: modelIdsText,
        timeRange: data.timeRange,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        content: data.content,
        status: data.status,
      })
      .returning({ id: analysisReport.id });

    this.logger.log(`Report created with id: ${result[0].id}`);
    return { id: result[0].id };
  }

  async getReportList(
    page: number,
    pageSize: number,
  ): Promise<AnalysisReportListResponse> {
    const offset = (page - 1) * pageSize;

    const totalResult = await this.db
      .select({ count: count() })
      .from(analysisReport);
    const total: number = Number(totalResult[0].count);

    const rows = await this.db
      .select()
      .from(analysisReport)
      .orderBy(desc(analysisReport.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: AnalysisReportListItem[] = rows.map(
      (row: typeof rows[number]) => ({
        id: row.id,
        scope: row.scope,
        timeRange: row.timeRange,
        createdAt: row.createdAt.toISOString(),
        status: row.status,
        summary: row.content ? row.content.substring(0, 100) : '',
      }),
    );

    return { items, total };
  }

  async getReportDetail(id: string): Promise<AnalysisReportDetail | null> {
    const rows = await this.db
      .select()
      .from(analysisReport)
      .where(eq(analysisReport.id, id))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row: typeof rows[number] = rows[0];
    let modelIds: string[] | undefined;
    if (row.modelIds) {
      try {
        modelIds = JSON.parse(row.modelIds) as string[];
      } catch {
        modelIds = undefined;
      }
    }

    return {
      id: row.id,
      scope: row.scope,
      modelIds,
      timeRange: row.timeRange,
      startTime: row.startTime ? row.startTime.toISOString() : '',
      endTime: row.endTime ? row.endTime.toISOString() : '',
      content: row.content || '',
      createdAt: row.createdAt.toISOString(),
    };
  }
}
