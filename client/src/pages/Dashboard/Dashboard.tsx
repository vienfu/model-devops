import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Activity,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as dashboardApi from '@/api/dashboard';
import type {
  DashboardKpisResponse,
  DashboardTrendsResponse,
} from '@shared/api.interface';

const TIME_OPTIONS = [
  { value: '24h', label: '近24小时' },
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
];

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatAxisLabel(ts: string, timeRange: string): string {
  const d = new Date(ts);
  if (timeRange === '24h') {
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  }
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

function formatTooltipLabel(ts: string, timeRange: string): string {
  const d = new Date(ts);
  if (timeRange === '24h') {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:00`;
  }
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

interface CumulativeKpiCardProps {
  title: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}

const CumulativeKpiCard: React.FC<CumulativeKpiCardProps> = ({
  title,
  value,
  caption,
  icon,
}) => {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="font-mono text-3xl font-semibold leading-tight mb-1">
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{caption}</div>
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [kpis, setKpis] = useState<DashboardKpisResponse | null>(null);
  const [trends, setTrends] = useState<DashboardTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, trendData] = await Promise.all([
        dashboardApi.getKpis(timeRange),
        dashboardApi.getTrends(timeRange),
      ]);
      setKpis(kpiData);
      setTrends(trendData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '数据加载失败';
      setError(msg);
      logger.error('Dashboard data fetch failed', String(err));
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const trendChartBase = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0 },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        containLabel: true,
      },
    }),
    [],
  );

  const apiCallsOption: EChartsOption = useMemo(
    () => ({
      ...trendChartBase,
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p || typeof p !== 'object' || !('dataIndex' in p)) return '';
          const point = p as { dataIndex: number; value: number };
          const ts = trends?.apiCallsTrend[point.dataIndex]?.timestamp ?? '';
          return `${formatTooltipLabel(ts, timeRange)}<br/>API调用量: <b>${point.value.toLocaleString()}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data:
          trends?.apiCallsTrend.map((p) =>
            formatAxisLabel(p.timestamp, timeRange),
          ) ?? [],
        axisLabel: { fontSize: 11 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'API调用量',
          type: 'bar',
          data: trends?.apiCallsTrend.map((p) => p.value) ?? [],
          itemStyle: { color: '#2952cc', borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 32,
        },
      ],
    }),
    [trends, timeRange, trendChartBase],
  );

  const tokenOption: EChartsOption = useMemo(
    () => ({
      ...trendChartBase,
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const first = arr[0] as { dataIndex?: number } | undefined;
          const ts =
            first && typeof first.dataIndex === 'number'
              ? trends?.tokenConsumptionTrend[first.dataIndex]?.timestamp ?? ''
              : '';
          const header = formatTooltipLabel(ts, timeRange);
          const lines = arr
            .map((item: unknown) => {
              const it = item as {
                seriesName: string;
                value: number;
                color: string;
              };
              return `<span style="color:${it.color}">●</span> ${it.seriesName}: <b>${it.value.toLocaleString()}</b>`;
            })
            .join('<br/>');
          return `${header}<br/>${lines}`;
        },
      },
      xAxis: {
        type: 'category',
        data:
          trends?.tokenConsumptionTrend.map((p) =>
            formatAxisLabel(p.timestamp, timeRange),
          ) ?? [],
        axisLabel: { fontSize: 11 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '输入Token',
          type: 'bar',
          stack: 'token',
          data: trends?.tokenConsumptionTrend.map((p) => p.input) ?? [],
          itemStyle: { color: '#2952cc', borderRadius: [0, 0, 0, 0] },
          barMaxWidth: 32,
        },
        {
          name: '输出Token',
          type: 'bar',
          stack: 'token',
          data: trends?.tokenConsumptionTrend.map((p) => p.output) ?? [],
          itemStyle: { color: '#1a8a7a', borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 32,
        },
      ],
    }),
    [trends, timeRange, trendChartBase],
  );

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="size-3 mr-1" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border border-border">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="border border-border">
                <CardContent className="p-4">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        kpis &&
        trends && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <CumulativeKpiCard
                title="模型总数"
                value={String(kpis.totalModels)}
                caption="当前接入的模型数量"
                icon={<Layers className="size-4" />}
              />
              <CumulativeKpiCard
                title="累计API调用量"
                value={formatNumber(kpis.totalApiCalls)}
                caption="平台所有模型累计调用次数"
                icon={<Activity className="size-4" />}
              />
              <CumulativeKpiCard
                title="累计Token消耗"
                value={formatNumber(kpis.totalTokenConsumption)}
                caption="平台所有模型累计 Token 消耗"
                icon={<Zap className="size-4" />}
              />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                趋势分析
              </h3>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="min-w-[120px] w-auto rounded-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border border-border">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-sm font-medium">
                    API调用量趋势
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ReactECharts
                    option={apiCallsOption}
                    theme="ud"
                    className="h-[300px]"
                  />
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-sm font-medium">
                    Token消耗趋势
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ReactECharts
                    option={tokenOption}
                    theme="ud"
                    className="h-[300px]"
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
};

export default DashboardPage;
