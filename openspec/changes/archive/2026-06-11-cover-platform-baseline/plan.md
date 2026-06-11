# Implementation Plan: cover-platform-baseline

> **追溯性 change**：无 apply 阶段代码实现。本 plan 记录规格捕获步骤，供审计对照。

## 执行说明

本 change **跳过** superpowers-bridge apply 子流程（git worktree、subagent-driven-development、TDD）。代码基线已存在于仓库 main 历史。

## 微步骤（文档捕获）

1. 阅读 `docs/PROJECT.md`、`docs/模块关系说明.md`、`BLOG-覆盖率平台入门.md` — 确认模块边界
2. 阅读 `sdk/*/README.md` — 提取 SDK 对外 MUST 行为
3. 阅读 `apps/cover-admin/docs/API.md` — 提取 auth / coverage / projects API 契约
4. 阅读 `apps/cover-admin-front/src/router/index.ts` — 提取路由与 UI 门禁
5. 为 6 个 capability 撰写 spec（Requirement + #### Scenario）
6. 运行 `openspec validate --all`（若 CLI 可用）
7. 撰写 verify / retrospective，归档

## TDD

N/A — 无新增实现代码。

## 文件清单

| Capability | 主规格路径 |
|------------|------------|
| monorepo-workspace | `openspec/specs/monorepo-workspace/spec.md` |
| istanbul-live-sdk | `openspec/specs/istanbul-live-sdk/spec.md` |
| coverage-demo-examples | `openspec/specs/coverage-demo-examples/spec.md` |
| cover-admin-auth | `openspec/specs/cover-admin-auth/spec.md` |
| cover-admin-coverage | `openspec/specs/cover-admin-coverage/spec.md` |
| cover-admin-dashboard | `openspec/specs/cover-admin-dashboard/spec.md` |
