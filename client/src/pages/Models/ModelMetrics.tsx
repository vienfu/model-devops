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
import type { ModelMetricsResponse } from '@shared/api.interface';

interface ModelMetricsProps {
  metrics: ModelMetricsResponse | null;
  loading: boolean;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  modelName: string;
}

const CHART_COLORS = [
  '#2952cc',
  '#1a8a7a',
  '#d4930d',
  '#2e9960',
  '#7733b3',
];

function createGaugeOption(
  value: number,
  name: string,
): EChartsOption {
  return {
    tooltip: {},
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [0.3, '#2e9960'],
              [0.7, '#d4930d'],
              [1, '#cc3333'],
            ],
          },
        },
        pointer: { width: 5 },
        axisTick: { show: false },
        splitLine: { length: 15, lineStyle: { width: 2 } },
        detail: {
          formatter: '{value}%',
          fontSize: 14,
          offsetCenter: [0, '70%'],
        },
        title: { offsetCenter: [0, '90%'], fontSize: 12 },
        data: [{ value, name }],
      },
    ],
  };
}

const ModelMetrics: React.FC<ModelMetricsProps> = ({
  metrics,
  loading,
  timeRange,
  onTimeRangeChange,
  modelName,
}) => {
  const formatTs = (ts: string): string =>
    timeRange === '24h'
      ? ts.slice(11, 16)
      : ts.slice(5, 10);

  if (loading || !metrics) {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40 rounded-sm" />
          <Skeleton className="h-9 w-[120px] rounded-sm" />
        </div>
        {Array.from({ length: 5 }).map((_, i: number) => (
          <Skeleton key={i} className="h-[340px] w-full rounded-sm" />
        ))}
      </div>
    );
  }

  const callLabels = metrics.callQuality.trend.map(
    (p) => formatTs(p.timestamp),
  );
  const successRates = metrics.callQuality.trend.map(
    (p) => p.successRate,
  );
  const failureRates = metrics.callQuality.trend.map(
    (p) => p.failureRate,
  );

  const pieOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        label: { show: false },
        emphasis: { label: { show: false } },
        data: [
          {
            value: metrics.callQuality.successRate,
            name: '成功',
            itemStyle: { color: '#2e9960' },
          },
          {
            value: metrics.callQuality.failureRate,
            name: '失败',
            itemStyle: { color: '#cc3333' },
          },
        ],
      },
    ],
  };

  const callTrendOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['成功率', '失败率'] },
    grid: {
      containLabel: true,
      left: 10,
      right: 10,
      top: 40,
      bottom: 10,
    },
    xAxis: { type: 'category', data: callLabels },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: '成功率',
        type: 'line',
        data: successRates,
        smooth: true,
        color: '#2952cc',
      },
      {
        name: '失败率',
        type: 'line',
        data: failureRates,
        smooth: true,
        color: '#cc3333',
      },
    ],
  };

  const latLabels = metrics.latencyMetrics.trend.map(
    (p) => formatTs(p.timestamp),
  );

  const latencyTrendOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['E2E', 'TTFT', 'TPOT', 'ITL'] },
    grid: {
      containLabel: true,
      left: 10,
      right: 10,
      top: 40,
      bottom: 10,
    },
    xAxis: { type: 'category', data: latLabels },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}ms' },
    },
    series: [
      {
        name: 'E2E',
        type: 'line',
        data: metrics.latencyMetrics.trend.map((p) => p.e2e),
        smooth: true,
        color: CHART_COLORS[0],
      },
      {
        name: 'TTFT',
        type: 'line',
        data: metrics.latencyMetrics.trend.map((p) => p.ttft),
        smooth: true,
        color: CHART_COLORS[1],
      },
      {
        name: 'TPOT',
        type: 'line',
        data: metrics.latencyMetrics.trend.map((p) => p.tpot),
        smooth: true,
        color: CHART_COLORS[2],
      },
      {
        name: 'ITL',
        type: 'line',
        data: metrics.latencyMetrics.trend.map((p) => p.itl),
        smooth: true,
        color: CHART_COLORS[3],
      },
    ],
  };

  const tokenLabels = metrics.tokenStatistics.dailyTrend.map(
    (p) => formatTs(p.date),
  );

  const tokenBarOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['输入', '输出'] },
    grid: {
      containLabel: true,
      left: 10,
      right: 10,
      top: 40,
      bottom: 10,
    },
    xAxis: { type: 'category', data: tokenLabels },
    yAxis: { type: 'value' },
    series: [
      {
        name: '输入',
        type: 'bar',
        stack: 'token',
        data: metrics.tokenStatistics.dailyTrend.map(
          (p) => p.input,
        ),
        color: CHART_COLORS[0],
      },
      {
        name: '输出',
        type: 'bar',
        stack: 'token',
        data: metrics.tokenStatistics.dailyTrend.map(
          (p) => p.output,
        ),
        color: CHART_COLORS[1],
      },
    ],
  };

  const tpLabels = metrics.throughput.trend.map(
    (p) => formatTs(p.timestamp),
  );

  const throughputOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['吞吐量'] },
    grid: {
      containLabel: true,
      left: 10,
      right: 10,
      top: 40,
      bottom: 10,
    },
    xAxis: { type: 'category', data: tpLabels },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} req/s' },
    },
    series: [
      {
        name: '吞吐量',
        type: 'line',
        data: metrics.throughput.trend.map((p) => p.value),
        smooth: true,
        color: CHART_COLORS[0],
        areaStyle: { color: 'rgba(41,82,204,0.1)' },
      },
    ],
  };

  const gauges = [
    { value: metrics.resourceUsage.cpu, name: 'CPU' },
    { value: metrics.resourceUsage.memory, name: 'Memory' },
    {
      value: metrics.resourceUsage.gpuMemory,
      name: '显存',
    },
    { value: metrics.resourceUsage.gpu, name: '算力' },
  ];

  const latencyItems = [
    { label: 'E2E', value: metrics.latencyMetrics.e2e },
    { label: 'TTFT', value: metrics.latencyMetrics.ttft },
    { label: 'TPOT', value: metrics.latencyMetrics.tpot },
    { label: 'ITL', value: metrics.latencyMetrics.itl },
  ];

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{modelName}</h2>
        <Select
          value={timeRange}
          onValueChange={onTimeRangeChange}
        >
          <SelectTrigger className="min-w-[120px] w-auto rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">近 24 小时</SelectItem>
            <SelectItem value="7d">近 7 天</SelectItem>
            <SelectItem value="30d">近 30 天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">
            调用质量
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="mb-2 font-mono text-3xl font-semibold">
            {metrics.callQuality.successRate}%
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              成功率
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <ReactECharts
                option={pieOption}
                theme="ud"
                style={{ height: '300px' }}
              />
            </div>
            <div className="col-span-2">
              <ReactECharts
                option={callTrendOption}
                theme="ud"
                style={{ height: '300px' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">
            延时指标
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="mb-3 grid grid-cols-4 gap-3">
            {latencyItems.map((item) => (
              <div
                key={item.label}
                className="rounded-sm border border-border p-3"
              >
                <div className="text-xs text-muted-foreground">
                  {item.label}
                </div>
                <div className="font-mono text-xl font-semibold">
                  {item.value}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    ms
                  </span>
                </div>
              </div>
            ))}
          </div>
          <ReactECharts
            option={latencyTrendOption}
            theme="ud"
            style={{ height: '300px' }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">
            Token 统计
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="mb-3 flex gap-6">
            <div>
              <div className="text-xs text-muted-foreground">
                输入总量
              </div>
              <div className="font-mono text-2xl font-semibold">
                {metrics.tokenStatistics.totalInput.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                输出总量
              </div>
              <div className="font-mono text-2xl font-semibold">
                {metrics.tokenStatistics.totalOutput.toLocaleString()}
              </div>
            </div>
          </div>
          <ReactECharts
            option={tokenBarOption}
            theme="ud"
            style={{ height: '300px' }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">
            吞吐表现
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="mb-3">
            <div className="text-xs text-muted-foreground">
              当前吞吐
            </div>
            <div className="font-mono text-2xl font-semibold">
              {metrics.throughput.current}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                req/s
              </span>
            </div>
          </div>
          <ReactECharts
            option={throughputOption}
            theme="ud"
            style={{ height: '300px' }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-sm border border-border shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">
            资源使用
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-4 gap-3">
            {gauges.map((g) => (
              <ReactECharts
                key={g.name}
                option={createGaugeOption(g.value, g.name)}
                theme="ud"
                style={{ height: '300px' }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelMetrics;
