# 看板可视化原型 · 蓝图版（场记 · oh-story 监控看板）

> 2026-09-17 · throwaway 原型 · 回答的问题：**按设计文档，监控看板应该长什么样？**
> 经 grilling 对账（设计文档 §7/§8.5/§9.5 vs 初版三变体原型）后重写为蓝图版。
> 旧三变体版本存档于 `dashboard-variants-3.archived.html`。

## 用法

```bash
# 1. 确保 Umami 在跑（没有也能开，只是少 Umami 侧数据）
cd ../umami && docker compose up -d

# 2. 抓真实数据（monitor JSONL ×2 + Umami API）并内联生成 dashboard.html
node build-dashboard.mjs

# 3. 双击 dashboard.html 即可（ECharts 已本地化，离线可用）
```

## 结构（按设计文档组织）

**三个页签**（顶部切换，URL `?tab=`）：

| 页签 | 内容 |
|---|---|
| **总览** | L0 北极星（日活跃创作者 U3 / 单交付全链路成本 / Token 浪费率）→ L1 一级指标（活跃、任务成功率、留存、日总与人均 Tokens、高价值占比）→ **P1 看板 8 图**（§8.5 验收清单：DAU 曲线 / 创作漏斗 / 任务成功率 / Token 榜 / 成本榜 / 浪费率曲线 / 401 曲线 / 题材热度榜）→ Token 附加（五桶、缓存命中率、模型延迟）→ 流量与媒体（Umami、媒体生成量 C5、失败按错误码） |
| **画像** | 创作者排行脊柱 + 点击下钻：U2 五大类占比环图 + C1 集中行为 TopN（§9.5 画像视图）+ 每日消耗 / 模型分布 / Umami 事件按 creator 对齐 |
| **明细** | 状态计量行 + 自建/Umami 合并事件时间线（失败红标）+ 延迟曲线 + Turn 结局 |

**占位⇄模拟开关**：真实模式下，采集契约未建的指标显示占位卡（标注"待建 · 契约①/③/④"——占位卡即采集需求清单）；切「模拟数据」全部渲染成真图（带"演示"角标，确定性种子 20260917，含契约①③④形态预览）。401 曲线维持 D6 决策常驻占位（依赖将来自建登录）。

过滤行（数据源 / 时间范围 全部·近7天·今天）作用于全部图表；每图有「表格」a11y 视图；明暗主题右上角切换。

## 数据源

- **真实**：`D:\Shenlan\ohstory-chain-test\monitor-proto\monitor-prototype.jsonl` + `C:\Users\18307\.dsh\monitor-prototype\monitor-prototype.jsonl`（当前 8 条）+ Umami API（website `2d2df428…`，v3.3.1：无 `/timeseries`，用 `/pageviews?unit=day`）
- **模拟**：页面内置种子生成 14 天 × 6 创作者 + 任务/题材/行为五大类/演示单价，仅评估形态

## 浪费率口径（L0 北极星之一，文档"核心治理指标"）

llm_call 归属到同 session 内其后最近的 turn_end，失败 turn 的 token 合计 ÷ 总 token。按日曲线带 15% 告警线（markLine）。契约②落地后改为表内精确归属。

## 评审结论（2026-09-17 grilling 沉淀）

- 看板目标 = 设计文档 P1 8 图全蓝图（不止 v1 采集子集）
- 受众 = 团队指标分析；形态 = monitor 插件挂 `/oh-story/monitor` 路由（live + token 鉴权，满足 §8.6）
- 布局 = L0→L1→8 图层级叙事 + 页签（总览/画像/明细），变体机制退役
- 采集顺序 = 契约①行为事件 → ③媒体归因 → ④单价表，真数据逐个替换占位
- 401 维持 D6 砍掉（占位标注依赖自建登录）；RFM/生命周期/告警引擎留 v2

## 下一步

1. 团队评审蓝图形态（本文件双击即看）
2. monitor 插件挂 `/oh-story/monitor` 路由 serve 蓝图（live 数据替换 build 快照）
3. 契约① behavior_event 表 → 漏斗后三级、任务成功率、题材热度、画像 U2/C1 TopN 点亮
