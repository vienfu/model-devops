// ---- plugin:operation_analysis_report_generate_1 ----
// ============================================================
// 插件 operation_analysis_report_generate_1 (运营分析报告生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface OperationAnalysisReportGenerateOneInput {
  /** 分析的时间范围，如近7天、近30天、2024年Q1等 */
  timeRange: string;
  /** 分析范围描述，如全部模型、指定模型名称等 */
  modelScope: string;
  /** 指标数据JSON对象，包含需要分析的各项运营指标数值 */
  metricsData: string;
}

/**
 * capabilityClient.load('operation_analysis_report_generate_1').call<OperationAnalysisReportGenerateOneOutput>('textGenerate', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { content, response } = result;
 */
export interface OperationAnalysisReportGenerateOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:operation_analysis_report_generate_1 ----

// ---- plugin:feishu_alert_notification_1 ----
// ============================================================
// 插件 feishu_alert_notification_1 (飞书预警通知) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuAlertNotificationOneInput {
  /** 触发预警的模型名称 */
  model_name: string;
  /** 预警详情内容 */
  alert_details: string;
  /** 预警分析内容 */
  analysis_content: string;
  /** 接收预警通知的用户ID列表 */
  receiver_users?: string[];
  /** 预警级别（如：严重、警告、提示） */
  alert_level: string;
}

/**
 * capabilityClient.load('feishu_alert_notification_1').call<FeishuAlertNotificationOneOutput>('send_feishu_message', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 */
export interface FeishuAlertNotificationOneOutput {
  /** [object Object] */
  success: boolean;
}
// ---- end:feishu_alert_notification_1 ----

// ---- plugin:alert_content_analysis_1 ----
// ============================================================
// 插件 alert_content_analysis_1 (预警内容分析) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AlertContentAnalysisOneInput {
  /** 异常指标信息，包含指标名称、当前值、阈值等描述 */
  metricInfo: string;
  /** 预警规则配置信息描述 */
  ruleInfo: string;
}

/**
 * capabilityClient.load('alert_content_analysis_1').call<AlertContentAnalysisOneOutput>('textGenerate', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { content, response } = result;
 */
export interface AlertContentAnalysisOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:alert_content_analysis_1 ----