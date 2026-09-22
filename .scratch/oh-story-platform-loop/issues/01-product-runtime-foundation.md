# 01 — 建立产品运行骨架

**What to build:** 产品前端和后端可以在 `dsh-story` 中独立启动，并具备最小共享契约、数据库连接、本地文件目录和健康检查能力，为后续真实闭环提供运行基础。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `apps/web` 可以独立启动并显示产品入口
- [ ] `apps/api` 可以独立启动并提供健康检查
- [ ] 前后端之间存在明确的产品 API 边界
- [ ] 数据库可以保存最小项目和运行元数据
- [ ] 本地文件目录可以保存原始输入和生成文件
- [ ] 首期不引入权限模型和对象存储
- [ ] Harness 不被复制进本仓库
