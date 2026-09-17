# Spec：oh-story 监控与评估平台（v1）

- 状态：草案，待评审
- 日期：2026-09-15
- 来源：wayfinder 盘问会话（决策记录见文末）

## 1. 背景与动机

oh-story 套件（`oh-story-workspace` / `oh-story-roles` / `oh-story-skills` / `ui-oh-story` / `bundle-oh-story`）运行在 deepblue-harness（DSH）之上，故事生成由 agent 循环 + 7 个角色 subagent 驱动，付费媒体生成（图像/视频/音乐）经 adapter 子进程边界完成。当前状况：

- **文本 LLM 调用**（对话、压缩、起标题、角色 subagent）全部发生在 DSH harness 内，本仓库无任何调用点；
- **媒体生成**在 `short-drama-produce` 的 adapter 边界（`production_tool.py` `_run_adapter`），已有任务身份、确认流程、UTC 起止时间戳、结构化错误分类（`AdapterFailure`），但无耗时聚合、重试计数、成本字段；
- **全仓库零遥测**：无 token/成本核算、无调用面板、无聚合查询。

用户无法回答的基本问题——"一次生成花了多少钱？哪个阶段/角色最耗时？哪个模型错误率高？换个模型效果如何？"——当前都没有答案。本平台的目标就是让这些问题可回答。

## 2. 目标

落地**可用的 v1 平台**，做到：

1. **监控**：观察各阶段、角色、模型的——
   - 调用情况（次数、请求/响应内容）
   - 耗时（调用级延迟；含首 token / 解码速率等可推导指标）
   - 成本（按钱计价，平台自带价格表）
   - 错误（错误码、状态、provider request-id、重试次数与间隔）
2. **采集**：完整保存每次调用的输入/输出/上下文（为后续质量评估留数据底座）
3. **模型对比评估**：固定任务集的主动离线对比——同一批任务跑 N 个模型，出对比报表；覆盖**文本模型 + 图像模型**

## 3. 非目标（本期明确不做）

| 项 | 理由 |
|---|---|
| 质量评分 / LLM-judge / 人工评审流程 | 只采集不评判；评分维度等看过真实数据再定（后续努力） |
| 视频 / 音乐模型对比 | 单价贵，出现真实选型需求再进 |
| 采用 Opik / Langfuse 等现成平台 | 决策：自建独立平台 |
| 修改 harness（deepblue-harness）代码 | 平台只通过公开扩展面接入 |
| 修改 oh-story skill 脚本以自报阶段身份 | 与"平台独立、不侵入生成逻辑"冲突，明确排除 |
| 改动故事生成本身的任何行为 | 零侵入：只观察，不影响生成 |

## 4. 已敲定的决策

| # | 决策点 | 结论 |
|---|---|---|
| D1 | 目的地形态 | 落地可用的 v1（监控 + 完整采集；评估维度推迟） |
| D2 | 平台路线 | 自建，不采用 Opik |
| D3 | 质量评估 | 只采集不评判 |
| D4 | 模型对比方式 | 主动离线：固定任务集 + 对比报表（非被动 A/B） |
| D5 | 独立形态 | 独立 Cordis 插件包，住在 dsh-story 仓库（新包，与 oh-story 套件并列） |
| D6 | 对比范围 | 文本 + 图像模型 |
| D7 | 存储 | 平台自带独立 SQLite 文件、自建关系表；原始大文本（完整 prompt/response/图像）存文件、库里放引用 |
| D8 | 阶段归因 | 先验证自动推断（harness 事件里能否拿到当前激活 skill），不行则查询层做事后标注映射；角色归因已确认可自动 |
| D9 | 阶段归因的禁区 | 不改 skill 脚本强制自报（见非目标） |

## 5. 集成事实基础（可行性已验证）

以下为对 deepblue-harness 与 dsh-story 两仓库探索确认的事实，是本 spec 的约束前提：

### 5.1 文本侧观测出口（harness）

- **单一咽喉点**：所有文本 LLM 调用流经 `llm/stream` waterfall（`packages/llm/llm/src/index.ts:1097`），插件监听可拿到完整请求 + 逐 chunk 流，含 `sessionId` 与 `purpose`（对话/压缩/起标题可区分）。
- **usage 精细分桶**：input/output/cacheRead/cacheWrite/reasoning tokens，随 `assistant/message` 会话事件持久化；逐 chunk 带 `dt[]` 时间戳（首 token 延迟、解码速率可推导）。
- **错误与重试**：`LlmFailure`（code/status/providerRetryAfterMs/requestId）在 adapter 边界规范化；重试有完整会话事件（`llm/retry` / `llm/retry-started`）。
- **角色归因自动可得**：角色 subagent 是真正的子 Agent、走同一咽喉点；子会话头带 `origin: 'subagent'` / `parentSession`，`subagent/descriptor` 事件携带角色 label/persona（如 `narrative-writer`）。
- **金钱成本无人管**：全仓库无按钱计价——价格表为平台自带的核心资产。
- **采集基础设施**：`session-telemetry` 采集协调器（可实现 `SessionTelemetrySink`）、`session/event` 事件火线、`sessionProjections`（带持久化缓存的派生状态）均可复用。

### 5.2 媒体侧观测出口（本仓库）

- 全部付费媒体调用走 adapter 子进程边界（`production_tool.py` `_run_adapter`），已有任务身份、确认流程、时间戳、错误分类；图像侧现有 dashscope / openai 两个 adapter，对比出图质量/成本/耗时具备直接条件。
- 现有 JSON run 记录（`_write_run`）可作采集源或对齐参照。

### 5.3 扩展面（独立包的挂载方式）

- 一个包 = **host 半边**（Cordis `apply(ctx)`：订阅事件、写 SQLite、`ctx.webServer.register` 挂 `/xxx` 路由）+ **client 半边**（`dsh.client` 声明 + `shell.overlay` slot 注册整页面板 + 侧边栏入口）。
- 结构先例：harness `packages/experimental/inspector`（独立平台型插件的完整模板）、dsh-story 的 oh-story 套件（路由 + 客户端注入已验证）。
- 安装：`dsh plugin --profile <name> add <bundle>` 或 `--patch` 开发挂载；单进程模型，平台与 agent 循环同进程，无需 IPC。

## 6. 需求（验收口径）

### R1 调用记录
每次文本 LLM 调用与每次媒体生成调用，各落一条记录，至少含：时间、会话/任务标识、归因（角色；阶段按 D8）、模型与 provider、完整输入引用、完整输出引用、token 用量（文本）/张数与规格（媒体）。

### R2 耗时
调用级延迟可查；文本侧含首 token 延迟与解码速率（从 `dt[]` 推导）；可按 阶段/角色/模型/时间窗 聚合。

### R3 成本
平台维护价格表（模型 × 计价维度），结合 usage 计算每次调用金额；支持价格表版本化（改价后历史不重算）；聚合口径同 R2。

### R4 错误
错误码、HTTP 状态、provider request-id、重试次数与累计重试延迟全部入库；错误率可按归因维度聚合。

### R5 面板
在 DSH web 客户端内有平台自己的整页面板：概览（今日/本周调用、成本、错误率）、按维度下钻（阶段/角色/模型）、单次调用详情（含完整输入/输出查看）。

### R6 离线对比（文本 + 图像）
- 固定任务集（用户可维护的代表性任务列表）；
- 同一任务跑 N 个模型（文本：同一 prompt/上下文；图像：同一图片提示词）；
- 对比报表：成本、耗时、token 用量/规格、错误率并排；输出内容并排可查看（人工肉眼对比，不自动评分）。

### R7 零侵入约束
平台运行不得改变故事生成的行为与结果；不修改 harness 与 oh-story skill 脚本；采集失败不得导致生成失败（采集路径静默降级 + 自身错误自记录）。

## 7. 待验证项（进入实施前必须解决）

| # | 问题 | 验证方式 |
|---|---|---|
| V1 | 阶段（skill）归因能否自动：`llm/stream` / 会话事件里能否拿到当前激活 skill | 原型 ticket：实际订阅事件跑一次生成，看上下文字段 |
| V2 | 媒体侧采集点选 adapter 边界还是 production_tool run 记录（或两者对齐） | 原型 ticket |
| V3 | 固定任务集的形态：文本任务集从哪来（真实会话回放？精选 prompt？）；图像任务集如何定义 | grilling ticket，需看过 R1 采集的真实数据后再定 |
| V4 | 价格表初始数据源与维护方式 | research ticket |

## 8. 里程碑建议（供实施规划参考，非本期交付物）

1. **M1 埋点落库**：文本 + 媒体调用进 SQLite，面板能看原始记录（覆盖 R1–R4 的采集部分）
2. **M2 面板**：概览 + 下钻 + 详情（R5）
3. **M3 对比**：任务集 + 批量跑 + 报表（R6）

---

## 附：盘问决策记录（2026-09-15）

- Q1 目的地形态 → (b) 落地可用 v1
- Q2 平台路线 → 自建（用户明确不用 Opik，要"比较独立的平台"）
- Q3 质量评估 → (a) 只采集不评判
- Q4 模型对比 → (b) 主动离线固定任务集
- Q5 文本侧覆盖 → 经 harness 探索确认：`llm/stream` 咽喉点 + 会话事件即可全覆盖，无需动 harness
- Q6 独立形态 → (a) dsh-story 仓库内独立 Cordis 插件包
- Q7 存储 → (b) 自带 SQLite 关系表 + 文件存大文本
- Q8 对比范围 → (b) 文本 + 图像
- Q9 阶段归因 → 验证自动推断 + 查询层标注兜底，排除改 skill 脚本
