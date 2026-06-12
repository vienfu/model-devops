import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Switch } from '@client/src/components/ui/switch';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  METRIC_TYPE_OPTIONS,
  OPERATOR_OPTIONS,
  LEVEL_OPTIONS,
} from '@shared/api.interface';
import type { AlertRuleItem } from '@shared/api.interface';
import * as alertsApi from '@client/src/api/alerts';
import { RuleFormDialog } from './RuleFormDialog';

function getMetricLabel(value: string): string {
  const option = METRIC_TYPE_OPTIONS.find(
    (o: (typeof METRIC_TYPE_OPTIONS)[number]) => o.value === value,
  );
  return option?.label ?? value;
}

function getOperatorLabel(value: string): string {
  const option = OPERATOR_OPTIONS.find(
    (o: (typeof OPERATOR_OPTIONS)[number]) => o.value === value,
  );
  return option?.label ?? value;
}

function getLevelBadge(level: string): React.ReactNode {
  const levelOption = LEVEL_OPTIONS.find(
    (o: (typeof LEVEL_OPTIONS)[number]) => o.value === level,
  );
  const label = levelOption?.label ?? level;

  if (level === 'critical') {
    return (
      <Badge className="bg-destructive text-destructive-foreground">
        <ShieldAlert className="size-3 mr-1" />
        {label}
      </Badge>
    );
  }
  if (level === 'warning') {
    return (
      <Badge className="bg-[#d4930d] text-white">
        <AlertTriangle className="size-3 mr-1" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge className="bg-[#2563eb] text-white">
      <Info className="size-3 mr-1" />
      {label}
    </Badge>
  );
}

const AlertRules: React.FC = () => {
  const [rules, setRules] = useState<AlertRuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<
    AlertRuleItem | undefined
  >(undefined);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await alertsApi.getRuleList();
      setRules(res.items);
    } catch (err: unknown) {
      logger.error('Failed to fetch rules', err);
      toast.error('获取预警规则失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = async (
    id: string,
    enabled: boolean,
  ): Promise<void> => {
    try {
      await alertsApi.toggleRule(id, enabled);
      setRules((prev: AlertRuleItem[]) =>
        prev.map((r: AlertRuleItem) =>
          r.id === id ? { ...r, enabled } : r,
        ),
      );
      toast.success(enabled ? '规则已启用' : '规则已禁用');
    } catch (err: unknown) {
      logger.error('Failed to toggle rule', err);
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await alertsApi.deleteRule(id);
      setRules((prev: AlertRuleItem[]) =>
        prev.filter((r: AlertRuleItem) => r.id !== id),
      );
      toast.success('规则已删除');
    } catch (err: unknown) {
      logger.error('Failed to delete rule', err);
      toast.error('删除失败');
    }
  };

  const handleEdit = (rule: AlertRuleItem): void => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleCreate = (): void => {
    setEditingRule(undefined);
    setDialogOpen(true);
  };

  const handleFormSuccess = (): void => {
    setDialogOpen(false);
    setEditingRule(undefined);
    fetchRules();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i: number) => (
          <div
            key={i}
            className="h-16 bg-muted animate-pulse rounded-sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate} className="gap-1.5">
          <Plus className="size-4" />
          新建规则
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无预警规则，请点击"新建规则"创建
        </div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1.2fr_0.8fr_1fr_0.6fr_0.8fr] gap-3 px-4 py-2.5 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div>规则名称</div>
            <div>监控指标</div>
            <div>阈值条件</div>
            <div>预警级别</div>
            <div>通知方式</div>
            <div>启用</div>
            <div>操作</div>
          </div>
          {rules.map((rule: AlertRuleItem) => (
            <div
              key={rule.id}
              className="grid grid-cols-[1fr_1fr_1.2fr_0.8fr_1fr_0.6fr_0.8fr] gap-3 px-4 py-3 border-t border-border items-center text-sm"
            >
              <div className="font-medium truncate" title={rule.name}>
                {rule.name}
              </div>
              <div className="text-muted-foreground">
                {getMetricLabel(rule.metricType)}
              </div>
              <div className="font-mono text-xs">
                {getOperatorLabel(rule.operator)}{' '}
                <span className="font-semibold">{rule.threshold}</span>
              </div>
              <div>{getLevelBadge(rule.level)}</div>
              <div className="flex flex-wrap gap-1">
                {rule.notifyType.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t === 'platform' ? '站内' : t === 'email' ? '邮件' : t}
                  </Badge>
                ))}
              </div>
              <div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked: boolean) =>
                    handleToggle(rule.id, checked)
                  }
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(rule)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(rule.id)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRule={editingRule}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export { AlertRules };
