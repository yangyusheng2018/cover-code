# 脑暴记录：cover-platform-baseline（追溯性）

> **类型**：追溯性规格捕获（retroactive baseline），非新功能开发。  
> OpenSpec × Superpowers 集成前，cover-code  monorepo 已具备完整 SDK + 管理端 + 示例能力。

## 背景

- 仓库由多个历史项目合并：`test-cover`（SDK + examples）、`cover-admin-front`、`cover-admin`（NestJS）。
- 核心链路已跑通：业务工程插桩 → 浏览器上报 → cover-admin 入库 → 管理端可视化与人工标记。
- 2026-06 引入 OpenSpec superpowers-bridge schema，需为**已有功能**补全规格与归档，使后续变更有 delta 基线。

## Q1：归档粒度 — 一个 change 还是多个？

**结论**：单一 change `cover-platform-baseline`，按 capability 拆 6 份 spec（monorepo / sdk / examples / auth / coverage / dashboard）。

**理由**：现有功能是同一产品的一体化基线；拆分多个 archive 会增加追溯成本且无独立发布边界。

**备选**：按 apps vs sdk 两个 archive — 拒绝，因上报契约跨 SDK 与 cover-admin-coverage。

## Q2：是否走完整 Superpowers apply 流程？

**结论**：否。本 change 仅补文档与主规格，**不**执行 worktree / TDD / subagent apply。

**理由**：代码已存在于 main；追溯归档的目标是「规格债务清偿」，不是重新实现。

## Q3：验收标准

**结论**：

1. `openspec/specs/` 下 6 个 capability 均有可 validate 的 Requirement + Scenario。
2. 归档目录含 proposal / design / tasks / verify / retrospective 全套产物。
3. `docs/API.md`、`docs/PROJECT.md` 与 spec 描述无重大矛盾。

## 设计取捨

- Spec 描述 **对外行为**（SHALL/MUST），不绑定具体类名，便于后续 MODIFIED delta。
- 增量覆盖、父 commit 继承、人工标记等复杂行为以 cover-admin-coverage spec 为权威，细节引用 API.md。
