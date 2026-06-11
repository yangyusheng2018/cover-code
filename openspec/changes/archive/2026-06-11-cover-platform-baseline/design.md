## Context

cover-code 是围绕浏览器端 Istanbul 覆盖率的 monorepo：SDK 负责插桩与上报，cover-admin 负责接收/存储/分析，cover-admin-front 负责可视化与 RBAC 管理，examples 用于本地联调。各子系统已在生产使用前合并至同一 pnpm workspace（见 `docs/PROJECT.md`、`docs/模块关系说明.md`）。

本 design 描述**当前已实现**的架构，供追溯性 spec 与后续变更对齐。

## Goals / Non-Goals

**Goals:**

- 明确 monorepo 内模块边界与数据流
- 固定 SDK ↔ 管理端上报契约（headers、endpoint、project_code）
- 记录 cover-admin 覆盖率域核心算法边界（增量 diff、父 commit 继承、人工标记）
- 记录 RBAC 双轨（API permission + UI permission）与前端门禁模型

**Non-Goals:**

- 不包含 React/Vue 性能基准 harness（若后续需要，另开 change）
- 不重写或迁移历史 commit
- 不规定 CI/CD 与部署拓扑（由各环境自行配置 MySQL/Redis）

## Decisions

### D1：Monorepo 包边界

- **选择**：sdk / examples / apps 三分；SDK 发布为 npm `istanbul-live-*`，apps 私有。
- **理由**：SDK 需独立版本与 npm 发布（已有 `publish:sdk`）；管理端与 SDK 解耦部署。
- **已考虑 alternative**：多 repo — 拒绝，联调与 workspace 引用成本高。

### D2：上报协议

- **选择**：公开 `POST /api/coverage/upload`；必填 `X-Project-Code`、`X-Git-Branch`；推荐 `{ payload, meta }` 包裹体。
- **理由**：浏览器无法携带 JWT；项目+分支键匹配 branch_coverage 配置。
- **已考虑 alternative**：上报也走 JWT — 拒绝，增加业务工程接入复杂度。

### D3：持久化与缓存

- **选择**：MySQL 8 持久化业务数据；Redis 存 access 黑名单与「当前生效角色」。
- **理由**：Refresh token 存 MySQL；短期会话状态适合 Redis TTL。

### D4：覆盖率行级模型

- **选择**：`coverage_file.line_details` JSON 数组为权威；`covered_lines` 等派生字段便于聚合。
- **理由**：支持 inScope、instrument、carried、manual mark 等扩展字段。
- **已考虑 alternative**：仅 Istanbul 原始 s/f — 拒绝，无法满足增量与人工标记 UI。

### D5：前端权限

- **选择**：路由 `meta.useUiPathGate` + `canSeeRoutePath` 与 UI 树 path 对齐；按钮级用 ui permission code。
- **理由**：与种子 `ui_permission` 一致；侧栏可过滤 `showInMenu`。

## Risks / Trade-offs

- [Risk] API.md 与代码漂移 → Mitigation: `.cursor/rules/sync-api-docs.mdc` 强制同 PR 更新
- [Risk] 追溯 spec 与实现细微偏差 → Mitigation: verify 阶段抽样对照 API.md 与关键 service
- [Trade-off] 单 archive 体积大 → 接受：基线本为一体，后续变更按 capability 拆 delta

## Migration Plan

N/A — 本 change 为追溯性文档，不涉及部署。主规格已写入 `openspec/specs/`；归档目录保留 delta 副本供审计。

## Open Questions

- 是否在后续 change 中为 SDK 各包拆分独立 capability spec（当前合并为 `istanbul-live-sdk`）
- 性能基准 harness 是否纳入 monorepo（待产品确认）
