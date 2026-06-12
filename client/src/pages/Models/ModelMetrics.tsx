import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import type { ModelMetricsResponse } from '@shared/api.interface';

interface ModelMetricsProps {
  metrics: ModelMetricsResponse | null;
  loading: boolean;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  modelName: string;
}

// 复用 Dashboard 的图表配色（AGENTS.md §2.4 约定）
const CHART_COLORS = [
  'hsl(225, 65%, 45%)',
  'hsl(190, 60%, 45%)',
  'hsl(38, 85%, 50%)',
  'hsl(152, 60%, 40%)',
  'hsl(280, 50%, 50%)',
];
const SUCCESS_COLOR = 'hsl(152, 60%, 40%)';
const DESTRUCTIVE_COLOR = 'hsl(4, 75%, 52%)';

function formatAxisLabel(ts: string, timeRange: string): string {
  const d = new Date(ts);
  if (timeRange === '24h') {
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  }
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

function formatTooltipLabel(ts: string, timeRange: string): string {
  const d = new Date(ts);
  if (timeRange === '24h') {
    return `${d.getMonth() + 1}/${d.getDate()} ${d
      .getHours()
      .toString()
      .padStart(2, '0')}:00`;
  }
  return `${d.getFullYear()}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

function buildAxisTooltip<T extends { timestamp: string }>(
  trend: T[],
  timeRange: string,
  formatValue: (v: number, seriesName: string) => string,
) {
  return {
    trigger: 'axis' as const,
    axisPointer: { type: 'line' as const },
    formatter: (params: unknown) => {
      const arr = Array.isArray(params) ? params : [params];
      const first = arr[0] as { dataIndex?: number } | undefined;
      const ts =
        first && typeof first.dataIndex === 'number'
          ? trend[first.dataIndex]?.timestamp ?? ''
          : '';
      const header = ts ? formatTooltipLabel(ts, timeRange) : '';
      const lines = arr
        .map((item: unknown) => {
          const it = item as {
            seriesName: string;
            value: number;
            color: string;
          };
          const formatted =
            it.value == null || Number.isNaN(it.value)
              ? '-'
              : formatValue(it.value, it.seriesName);
          return `<span style="color:${it.color}">●</span> ${it.seriesName}: <b>${formatted}</b>`;
        })
        .join('<br/>');
      return header ? `${header}<br/>${lines}` : lines;
    },
  };
}

function createGaugeOption(value: number, name: string): EChartsOption {
  return {
    tooltip: { formatter: `${name}: {c}%` },
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        radius: '92%',
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.5, SUCCESS_COLOR],
              [0.8, 'hsl(38, 85%, 50%)'],
              [1, DESTRUCTIVE_COLOR],
            ],
          },
        },
        pointer: { width: 4 },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { length: 8, lineStyle: { width: 1 } },
        detail: {
          formatter: '{value}%',
          fontSize: 16,
          fontWeight: 600,
          offsetCenter: [0, '55%'],
          color: 'hsl(222, 30%, 12%)',
        },
        title: {
          offsetCenter: [0, '85%'],
          fontSize: 11,
          color: 'hsl(220, 10%, 50%)',
        },
        data: [{ value, name }],
      },
    ],
  };
}

const baseGrid = {
  containLabel: true,
  left: 8,
  right: 8,
  top: 32,
  bottom: 8,
};

const ModelMetrics: React.FC<ModelMetricsProps> = ({
  metrics,
  loading,
  timeRange,
  onTimeRangeChange,
  modelName,
}) => {
  // 首次加载（无任何数据）才用整页骨架；切换模型/时间维度时保留旧图，仅在标题栏显示 loading 角标，避免整页闪烁
  if (!metrics) {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40 rounded-sm" />
          <Skeleton className="h-9 w-[120px] rounded-sm" />
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Skeleton className="col-span-6 h-[260px] rounded-sm" />
          <Skeleton className="col-span-6 h-[260px] rounded-sm" />
          <Skeleton className="col-span-6 h-[260px] rounded-sm" />
          <Skeleton className="col-span-6 h-[260px] rounded-sm" />
        </div>
      </div>
    );
  }

  const callTrend = metrics.callQuality.trend;
  const latTrend = metrics.latencyMetrics.trend;
  const tokenTrend = metrics.tokenStatistics.dailyTrend.map((p) => ({
    timestamp: p.date,
    input: p.input,
    output: p.output,
  }));

  const callLabels = callTrend.map((p) => formatAxisLabel(p.timestamp, timeRange));
  const latLabels = latTrend.map((p) => formatAxisLabel(p.timestamp, timeRange));
  const tokenLabels = tokenTrend.map((p) =>
    formatAxisLabel(p.timestamp, timeRange),
  );

  const callTrendOption: EChartsOption = {
    tooltip: buildAxisTooltip(callTrend, timeRange, (v) => `${v}%`),
    legend: {
      data: ['成功率', '失败率'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 11 },
    },
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: callLabels,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', fontSize: 11 },
    },
    series: [
      {
        name: '成功率',
        type: 'line',
        data: callTrend.map((p) => p.successRate),
        smooth: true,
        showSymbol: false,
        color: SUCCESS_COLOR,
      },
      {
        name: '失败率',
        type: 'line',
        data: callTrend.map((p) => p.failureRate),
        smooth: true,
        showSymbol: false,
        color: DESTRUCTIVE_COLOR,
      },
    ],
  };

  const latencyMetricsConfig = [
    { key: 'e2e' as const, label: 'E2E', color: CHART_COLORS[0] },
    { key: 'ttft' as const, label: 'TTFT', color: CHART_COLORS[1] },
    { key: 'tpot' as const, label: 'TPOT', color: CHART_COLORS[2] },
    { key: 'itl' as const, label: 'ITL', color: CHART_COLORS[3] },
  ];

  // 4 个延时指标各自独立 1 张子图，避免量级悬殊（E2E ~8000ms vs ITL ~20ms）时小指标被压成贴底直线
  const buildLatencySubOption = (
    label: string,
    color: string,
    data: number[],
  ): EChartsOption => ({
    tooltip: buildAxisTooltip(latTrend, timeRange, (v) => `${v} ms`),
    grid: { ...baseGrid, top: 24 },
    xAxis: {
      type: 'category',
      data: latLabels,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}', fontSize: 10 },
    },
    series: [
      {
        name: label,
        type: 'line',
        data,
        smooth: true,
        showSymbol: false,
        color,
        areaStyle: { color: `${color}22` },
      },
    ],
  });

  const tokenBarOption: EChartsOption = {
    tooltip: buildAxisTooltip(tokenTrend, timeRange, (v) =>
      v.toLocaleString(),
    ),
    legend: {
      data: ['输入', '输出'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 11 },
    },
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: tokenLabels,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        name: '输入',
        type: 'bar',
        stack: 'token',
        data: tokenTrend.map((p) => p.input),
        color: CHART_COLORS[0],
      },
      {
        name: '输出',
        type: 'bar',
        stack: 'token',
        data: tokenTrend.map((p) => p.output),
        color: CHART_COLORS[1],
      },
    ],
  };

  const chartHeight = 220;

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{modelName}</h2>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-[120px] rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">近 24 小时</SelectItem>
            <SelectItem value="7d">近 7 天</SelectItem>
            <SelectItem value="30d">近 30 天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 顶部 KPI 概要：累计调用量 + 累计 Token 数 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="rounded-sm border border-border shadow-none">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">累计调用量</div>
            <div className="font-mono text-2xl font-semibold">
              {metrics.callQuality.totalCalls.toLocaleString()}
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                次
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm border border-border shadow-none">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">累计 Token 数</div>
            <div className="font-mono text-2xl font-semibold">
              {(
                metrics.tokenStatistics.totalInput +
                metrics.tokenStatistics.totalOutput
              ).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              输入 {metrics.tokenStatistics.totalInput.toLocaleString()} ·
              输出 {metrics.tokenStatistics.totalOutput.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPU 资源使用：当下实时资源消耗，与时间粒度无关 */}
      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm font-medium">GPU 资源使用</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <ReactECharts
              option={createGaugeOption(metrics.resourceUsage.gpu, '算力')}
              notMerge
              lazyUpdate
              style={{ height: 180 }}
            />
            <ReactECharts
              option={createGaugeOption(
                metrics.resourceUsage.gpuMemory,
                '显存',
              )}
              notMerge
              lazyUpdate
              style={{ height: 180 }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 趋势图：调用质量 + Token 消耗 + 延时 4 子图 */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="rounded-sm border border-border shadow-none">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-medium">调用质量趋势</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ReactECharts
              option={callTrendOption}
              notMerge
              lazyUpdate
              style={{ height: chartHeight }}
            />
          </CardContent>
        </Card>

        <Card className="rounded-sm border border-border shadow-none">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-medium">Token 消耗</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ReactECharts
              option={tokenBarOption}
              notMerge
              lazyUpdate
              style={{ height: chartHeight }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 延时指标拆分：4 个子图独立展示，避免量级悬殊导致小指标贴底 */}
      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm font-medium">延时指标趋势</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {latencyMetricsConfig.map((cfg) => (
              <div key={cfg.key} className="rounded-sm border border-border">
                <div className="px-3 pt-2">
                  <span className="text-xs text-muted-foreground">
                    {cfg.label}
                  </span>
                </div>
                <ReactECharts
                  option={buildLatencySubOption(
                    cfg.label,
                    cfg.color,
                    latTrend.map((p) => p[cfg.key]),
                  )}
                  notMerge
                  lazyUpdate
                  style={{ height: 160 }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelMetrics;
