# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 0. 应用概览

**应用名称**: 模型运营中心（Model Ops）
**定位**: 模型集群运营监控后台，面向运营工程师，数据源对接 Prometheus

### 技术架构
- 前端：React 19 + TypeScript + Tailwind + shadcn/ui + ECharts
- 后端：NestJS + Drizzle ORM + PostgreSQL
- 插件：AI 文本生成（运营报告/预警分析）+ 飞书消息通知

### 页面路由
| 页面 | 路径 | 说明 |
|------|------|------|
| 大盘总览 | `/` | KPI 指标卡 + 4 张趋势图，支持时间维度切换 |
| 模型指标明细 | `/models` | 左侧模型列表 + 右侧 5 分区指标详情 |
| AI 运营分析 | `/analysis` | 流式生成分析报告 + 历史报告列表 |
| 预警管理 | `/alerts` | Tab 双面板（规则 CRUD + 预警记录） |

### 服务端模块
| 模块 | 目录 | 职责 |
|------|------|------|
| Dashboard | `server/modules/dashboard/` | 大盘 KPI 和趋势数据 API |
| Models | `server/modules/models/` | 模型列表和指标明细 API |
| Analysis | `server/modules/analysis/` | 分析报告 CRUD API |
| Alerts | `server/modules/alerts/` | 预警规则 CRUD + 预警记录查询 + 通知重发 |

### 数据库表
| 表名 | 用途 |
|------|------|
| model | 模型基础信息 |
| metric_data | 指标时序数据 |
| analysis_report | AI 分析报告 |
| alert_rule | 预警规则配置 |
| alert_record | 预警记录 |

### 插件实例
| ID | 类型 | 调用侧 |
|----|------|--------|
| operation_analysis_report_generate_1 | ai-text-generate (stream) | Client |
| alert_content_analysis_1 | ai-text-generate (stream) | Server |
| feishu_alert_notification_1 | send-feishu-message (unary) | Server |

## 1. Design Archetype (设计原型)

### 1.1 内容理解（每项一句话，不展开）

- **目标用户**: 模型运营工程师，高频监控 Prometheus 指标并响应 AI 预警
- **核心目的**: 快速识别异常、辅助决策优化、建立数据信任感
- **情绪基调**: 冷静专注 / 避免焦虑与信息过载

### 1.2 设计方向（每项一行）

- **Design Style**: Grid 网格 — 高密度监控场景需结构化秩序感，sharp 圆角+等宽数字强化数据可读性
- **Application Type**: Admin/SaaS 后台 — 决定 Sidebar 持久导航与紧凑信息布局
- **Aesthetic Direction**: 精密仪器感：冷色基底+状态色精准点缀，图表即界面主体

## 2. Color System (色彩系统)

**色彩关系**: 深靛蓝主色 + 冷灰蓝底色 + 高对比深色文字
**配色设计理由**: 监控仪表盘需长时间注视不疲劳，冷色调降低视觉刺激，状态色仅在异常时跳脱
**主色推导**: Primary 取深靛蓝关联「技术可信度」，用于激活态与关键操作，收敛于导航高亮和生成报告按钮
**使用比例**: 70% 中性冷灰 / 20% 卡片白 / 10% Primary+语义色；Primary 仅用于 CTA 按钮、Tab 激活、侧边栏选中

### 2.1 主题颜色

| Token                | HSL 值              | 说明                                   |
| -------------------- | ------------------- | -------------------------------------- |
| `background`         | hsl(220 20% 97%)    | 冷灰蓝页面底色，减少长时间注视疲劳     |
| `card`               | hsl(0 0% 100%)      | 纯白卡片容器，与背景形成清晰层级       |
| `foreground`         | hsl(222 30% 12%)    | 深墨蓝主文字，比纯黑更护眼             |
| `muted-foreground`   | hsl(220 10% 50%)    | 次要说明文字，低饱和度                 |
| `primary`            | hsl(225 65% 45%)    | 深靛蓝主交互色，沉稳可信               |
| `primary-foreground` | hsl(0 0% 100%)      | Primary 上白色文字                     |
| `accent`             | hsl(225 40% 95%)    | 极浅靛蓝 hover/focus 反馈背景          |
| `accent-foreground`  | hsl(225 65% 35%)    | Accent 上的深色文字                    |
| `border`             | hsl(220 15% 90%)    | 低饱和边框，不干扰数据阅读             |

### 2.2 Sidebar 颜色

| Token                        | HSL 值              | 说明                           |
| ---------------------------- | ------------------- | ------------------------------ |
| `sidebar`                    | hsl(222 30% 14%)    | 深色侧边栏，与浅色内容区强区分 |
| `sidebar-foreground`         | hsl(220 15% 75%)    | 浅灰白文字，对比度 ≥ 4.5:1     |
| `sidebar-primary`            | hsl(225 65% 45%)    | 激活态背景，同 Primary         |
| `sidebar-primary-foreground` | hsl(0 0% 100%)      | 激活态白色文字                 |
| `sidebar-accent`             | hsl(222 25% 20%)    | Hover 态微亮背景               |
| `sidebar-accent-foreground`  | hsl(220 15% 90%)    | Hover 态文字                   |
| `sidebar-border`             | hsl(222 25% 20%)    | 右侧分隔线                     |
| `sidebar-ring`               | hsl(225 65% 55%)    | 聚焦环                         |

### 2.3 语义颜色

| 用途       | Token           | HSL 值              | 衍生逻辑                                     |
| ---------- | --------------- | ------------------- | -------------------------------------------- |
| 成功/正常  | `success`       | hsl(152 60% 40%)    | 绿相，中饱和；背景 hsl(152 50% 95%)          |
| 警告/关注  | `warning`       | hsl(38 85% 50%)     | 橙黄，限大字号或深色变体 hsl(38 80% 35%)     |
| 错误/紧急  | `destructive`   | hsl(4 75% 52%)      | 红相；背景 hsl(4 70% 96%)，左边框强调        |
| 提示/信息  | `info`          | hsl(210 70% 50%)    | 蓝相，用于非紧急预警级别                     |

### 2.4 图表配色序列

从 Primary 色相偏移生成，确保多系列区分且整体协调：
`hsl(225 65% 45%)` → `hsl(190 60% 45%)` → `hsl(38 85% 50%)` → `hsl(152 60% 40%)` → `hsl(280 50% 50%)`

## 3. Typography (字体排版)

- **Heading**: Inter, "Noto Sans SC", system-ui, sans-serif
- **Body**: Inter, "Noto Sans SC", system-ui, sans-serif
- **Mono/Data**: JetBrains Mono, "SF Mono", monospace — KPI 数值、图表 Tooltip、阈值等所有数字字段强制使用
- **字体策略**: Inter 提供优秀数字渲染；JetBrains Mono 确保表格/指标数字等宽对齐；中文回退 Noto Sans SC 保持重心一致

## 4. Layout Strategy (布局策略)

- **导航策略**: Sidebar — 4 个功能模块需持久可见，深色侧边栏与内容区明确分区
- **页面架构**: Sidebar + 右侧内容区，内容区 `max-w-[1400px]` 居中，防止超宽屏数据拉伸
- **响应式**: 移动端 Sidebar 折叠为抽屉，模型明细页列表/详情改为上下堆叠；桌面端双栏并列

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-sm (0.125rem)` · 阴影 `shadow-none`（卡片用 `border-border` 替代） · 间距基调 `compact`
- **识别签名**: KPI 数值 JetBrains Mono + `text-3xl font-semibold`；状态标签左侧 3px 色条；图表区域无装饰边框
- **装饰策略**: 不使用装饰图形；视觉层次通过色彩权重和间距节奏建立
- **动效原则**: 数据刷新 200ms ease-out；预警脉冲动画 `animate-pulse` 仅限紧急级别；AI 生成进度用骨架屏+呼吸光效
- **可及性**: 正文对比度 ≥ 4.5:1；仪表盘渐变带旁附文字标注；所有图标配 Tooltip

## 6. Component Principles (组件原则)

- **状态完整性**: Switch/Toggle 覆盖 on/off/hover/focus/disabled；KPI 卡片 loading 态用 Skeleton；图表空状态显示灰色占位线
- **层级清晰**: Primary Button 仅用于「生成分析报告」「新建规则」；表格操作列用 Ghost Button；预警级别 Badge 用语义色+左色条
- **一致性**: 所有时间选择器统一样式；图表 Tooltip 统一暗底白字+Mono 数字；Tab 激活态用底部 2px Primary 色条

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: AI 分析空状态引导插画（唯一图片需求）
- **Image Art Direction**: 线性单色插画风格，使用 Primary 色描边，构图简洁几何化，传达「AI 解析数据」意象，无填充色块
- **Image Prompt Keywords**: line art, minimalist, geometric, data visualization, AI brain, circuit pattern, single color outline, clean white background, technical illustration
- **Image Avoidance**: 避免 3D 渲染人物、通用机器人形象、多彩渐变、写实照片风格、复杂阴影

## 8. 应避免 (Anti-patterns)

- ❌ 大面积使用高饱和状态色作为背景（如红色填满整个预警卡片），应改用左色条+浅色底
- ❌ 图表添加多余装饰（3D 效果、渐变填充、粗边框），数据本身是视觉焦点
- ❌ AI 分析报告使用聊天气泡样式，应采用结构化文档排版（标题+段落+列表），强调专业可读性