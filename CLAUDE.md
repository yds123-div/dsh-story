# dsh-story

oh-story 插件的多包仓库：`oh-story-workspace` / `oh-story-roles` / `oh-story-skills`（DeepSFV snapshot 2026-09-11）、`ui-oh-story`（UI）、`bundle-oh-story`（打包）。

## 产品平台（apps/ + packages/）

pnpm workspace（Node ≥22）。产品基线见 `docs/specs/oh-story-product-platform-baseline.md`。

- `apps/web` — 产品前端（Vite + React 19 + TS），`pnpm dev:web`，默认 5173，经代理访问 API
- `apps/api` — 产品后端（Fastify + better-sqlite3 + 本地 `data/` 文件目录），`pnpm dev:api`，默认 3001，健康检查 `GET /health`
- `packages/product-contracts` — 前后端共享契约（TS 类型），前端只经产品 API 访问数据
- 运行数据（SQLite + 原始输入/生成文件）在 `apps/api/data/`，已 gitignore；首期不做权限模型和对象存储

## Agent skills

### Issue 跟踪

Issue 跟踪在 GitHub Issues（github.com/yds123-div/dsh-story），通过 `gh` CLI 管理。详见 `docs/agents/issue-tracker.md`。

### 领域文档

单一上下文（single-context）：仓库根目录一个 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。
