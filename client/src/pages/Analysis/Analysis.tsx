import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Alert, AlertDescription } from '@client/src/components/ui/alert';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@client/src/components/ui/command';
import { Streamdown } from '@client/src/components/ui/streamdown';
import {
  BrainCircuit,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Check,
  X,
} from 'lucide-react';
import * as analysis from '@client/src/api/analysis';
import * as modelsApi from '@client/src/api/models';
import type {
  AnalysisReportListItem,
  AnalysisReportDetail,
  ModelListItem,
} from '@shared/api.interface';

const AnalysisPage: React.FC = () => {
  const [generating, setGenerating] = useState<boolean>(false);
  const [streamContent, setStreamContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [reports, setReports] = useState<AnalysisReportListItem[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<AnalysisReportDetail | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [scope, setScope] = useState<string>('all');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [modelList, setModelList] = useState<ModelListItem[]>([]);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [generated, setGenerated] = useState<boolean>(false);

  const loadReports = useCallback(async () => {
    try {
      const result = await analysis.getReportList(1, 20);
      setReports(result.items);
    } catch (err: unknown) {
      logger.error('Failed to load reports', err);
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const result = await modelsApi.getModelList();
      setModelList(result.items);
    } catch (err: unknown) {
      logger.error('Failed to load models', err);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadModels();
  }, [loadReports, loadModels]);

  const handleGenerate = async () => {
    setGenerating(true);
    setStreamContent('');
    setError('');
    setGenerated(false);
    setSelectedReport(null);

    const selectedModelNames = selectedModelIds
      .map((id: string) => modelList.find((m: ModelListItem) => m.id === id)?.name)
      .filter(Boolean)
      .join('、');
    const scopeLabel = scope === 'all' ? '全部模型' : `指定模型: ${selectedModelNames}`;
    const timeRangeMap: Record<string, string> = {
      '7d': '近7天',
      '30d': '近30天',
    };
    const timeLabel: string = timeRangeMap[timeRange] || '近7天';

    try {
      const stream = await capabilityClient
        .load('operation_analysis_report_generate_1')
        .callStream('textGenerate', {
          metricsData: JSON.stringify({
            scope: scopeLabel,
            timeRange: timeLabel,
          }),
          timeRange: timeLabel,
          modelScope: scopeLabel,
        });

      let fullContent = '';
      for await (const chunk of stream) {
        const chunkData = chunk as { content?: string };
        fullContent += chunkData.content || '';
        setStreamContent(fullContent);
      }

      setGenerated(true);
      setGenerating(false);

      const now = new Date().toISOString();
      try {
        await analysis.createReport({
          scope,
          modelIds: scope === 'selected' ? selectedModelIds : undefined,
          timeRange,
          startTime: now,
          endTime: now,
          content: fullContent,
          status: 'completed',
        });
        await loadReports();
      } catch (saveErr: unknown) {
        logger.error('Failed to save report', saveErr);
      }
    } catch (err: unknown) {
      logger.error('Failed to generate report', err);
      setError('生成分析报告失败，请稍后重试');
      setGenerating(false);
    }
  };

  const handleToggleReport = async (reportId: string) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      setSelectedReport(null);
      return;
    }

    try {
      const detail = await analysis.getReportDetail(reportId);
      setSelectedReport(detail);
      setExpandedReportId(reportId);
    } catch (err: unknown) {
      logger.error('Failed to load report detail', err);
    }
  };

  const toggleModel = (modelId: string) => {
    setSelectedModelIds((prev: string[]) =>
      prev.includes(modelId)
        ? prev.filter((id: string) => id !== modelId)
        : [...prev, modelId],
    );
  };

  const removeModel = (modelId: string) => {
    setSelectedModelIds((prev: string[]) => prev.filter((id: string) => id !== modelId));
  };

  const timeRangeLabel = (value: string): string => {
    const map: Record<string, string> = {
      '7d': '近7天',
      '30d': '近30天',
    };
    return map[value] || value;
  };

  const scopeLabel = (value: string): string => {
    return value === 'all' ? '全部模型' : '指定模型';
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-sm bg-card p-4">
        <h2 className="text-base font-semibold text-foreground mb-3">
          AI 运营分析
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={scope}
            onValueChange={(v: string) => {
              setScope(v);
              if (v === 'all') setSelectedModelIds([]);
            }}
          >
            <SelectTrigger className="min-w-[120px] w-auto rounded-sm">
              <SelectValue placeholder="分析范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模型</SelectItem>
              <SelectItem value="selected">指定模型</SelectItem>
            </SelectContent>
          </Select>

          {scope === 'selected' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-sm h-8">
                    选择模型
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索模型..." />
                    <CommandList>
                      <CommandEmpty>未找到模型</CommandEmpty>
                      <CommandGroup>
                        {modelList.map((m: ModelListItem) => (
                          <CommandItem
                            key={m.id}
                            value={m.name}
                            onSelect={() => toggleModel(m.id)}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedModelIds.includes(m.id) ? 'opacity-100' : 'opacity-0'}`}
                            />
                            <span className="text-sm">{m.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedModelIds.map((id: string) => {
                const m = modelList.find((item: ModelListItem) => item.id === id);
                if (!m) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1 rounded-sm">
                    {m.name}
                    <button
                      onClick={() => removeModel(id)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="min-w-[120px] w-auto rounded-sm">
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">近7天</SelectItem>
              <SelectItem value="30d">近30天</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-sm"
          >
            <BrainCircuit className="w-4 h-4 mr-1.5" />
            {generating ? '生成中...' : '生成分析报告'}
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-sm bg-card p-4 min-h-[200px]">
        {generating && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BrainCircuit className="w-4 h-4 animate-pulse" />
              <span>AI 正在分析中...</span>
            </div>
            {streamContent ? (
              <Streamdown>{streamContent}</Streamdown>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-4/5 rounded-sm" />
                <Skeleton className="h-4 w-3/5 rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
              </div>
            )}
          </div>
        )}

        {error && !generating && (
          <Alert variant="destructive" className="rounded-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                className="ml-3 rounded-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                重试
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {generated && !generating && !error && streamContent && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>分析报告已生成</span>
            </div>
            <Streamdown>{streamContent}</Streamdown>
          </div>
        )}

        {!generating && !error && !generated && !streamContent && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <BrainCircuit className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">
              点击生成，让AI帮你读懂模型数据
            </p>
          </div>
        )}
      </div>

      <div className="border border-border rounded-sm bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          历史报告
        </h3>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            暂无历史报告
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((report: AnalysisReportListItem) => (
              <div
                key={report.id}
                className="border border-border rounded-sm overflow-hidden"
              >
                <button
                  onClick={() => handleToggleReport(report.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(report.createdAt).toLocaleString('zh-CN')}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-accent rounded-sm text-accent-foreground whitespace-nowrap">
                      {scopeLabel(report.scope)}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-accent rounded-sm text-accent-foreground whitespace-nowrap">
                      {timeRangeLabel(report.timeRange)}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {report.summary || '无摘要'}
                    </span>
                  </div>
                  {expandedReportId === report.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {expandedReportId === report.id && selectedReport && (
                  <div className="border-t border-border p-3">
                    <Streamdown>{selectedReport.content}</Streamdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
