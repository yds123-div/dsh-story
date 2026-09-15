# Issue 跟踪：GitHub

本仓库的 issue 和规格文档以 GitHub issue 形式存在。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论，同时获取标签。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需加 `--label` 和 `--state` 过滤。
- **评论**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

仓库从 `git remote -v` 推断 —— 在 clone 内运行时 `gh` 会自动识别。

## Pull request 作为分诊入口

**PR 作为请求入口：否。** _（如果本仓库将外部 PR 视为功能请求，改为 `yes`；`/triage` 会读取此开关。）_

设为 `yes` 时，PR 使用与 issue 相同的标签和状态，用 `gh pr` 系列命令：

- **读取 PR**：`gh pr view <number> --comments`，看 diff 用 `gh pr diff <number>`。
- **列出待分诊的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的（丢弃 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论 / 打标 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 和 PR 共用同一编号空间，所以单独一个 `#42` 可能是两者之一 —— 先用 `gh pr view 42` 判断，失败再退回 `gh issue view 42`。

## 当技能说"发布到 issue 跟踪"

创建一个 GitHub issue。

## 当技能说"获取相关 ticket"

运行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**地图（map）**是一个 issue，子任务（child issue）作为 ticket。

- **地图**：一个带 `wayfinder:map` 标签的 issue，正文包含 Notes / Decisions-so-far / Fog。`gh issue create --label wayfinder:map`。
- **子 ticket**：以 GitHub sub-issue 形式挂到地图下（对 sub-issues 端点调 `gh api`）。若未启用 sub-issues，则把子任务加进地图正文的任务列表，并在子任务正文顶部写 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。被认领后，ticket 分配给驱动的开发者。
- **阻塞关系**：用 GitHub **原生 issue 依赖** —— 权威且在 UI 可见。添加依赖边：`gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`，其中 `<blocker-db-id>` 是阻塞方的数字 **数据库 id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，_不是_ `#number` 也不是 `node_id`）。GitHub 会报告 `issue_dependencies_summary.blocked_by`（只含未关闭的阻塞方 —— 即实时门槛）。若依赖功能不可用，退回在子任务正文顶部写 `Blocked by: #<n>, #<n>`。所有阻塞方关闭后，ticket 即解除阻塞。
- **前沿查询（frontier query）**：列出地图下所有未关闭的子任务（`gh issue list --state open`，范围限定在地图的 sub-issues / 任务列表），剔除有未关闭阻塞方（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行中有未关闭 issue）或有 assignee 的；按地图顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me` —— 会话的第一次写操作。
- **解决**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，最后把上下文指针（gist + 链接）追加到地图的 Decisions-so-far。
