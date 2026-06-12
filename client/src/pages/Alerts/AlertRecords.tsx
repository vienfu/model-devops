import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@client/src/components/ui/select';
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  METRIC_TYPE_OPTIONS,
  LEVEL_OPTIONS,
} from '@shared/api.interface';
import type { AlertRecordItem } from '@shared/api.interface';
import * as alertsApi from '@client/src/api/alerts';

function getMetricLabel(value: string): string {
  const option = METRIC_TYPE_OPTIONS.find(
    (o: (typeof METRIC_TYPE_OPTIONS)[number]) => o.value === value,
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
      <Badge className="bg-destructive text-destructive-foreground animate-pulse">
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

function getNotifyStatusBadge(status: string): React.ReactNode {
  if (status === 'sent') {
    return (
      <Badge className="bg-[hsl(152_60%_40%)] text-white">
        已发送
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge className="bg-destructive text-destructive-foreground">
        发送失败
      </Badge>
    );
  }
  return <Badge variant="secondary">待发送</Badge>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const TIME_RANGE_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: '24h', label: '最近24小时' },
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
];

const AlertRecords: React.FC = () => {
  const [records, setRecords] = useState<AlertRecordItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [level, setLevel] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await alertsApi.getRecordList({
        timeRange: timeRange === 'all' ? undefined : timeRange,
        level: level === 'all' ? undefined : level,
      });
      setRecords(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch records', err);
      toast.error('获取预警记录失败');
    } finally {
      setLoading(false);
    }
  }, [timeRange, level]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleResend = async (id: string): Promise<void> => {
    try {
      setResendingId(id);
      const res = await alertsApi.resendNotification(id);
      if (res.success) {
        toast.success('通知已重新发送');
        fetchRecords();
      } else {
        toast.error('发送失败');
      }
    } catch (err: unknown) {
      logger.error('Failed to resend notification', err);
      toast.error('发送失败');
    } finally {
      setResendingId(null);
    }
  };

  const toggleExpand = (id: string): void => {
    setExpandedId((prev: string | null) => (prev === id ? null : id));
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
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="min-w-[120px] w-auto rounded-sm">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map(
              (o: (typeof TIME_RANGE_OPTIONS)[number]) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="min-w-[120px] w-auto rounded-sm">
            <SelectValue placeholder="预警级别" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部级别</SelectItem>
            {LEVEL_OPTIONS.map(
              (o: (typeof LEVEL_OPTIONS)[number]) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          共 {total} 条记录
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无预警记录
        </div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-3 px-4 py-2.5 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div>触发时间</div>
            <div>规则名称</div>
            <div>监控指标</div>
            <div>当前值 / 阈值</div>
            <div>预警级别</div>
            <div>通知状态</div>
            <div>操作</div>
          </div>

          {records.map((record: AlertRecordItem) => (
            <div key={record.id}>
              <div
                className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-3 px-4 py-3 border-t border-border items-center text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleExpand(record.id)}
              >
                <div className="font-mono text-xs text-muted-foreground">
                  {formatTime(record.triggerTime)}
                </div>
                <div className="truncate" title={record.ruleName}>
                  {record.ruleName}
                </div>
                <div className="text-muted-foreground">
                  {getMetricLabel(record.metricType)}
                </div>
                <div className="font-mono text-xs">
                  <span className="font-semibold text-foreground">
                    {record.currentValue}
                  </span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span>{record.threshold}</span>
                </div>
                <div>{getLevelBadge(record.level)}</div>
                <div>{getNotifyStatusBadge(record.notifyStatus)}</div>
                <div className="flex items-center gap-1">
                  {record.notifyStatus === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={resendingId === record.id}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleResend(record.id);
                      }}
                    >
                      <RefreshCw
                        className={`size-3.5 ${resendingId === record.id ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  )}
                  {record.analysisContent ? (
                    expandedId === record.id ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )
                  ) : null}
                </div>
              </div>

              {expandedId === record.id && record.analysisContent && (
                <div className="px-4 py-3 border-t border-border bg-accent/30">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    AI 分析
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {record.analysisContent}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { AlertRecords };
