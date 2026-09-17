# oh-story 监控采集层 v1 — Spec

> 状态：待用户评审
> 日期：2026-09-16
> 依据：《DeepSFV 剧本生成插件 · 用户行为监控与精准画像指标体系设计》v1.0（docs/ 下 HTML，下称"设计文档"）+ 本轮 wayfinder 盘问结论
> 相关契约：设计文档 §8.7 数据契约①–④、§9 oh-story v1 指标字典对齐

## 0. 一句话

以**插件形式**（不动 harness 源码）为 oh-story 落地监控采集层 v1：**Umami 承接流量与前端事件，自建事件表承接行为与 token 流水**，两者以统一 creator 身份对齐；画像、成本、看板留给 v2。

## 1. 目标与边界

**做**：
- T1 流量指标：PV/UV/DAU、来源、设备/浏览器（Umami 自动 + 客户端补发）
- T2 行为事件：技能/工具/媒体生产任务（服务端埋点，单一事实源）
- T4 token 采集：五桶 token、模型、耗时、成败、purpose 切分（订阅 harness 事件流）
- 主线全链路可观测：登录代理 → 会话 → 任务 → AI 调用 → 交付 → 完结

**不做**（Out of scope，含理由）：
- 登录安全（401 爆破、SSH 审计）——harness webserver 无请求事件、401 对插件不可见；**将来插件自建登录/用户管理上线后重新纳入**（届时插件自管路由上的失败可观测）
- T3 画像宽表、RFM、生命周期——v2，数据从本层事件表 + Umami 合成
- T4 成本/单价表（契约④）、告警引擎、Grafana 看板——v2
- 改 harness 源码——**硬约束**，一切采集经 cordis 事件/钩子订阅
- harness 内部行为监控——边界一致性：只看 oh-story 插件本身

## 2. 总体架构

```
┌─ 客户端（ui-oh-story，React）──────────────┐
│  track() 封装 ──POST──▶ Umami（本地 Docker）│   T1 + T2 前端
└──────────┬───────────────────────────┘
           │ 同一页面上的业务操作走服务端事件为准
┌─ 服务端（oh-story 插件，新 monitor 模块）─────────┐
│  订阅 session/event  ──▶ session/created（登录代理）  │
│                        assistant/message（turn 归属 + 五桶）│
│  订阅 llm/stream      ──▶ 逐调用五桶 + purpose（C3 切分）│
│  订阅 tools/*execute   ──▶ 行为事件（工具/媒体任务）     │
│  写入 behavior_event / ai_call_log（SQLite WAL）      │   T2 + T4
└──────────────────────────────────────────┘
           │
     身份对齐：creator_id（v1 = dsh-anonymous-user-id，Umami 事件同值）
```

两条平行线，职责分明：Umami 只看它看得见的（前端交互 + 流量），服务端事件表是行为的**唯一权威记录**。

## 3. 数据主线覆盖（六环）

| 环节 | 采集手段 | 层 |
|---|---|---|
| ① 登录（代理） | `session/created` + anonymous-user-id | 服务端 |
| ② 会话创建 | 客户端 track()（UI 视角）+ `session/created`（权威） | 双层 |
| ③ 任务创建 | `tools/*execute` 钩子 + workspace `track_job` | 服务端 |
| ④ 多轮 AI 调用 | `llm/stream`（逐调用+C3）+ `session/event`（turn 归属） | 服务端 |
| ⑤ story 交付 | 行为事件（技能级枚举） | 服务端 |
| ⑥ 任务完结/失败/取消 | `turn/end.reason` + 媒体 run 状态 | 服务端 |

## 4. Umami 层设计

### 4.1 部署
- **本地起步**：Docker Compose（umami + postgres），映射到 localhost 端口
- **后续迁移**：服务器 115.190.62.87（届时评估 Nginx 反代 + 是否启用官方脚本注入）

### 4.2 上报方式
- **v1 路径（原型已验证，采用标准组合 C）**：monitor 插件经 `webserver/index-inject` 注入官方 `<script defer src=".../script.js" data-website-id=...>` → PV/设备/来源自动采集；同时注入 `__OH_STORY_CREATOR_ID__` global 供业务事件用
- **业务事件**：ui-oh-story 内自封装 `track()`，直接 POST Umami `/api/send`（不依赖官方 script.js，页面壳无需任何改动）
- 原型验证记录见 FINDINGS.md #5（注入成功、真实浏览器自动采集已验证）

### 4.3 事件设计（首批）
| 事件 | 触发点 | 属性 |
|---|---|---|
| pageview | workbench 挂载 | — |
| session_created | New Session | creator_id |
| 媒体任务确认/提交 | prepare/confirm | creator_id, jobKind |
| 任务失败/取消 | 错误/取消交互 | creator_id, reason |
| （归并桶）浏览/资产编辑 | 低优先，用起来再补 | — |

所有事件带 `creator_id`（anonymous-user-id）属性，保证 Umami 数据与服务端表可按人对齐。

### 4.4 身份传递
服务端 monitor 模块持有 anonymous-user-id，经现有 `/oh-story/*` API 下发给客户端（或注入 ui 配置）。**注意**：creator_id 字段只存 ID 本身，不绑死身份来源——将来账号体系上线，加 `anonymous_id ↔ account_id` 映射层，历史数据不动。

## 5. 服务端行为事件表（契约①）

**表 `behavior_event`**：
```
id, creator_id, behavior(两级: 大类+具体行为), ts, result(success/fail/cancel),
failure_count, cancel_count, retry_count, meta(JSON: 题材/集数等参数)
```

**埋点位置**：
- `tools/pre|execute|post-execute` 瀑布——工具调用统一观测（JSDoc 明示供 metrics 用）
- workspace `oh_story_production` 的 `track_job`（jobKind: image/video/composition）→ 媒体生产行为
- 技能级行为（/story-*、/short-drama-* 枚举，见设计文档 §9.4-G）——**观测点是待验证项**：原型中确认技能调用是否必然产生可观测的 tool/call，或需在 UI 触发路径埋点

**行为枚举**：采用设计文档 §9.4-G 两级分类 + 归并桶，v1 先覆盖创作核心动作 + 失败/取消。

## 6. Token 采集（契约②）

**表 `ai_call_log`**：
```
request_id, creator_id, session_id, turn, step,
purpose(behavior|system),        # C3 系统开销单列不摊入
provider, model,
input_tokens, output_tokens,     # 五桶，互斥口径
cache_read_tokens, cache_write_tokens, reasoning_tokens,
latency_ms, status, error_code, ts
```

**采集机制**：
- `ctx.on('llm/stream', ...)` 瀑布：**每次**模型调用（含 compaction/起标题等辅助调用，purpose 区分），读 provider/model + usage chunk（`TokenUsage` 五桶结构现成）
- `ctx.on('session/event', ...)`：`assistant/message` 事件自带 `{turn, step, usage, message.source}` → turn 归属
- 成败：`turn/end.reason`（含 `LlmFailure{message, code, status, requestId}`）、`llm/retry`
- 耗时：事件时间差折叠（参考 harness `session-stats/src/projection.ts` 写法）

**历史回溯/重启恢复**：读已有 session JSONL（`session-persistence-jsonl`）或 `session-query-sqlite` 补算；JSONL 亦可作自建表核对源。

**媒体 runs（契约③，已有数据）**：`track_job` 产出的 run 记录补 `creator_id` 归因字段即可解锁 U4/C5。

## 7. 模块归属

新包 `oh-story-monitor`（对齐 workspace/roles/skills/ui/bundle 五包结构，随 bundle 组装）。**原型已验证独立插件包形态可行**（monitor-plugin 即此形态，含 `dsh.bundle.patch` 声明），正式版定为独立包。

## 8. 验收标准（v1）

1. 本地 Docker Umami 起来后，workbench 打开即见 pageview，creator_id 属性可查
2. 跑一次完整创作（建项→写作→媒体任务），`behavior_event` 落全链路事件，抽样与 session JSONL 核对一致
3. 任意一轮对话后，`ai_call_log` 五桶数据与 harness session-stats 投影对账一致；purpose=system 的行（compaction/标题）单列
4. 全程未改 harness 源码一行（diff 为证）

## 9. 原型范围（spec 评审通过后）

最小端到端切片，证明所有 seam：
1. Docker Compose：Umami + postgres 本地起
2. ui-oh-story：`track()` 封装 + pageview/session_created 两个事件
3. monitor 模块：订阅 `session/event` + `llm/stream` → 写 `ai_call_log`（SQLite 或先 JSONL）
4. 验证脚本：本地跑 harness → 触发对话 → 对账 token 总量 vs session-stats
5. （附带验证）`webserver/index-inject` 注入官方脚本的可行性初探

## 10. 决策记录（wayfinder 盘问沉淀）

| # | 决策 | 依据 |
|---|---|---|
| D1 | Umami 自托管（本地 Docker 起步→服务器） | 内部密级、数据不出网 |
| D2 | 注入路径：客户端直报（A）为主，index-inject 官方脚本为升级项 | 页面壳归 harness、不动其源码 |
| D3 | 指标子集：T1 流量+T2 事件/漏斗+T2 任务结果+T4 token；砍登录安全；画像/成本 v2 | Umami 能力边界 + 探查证实 |
| D4 | 行为事件服务端为主，Umami 只管前端可见行为 | 单一事实源 |
| D5 | Umami 事件带 anonymous-user-id 对齐身份 | 前后端数据可按人 join |
| D6 | 登录安全砍掉（401 插件不可观察）；将来账号体系上线重新纳入 | webserver 无请求事件 |
| D7 | creator_id 与身份来源解耦，映射层可替换 | 用户预告：将增加登录/用户管理 |
| D8 | token 只算本项目行为，harness 内部开销 C3 单列 | 设计文档 §9.2-B |
| D9 | 不建 GitHub wayfinder 地图，决策沉淀于本 spec | 本轮盘问已烧完全部雾 |
