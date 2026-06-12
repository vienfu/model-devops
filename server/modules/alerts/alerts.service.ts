import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  CapabilityService,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import {
  alertRule,
  alertRecord,
  model,
} from '@server/database/schema';
import type {
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertRuleItem,
  AlertRecordItem,
} from '@shared/api.interface';

function parseTextArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v: unknown) => String(v));
  if (typeof val === 'string') {
    if (val === '{}' || val === 'ARRAY[]') return [];
    return val.slice(1, -1).split(',').filter(Boolean);
  }
  return [];
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject() private readonly capabilityService: CapabilityService,
  ) {}

  async getRuleList(): Promise<{ items: AlertRuleItem[] }> {
    const rules = await this.db
      .select({
        id: alertRule.id,
        name: alertRule.name,
        modelId: alertRule.modelId,
        metricType: alertRule.metricType,
        operator: alertRule.operator,
        threshold: alertRule.threshold,
        level: alertRule.level,
        notifyType: alertRule.notifyType,
        notifyUsers: alertRule.notifyUsers,
        enabled: alertRule.enabled,
        createdAt: alertRule.createdAt,
        modelName: model.name,
      })
      .from(alertRule)
      .leftJoin(model, eq(alertRule.modelId, model.id))
      .orderBy(desc(alertRule.createdAt));

    const items: AlertRuleItem[] = rules.map((r: typeof rules[number]) => ({
      id: r.id,
      name: r.name,
      modelId: r.modelId ?? undefined,
      modelName: r.modelName ?? undefined,
      metricType: r.metricType,
      operator: r.operator,
      threshold: Number(r.threshold),
      level: r.level,
      notifyType: parseTextArray(r.notifyType),
      notifyUsers: parseTextArray(r.notifyUsers),
      enabled: r.enabled,
      createdAt: r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
    }));

    return { items };
  }

  async createRule(data: CreateAlertRuleRequest): Promise<{ id: string }> {
    const result = await this.db
      .insert(alertRule)
      .values({
        name: data.name,
        modelId: data.modelId ?? null,
        metricType: data.metricType,
        operator: data.operator,
        threshold: String(data.threshold),
        level: data.level,
        notifyType: sql`ARRAY[${sql.join(
          data.notifyType.map((t: string) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
        notifyUsers: sql`ARRAY[${sql.join(
          data.notifyUsers.map((u: string) => sql`${u}`),
          sql`, `,
        )}]::text[]`,
        enabled: data.enabled,
      })
      .returning({ id: alertRule.id });

    this.logger.log(`Created alert rule: ${result[0].id}`);
    return { id: result[0].id };
  }

  async updateRule(
    id: string,
    data: UpdateAlertRuleRequest,
  ): Promise<{ success: boolean }> {
    await this.db
      .update(alertRule)
      .set({
        name: data.name,
        modelId: data.modelId ?? null,
        metricType: data.metricType,
        operator: data.operator,
        threshold: String(data.threshold),
        level: data.level,
        notifyType: sql`ARRAY[${sql.join(
          data.notifyType.map((t: string) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
        notifyUsers: sql`ARRAY[${sql.join(
          data.notifyUsers.map((u: string) => sql`${u}`),
          sql`, `,
        )}]::text[]`,
        enabled: data.enabled,
      })
      .where(eq(alertRule.id, id));

    this.logger.log(`Updated alert rule: ${id}`);
    return { success: true };
  }

  async deleteRule(id: string): Promise<{ success: boolean }> {
    await this.db.delete(alertRule).where(eq(alertRule.id, id));
    this.logger.log(`Deleted alert rule: ${id}`);
    return { success: true };
  }

  async toggleRule(
    id: string,
    enabled: boolean,
  ): Promise<{ success: boolean }> {
    await this.db
      .update(alertRule)
      .set({ enabled })
      .where(eq(alertRule.id, id));

    this.logger.log(`Toggled alert rule ${id} to ${String(enabled)}`);
    return { success: true };
  }

  async getRecordList(params: {
    timeRange?: string;
    level?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: AlertRecordItem[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const conditions = [];
    if (params.level) {
      conditions.push(eq(alertRecord.level, params.level));
    }
    if (params.timeRange) {
      const now = new Date();
      let since: Date | undefined;
      if (params.timeRange === '24h') {
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (params.timeRange === '7d') {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (params.timeRange === '30d') {
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (since) {
        conditions.push(gte(alertRecord.triggerTime, since));
      }
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ count: sql<string>`count(*)` })
      .from(alertRecord)
      .where(whereClause);
    const total = Number(totalResult[0].count);

    const records = await this.db
      .select({
        id: alertRecord.id,
        ruleId: alertRecord.ruleId,
        metricType: alertRecord.metricType,
        currentValue: alertRecord.currentValue,
        threshold: alertRecord.threshold,
        level: alertRecord.level,
        notifyStatus: alertRecord.notifyStatus,
        triggerTime: alertRecord.triggerTime,
        analysisContent: alertRecord.analysisContent,
        ruleName: alertRule.name,
        modelName: model.name,
      })
      .from(alertRecord)
      .leftJoin(alertRule, eq(alertRecord.ruleId, alertRule.id))
      .leftJoin(model, eq(alertRecord.modelId, model.id))
      .where(whereClause)
      .orderBy(desc(alertRecord.triggerTime))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: AlertRecordItem[] = records.map(
      (r: typeof records[number]) => ({
        id: r.id,
        ruleId: r.ruleId ?? '',
        ruleName: r.ruleName ?? '',
        modelName: r.modelName ?? undefined,
        metricType: r.metricType,
        currentValue: Number(r.currentValue),
        threshold: Number(r.threshold),
        level: r.level,
        notifyStatus: r.notifyStatus,
        triggerTime:
          r.triggerTime instanceof Date
            ? r.triggerTime.toISOString()
            : String(r.triggerTime),
        analysisContent: r.analysisContent ?? undefined,
      }),
    );

    return { items, total };
  }

  async resendNotification(id: string): Promise<{ success: boolean }> {
    const records = await this.db
      .select({
        id: alertRecord.id,
        ruleId: alertRecord.ruleId,
        modelId: alertRecord.modelId,
        metricType: alertRecord.metricType,
        currentValue: alertRecord.currentValue,
        threshold: alertRecord.threshold,
        level: alertRecord.level,
        analysisContent: alertRecord.analysisContent,
        ruleName: alertRule.name,
        modelName: model.name,
        notifyUsers: alertRule.notifyUsers,
      })
      .from(alertRecord)
      .leftJoin(alertRule, eq(alertRecord.ruleId, alertRule.id))
      .leftJoin(model, eq(alertRecord.modelId, model.id))
      .where(eq(alertRecord.id, id))
      .limit(1);

    if (records.length === 0) {
      return { success: false };
    }

    const record = records[0];

    let analysisContent = record.analysisContent ?? '';
    if (!analysisContent) {
      try {
        const analysisPlugin = this.capabilityService.load(
          'alert_content_analysis_1',
        );
        const stream = await analysisPlugin.callStream('textGenerate', {
          metricInfo: `${record.metricType}: ${Number(record.currentValue)}`,
          ruleInfo: `${record.ruleName ?? ''} threshold: ${Number(record.threshold)}`,
        });

        const chunks: string[] = [];
        for await (const chunk of stream) {
          const c = chunk as { content?: string };
          if (c.content) {
            chunks.push(c.content);
          }
        }
        analysisContent = chunks.join('');

        await this.db
          .update(alertRecord)
          .set({ analysisContent })
          .where(eq(alertRecord.id, id));
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error ? err.message : JSON.stringify(err);
        this.logger.error(`Failed to generate analysis: ${errMsg}`);
      }
    }

    try {
      const notifyPlugin = this.capabilityService.load(
        'feishu_alert_notification_1',
      );
      const notifyUsers = parseTextArray(record.notifyUsers);
      await notifyPlugin.call('send_feishu_message', {
        alert_level: record.level,
        model_name: record.modelName ?? '',
        alert_details: `${record.metricType} = ${Number(record.currentValue)}, threshold = ${Number(record.threshold)}`,
        analysis_content: analysisContent,
        receiver_users:
          notifyUsers.length > 0 ? notifyUsers : undefined,
      });

      await this.db
        .update(alertRecord)
        .set({ notifyStatus: 'sent' })
        .where(eq(alertRecord.id, id));

      this.logger.log(`Notification resent for record: ${id}`);
      return { success: true };
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.error(`Failed to send notification: ${errMsg}`);

      await this.db
        .update(alertRecord)
        .set({ notifyStatus: 'failed' })
        .where(eq(alertRecord.id, id));

      return { success: false };
    }
  }
}
