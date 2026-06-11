# OpenSpec × Superpowers 命令速查

集成 schema：**superpowers-bridge**（OpenSpec 治理 + Superpowers 执行）

## 前置准备

1. 安装 OpenSpec CLI：`npm install -g @fission-ai/openspec@latest`
2. 在 Cursor Agent 安装 Superpowers：`/plugin-add superpowers`

## 规划阶段（OpenSpec）

| 命令 | 说明 |
|------|------|
| `/opsx:explore` | 探索模式：讨论与调研，不写实现代码 |
| `/opsx:propose` / `/opsx:new` | 创建 change（默认 `superpowers-bridge`） |
| `/opsx:continue` | 按依赖顺序生成下一个规划产物 |
| `/opsx:ff` | 快进：一次性生成全部规划产物 |
| `/opsx:sync` | 将变更中的 delta 规格合并到主规格 |

## 执行阶段（通过 apply 调用 Superpowers）

| 命令 | 说明 |
|------|------|
| `/opsx:apply` | 工作树隔离 + subagent TDD 实现 |
| `/opsx:verify` | 校验实现是否与 specs / tasks 一致 |
| `/opsx:archive` | 归档已完成的 change |
| `/clear-spec <名称>` | 清除未归档的 change（放弃规划，须确认，不可恢复） |

## 快速全流程

```
/opsx:ff my-feature
/opsx:apply
/opsx:verify
/opsx:continue    → retrospective（回顾）
/opsx:archive
```

## 简单场景

- 小修复：`/opsx:new fix --schema spec-driven`，或直接提 PR
- 已有 `spec-driven` change（如 `admin-dashboard-frontend`）：继续用 `/opsx:apply`，不受默认 schema 影响

## 分工说明

详见 [openSpec-superPower.md](./openSpec-superPower.md)（各步骤由 OpenSpec 还是 Superpowers 主导）。

## Cursor 规则

| 文件 | 说明 |
|------|------|
| `openSpec-superPower.md` | OpenSpec 与 Superpowers 步骤分工 |
| `.cursor/rules/chinese-documentation.mdc` | 文档与产物使用简体中文 |
| `.cursor/rules/openspec-superpowers-workflow.mdc` | 路由与阶段分工 |
| `.cursor/rules/openspec-superpowers-guardrails.mdc` | 反模式与 apply 约束 |

## Schema 位置

`openspec/schemas/superpowers-bridge/`（社区 schema，来源 [JiangWay/openspec-schemas](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge)）

## 主规格与归档

| 路径 | 说明 |
|------|------|
| `openspec/specs/` | 当前生效 capability 规格（6 项，见 [openSpec-superPower.md §已归档 change](./openSpec-superPower.md)） |
| `openspec/changes/archive/2026-06-11-cover-platform-baseline/` | 覆盖率平台追溯性基线归档（SDK + 管理端 + 示例） |
