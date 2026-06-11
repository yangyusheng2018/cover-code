## Why

cover-code 在引入 OpenSpec × Superpowers 工作流之前，已具备完整的 Istanbul 覆盖率 SDK、NestJS 管理后端、Vue 管理前端与联调示例。缺少 formal spec 会导致后续 delta 变更无法追溯基线、apply/verify 无对照标准。现以追溯性 change 将已有能力写入 `openspec/specs/` 并归档，作为平台规格治理的起点。

## What Changes

**追溯性文档与规格（无代码行为变更）**

- 新增 6 个 capability 主规格：`monorepo-workspace`、`istanbul-live-sdk`、`coverage-demo-examples`、`cover-admin-auth`、`cover-admin-coverage`、`cover-admin-dashboard`。
- 新增归档 change `2026-06-11-cover-platform-baseline`，含全套 superpowers-bridge 规划产物。
- 不修改运行时代码、API 合约或数据库 schema。

## Capabilities

### New Capabilities

- `monorepo-workspace`: pnpm workspace 布局、根脚本与文档入口
- `istanbul-live-sdk`: istanbul-live-core / vite-plugin / webpack-plugin / instrument
- `coverage-demo-examples`: examples 演示工程与 coverage-server
- `cover-admin-auth`: JWT、用户、角色、接口/UI 权限 RBAC
- `cover-admin-coverage`: 上报、项目、分支覆盖率、报告、人工标记
- `cover-admin-dashboard`: Vue 管理端路由门禁与业务页面

### Modified Capabilities

（无 — 主规格均为首次建立）

## Impact

- **文档**：`openspec/specs/**`、`openspec/changes/archive/2026-06-11-cover-platform-baseline/**`
- **代码**：无
- **依赖**：需 OpenSpec CLI 校验规格格式（`openspec validate --all`）
- **系统**：为后续 `/opsx:propose` 变更提供 MODIFIED/ADDED delta 的对比基线
