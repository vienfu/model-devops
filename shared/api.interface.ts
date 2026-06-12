export interface TimeRange {
  range: '24h' | '7d' | '30d' | 'custom';
  startTime?: string;
  endTime?: string;
}

export interface TrendPoint {
  timestamp: string;
  value: number;
}

export interface TokenTrendPoint {
  timestamp: string;
  input: number;
  output: number;
}

export interface ChangeRate {
  totalApiCalls: number;
  totalTokenConsumption: number;
  successRate: number;
  avgLatency: number;
}

export interface DashboardKpisResponse {
  totalModels: number;
  totalApiCalls: number;
  totalTokenConsumption: number;
  successRate: number;
  avgLatency: number;
  change: ChangeRate;
  sparklines: {
    apiCalls: number[];
    tokenConsumption: number[];
    successRate: number[];
    avgLatency: number[];
  };
}

export interface DashboardTrendsResponse {
  apiCallsTrend: TrendPoint[];
  tokenConsumptionTrend: TokenTrendPoint[];
  successRateTrend: TrendPoint[];
  avgLatencyTrend: TrendPoint[];
}

export interface ModelListItem {
  id: string;
  name: string;
  status: string;
  apiCalls: number;
  successRate: number;
  avgLatency: number;
  pods: string[];
}

export interface ModelListResponse {
  items: ModelListItem[];
}

export interface CallQualityMetrics {
  successRate: number;
  failureRate: number;
  totalCalls: number;
  trend: Array<{ timestamp: string; successRate: number; failureRate: number }>;
}

export interface LatencyMetrics {
  e2e: number;
  ttft: number;
  tpot: number;
  itl: number;
  trend: Array<{ timestamp: string; e2e: number; ttft: number; tpot: number; itl: number }>;
}

export interface TokenStatistics {
  totalInput: number;
  totalOutput: number;
  dailyTrend: Array<{ date: string; input: number; output: number }>;
}

export interface ResourceUsage {
  /** 显存使用率：used / allocated × 100 */
  memoryAllocatedPercent: number;
  /** 已使用显存（bytes） */
  memoryUsedBytes: number;
  /** 已分配显存（bytes） */
  memoryAllocatedBytes: number;
  /** 算力利用率（%，0-100），多卡取平均 */
  computePercent: number;
}

export interface ModelMetricsResponse {
  callQuality: CallQualityMetrics;
  latencyMetrics: LatencyMetrics;
  tokenStatistics: TokenStatistics;
  resourceUsage: ResourceUsage;
}

export interface CreateAnalysisReportRequest {
  scope: string;
  modelIds?: string[];
  timeRange: string;
  startTime: string;
  endTime: string;
  content: string;
  status: string;
}

export interface AnalysisReportListItem {
  id: string;
  scope: string;
  timeRange: string;
  createdAt: string;
  status: string;
  summary: string;
}

export interface AnalysisReportListResponse {
  items: AnalysisReportListItem[];
  total: number;
}

export interface AnalysisReportDetail {
  id: string;
  scope: string;
  modelIds?: string[];
  timeRange: string;
  startTime: string;
  endTime: string;
  content: string;
  createdAt: string;
}

export interface AlertRuleItem {
  id: string;
  name: string;
  modelId?: string;
  modelName?: string;
  metricType: string;
  operator: string;
  threshold: number;
  level: string;
  notifyType: string[];
  notifyUsers: string[];
  enabled: boolean;
  createdAt: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  modelId?: string;
  metricType: string;
  operator: string;
  threshold: number;
  level: string;
  notifyType: string[];
  notifyUsers: string[];
  enabled: boolean;
}

export interface UpdateAlertRuleRequest extends CreateAlertRuleRequest {}

export interface AlertRuleListResponse {
  items: AlertRuleItem[];
}

export interface AlertRecordItem {
  id: string;
  ruleId: string;
  ruleName: string;
  modelName?: string;
  metricType: string;
  currentValue: number;
  threshold: number;
  level: string;
  notifyStatus: string;
  triggerTime: string;
  analysisContent?: string;
}

export interface AlertRecordListResponse {
  items: AlertRecordItem[];
  total: number;
}

export const METRIC_TYPE_OPTIONS = [
  { value: 'success_rate', label: '成功率' },
  { value: 'avg_latency', label: '平均延时' },
  { value: 'e2e_latency', label: 'E2E延时' },
  { value: 'ttft', label: 'TTFT' },
  { value: 'tpot', label: 'TPOT' },
  { value: 'itl', label: 'ITL' },
  { value: 'token_input', label: '输入Token' },
  { value: 'token_output', label: '输出Token' },
  { value: 'throughput', label: '吞吐量' },
  { value: 'cpu_usage', label: 'CPU使用率' },
  { value: 'memory_usage', label: '内存使用率' },
  { value: 'gpu_usage', label: 'GPU使用率' },
  { value: 'gpu_memory_usage', label: '显存使用率' },
] as const;

export const OPERATOR_OPTIONS = [
  { value: 'gt', label: '大于' },
  { value: 'lt', label: '小于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lte', label: '小于等于' },
  { value: 'eq', label: '等于' },
] as const;

export const LEVEL_OPTIONS = [
  { value: 'critical', label: '紧急' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '提示' },
] as const;
