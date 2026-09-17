# 原型验证结论（FINDINGS）

> 2026-09-16 · 对应 ../spec.md §9 的五项原型任务 · 全部通过

## 问题 → 答案

| # | 问题（spec §9） | 结论 |
|---|---|---|
| 1 | 本地 Docker Umami 能否起、/api/send 直报是否可用 | ✅ Umami v3.3.1 + postgres 16 跑通；curl 与真实浏览器直报均 200；事件属性（creator_id、业务字段）落库可查 |
| 2 | 插件订阅 harness 事件流能否拿到 token 五桶 | ✅ `llm/stream` 拿到每次调用 usage+provider/model/purpose；`session/event` 拿到 turn/step 归属；creator 用 `~/.dsh/.anonymous-user-id` |
| 3 | 采集数据与 harness 自身记录是否对账一致 | ✅ `verify.mjs` 对账：五桶合计 12498/2 完全一致；turn_end 一致 |
| 4 | C3 系统开销能否单列 | ✅ `session-title` 调用（130/5）只在 llm/stream 出现、会话日志不含——正好证明单列可行 |
| 5 | `webserver/index-inject` 能否注入官方 Umami 脚本（升级路径 C） | ✅ 注入成功：`<script defer src=".../script.js" data-website-id=...>` + `__OH_STORY_CREATOR_ID__` global；真实浏览器加载 harness UI 后 Umami 自动收到 pageview |

## 副产物发现

- **Umami v3 默认管理员**：迁移时自动种 `admin/umami`（users 表）——部署到服务器前必须改密码。
- **bot 检测**：`/api/send` 对 UA 含 HeadlessChrome 的请求静默返回 `{"beep":"boop"}` 并丢弃事件（`send/route.ts` isbot 检查）——自动化测试需伪装 UA；真实用户不受影响。
- **镜像拉取**：国内 mirror 对 `umamisoftware/umami` 全 403（只代理 library 仓库），Docker Hub 直连超时。解法：`umami/pull-ghcr.sh` 用 curl 走 ghcr.io OCI 协议逐 blob 下载 + `docker load`（Windows 下注意 Python 输出的 `\r` 要剥掉）。
- **插件装载**：包里需声明 `dsh.bundle.patch`（见 monitor-plugin/package.json + cordis.patch.yml），且要进 profile 的 `dsh.profile.bundles` 列表；同版本重装不生效，要升版本号。
- **会话日志读取**：`session.v2.jsonl.zstd` 是多帧 zstd 容器，Node 单次 `zstdDecompressSync` 只解第一帧——要用 harness 的 `scanZstdFrames` 逐帧解（verify.mjs 已示范）。
- **dsh web 旧实例占端口**：EADDRINUSE 时先 taskkill 旧 node 进程。

## 组件清单（都在本目录）

- `umami/docker-compose.yml` — 本地栈（127.0.0.1:3000，管理台 admin/umami）
- `umami/pull-ghcr.sh` — ghcr 镜像手动拉取脚本（国内网络备胎）
- `umami/track-test.html` — 双击即用的 track() 直报测试页（路径 A 的最小实现）
- `monitor-plugin/` — 原型插件源码 + 构建产物 + tgz（v0.0.2）
- `verify.mjs` — 对账脚本（monitor JSONL vs 会话日志多帧 zstd）

## 运行方式

```bash
# Umami
cd docs/prototypes/oh-story-monitoring-v1/umami && docker compose up -d

# 插件已装入 headless / web 两个 profile（~/.dsh/profiles/*/）
cd D:/Shenlan/ohstory-chain-test && MONITOR_PROTO_OUT=./monitor-proto \
  node --import "file:///D:/Shenlan/deepblue-harness/node_modules/tsx/dist/esm/index.mjs" \
  "D:/Shenlan/deepblue-harness/apps/cli/src/bin.ts" --profile headless "任务"

# web 模式（index-inject 生效；env 控制注入内容）
cd D:/Shenlan/deepblue-harness && UMAMI_SCRIPT_SRC=http://127.0.0.1:3000/script.js \
  UMAMI_WEBSITE_ID=<id> pnpm dsh web

# 对账
node --import "file:///D:/Shenlan/deepblue-harness/node_modules/tsx/dist/esm/index.mjs" \
  verify.mjs <sessionDir> <monitor-prototype.jsonl>
```

## 对 spec 开放点的裁决

1. **模块归属（spec §7）**：独立插件包（`oh-story-monitor` 原型即此形态）验证可行且零侵入——倾向定案为独立包。
2. **index-inject 升级路径（spec §4.2）**：**成立且好用**——建议 v1 直接采用"官方脚本（自动 PV/设备/来源）+ 客户端 track()（业务事件）"标准组合，即原决策 D2 从"路径 A 为主"升级为"路径 C"。
3. **身份对齐（D5）**：`__OH_STORY_CREATOR_ID__` global 注入验证通过，客户端 track() 的 creator_id 可直接读它，前后端同一 ID。

## 后续（进入正式实现时的注意）

- creator_id 事件属性、`purpose` 切分、五桶 schema 已验证，正式版照 spec §5–6 的表结构落 SQLite
- Umami v3 的 `/api/send` 还支持 `type: 'identify'`（身份事件）——v2 阶段做画像时可以用来把 session 和 creator 绑定
- 部署到 115.190.62.87 时：改 admin 密码、考虑 `DISABLE_BOT_CHECK` 不开（默认即可）
