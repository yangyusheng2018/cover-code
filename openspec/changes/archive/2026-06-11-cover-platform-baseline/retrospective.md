# Retrospective: cover-platform-baseline

> Written: 2026-06-11（追溯性归档，非 apply cycle 结束后即时撰写）  
> Commit range: `980abae..5bca8a0`（SDK 提交至 OpenSpec 集成，约 30+ commits）  
> Worktree: N/A（无隔离 worktree，文档捕获于 main workspace）

---

## 0. Evidence

- **Commit range**: `980abae..5bca8a0`（平台功能演进 + 文档 + OpenSpec 脚手架）
- **Diff size**: 本 change 仅文档（+openspec/specs、+archive），无运行时代码 diff
- **Tasks done**: 10/10
- **Active hours**: 追溯捕获约 2h（估算）
- **Subagent dispatches**: 0（追溯性文档）
- **New external dependencies**: none（文档 change）
- **Bugs encountered post-merge**: none
- **OpenSpec validate state at archive**: pass（6/6）
- **Test coverage signal**: n/a（无代码变更）

Commit chain（代表性）：

```
980abae 提交插件
37fcf04 添加增量覆盖率
5abdaba 添加项目删除功能
2603ef4 添加打标记功能
d15520d 发布npm 包
a345924 md介绍文档
5bca8a0 添加tdd sdd开发范式
```

---

## 1. Wins

- [evidence: openspec/specs/] 六大 capability 首次建立可测试 Requirement/Scenario 基线
- [evidence: docs/API.md] 覆盖率域复杂行为（增量、父 commit、人工标记）在 spec 中有锚点
- [evidence: brainstorm.md Q1] 单一 baseline archive 降低后续 delta 对比成本

## 2. Misses

- 🟡 [painful | evidence: verify §1] OpenSpec CLI validate 未在 CI 中强制执行 — 规格格式错误可能延迟发现
- 📌 [nit | evidence: API.md §十一] 种子 menu path 与前端路由存在历史不一致，需在后续 change 统一或文档化

## 3. Plan deviations

| Plan task | What changed | Why |
|-----------|--------------|-----|
| apply / TDD | 整段跳过 | 追溯性归档，代码已存在 |
| subagent-driven-development | 未使用 | 同上 |

## 4. Skill / workflow compliance

| Skill | Used |
|-------|------|
| superpowers:brainstorming | ✓（简化口头捕获写入 brainstorm.md） |
| superpowers:writing-plans | ✓（plan.md 为捕获步骤） |
| superpowers:using-git-worktrees | ✗ |
| superpowers:subagent-driven-development | ✗ |
| (transitive) superpowers:test-driven-development | ✗ |
| (transitive) superpowers:requesting-code-review | ✗ |
| superpowers:finishing-a-development-branch | ✗ |

### Deliberately Skipped Skills

- **`superpowers:using-git-worktrees` 至 `finishing-a-development-branch`**
  - **What was skipped**: apply 阶段全部 Superpowers 执行技能
  - **Why this cycle**: 本 change 类型为 **retroactive baseline documentation**；实现已在 main 存在数月至 `5bca8a0` 前，无新代码需 TDD/worktree/PR
  - **How to prevent recurrence**: `scope-judgment rule` — 在 proposal 正文标明「追溯性 / retroactive」时，schema 允许跳过 apply；**新功能 change 仍 MUST 走完整 apply**

## 5. Surprises

- 原以为 git status 中已有 `react-vue-perf-benchmark` archive，磁盘上 `openspec/changes/archive/` 为空，需从零建立 baseline

## 6. Promote candidates → long-term learning

- [ ] 🟡 **追溯性 change 须在 proposal 标题/Why 首段标明 retroactive** → **Promote to** `.cursor/rules/openspec-superpowers-workflow.mdc`
  > **Why**: 避免对文档-only baseline 误跑 `/opsx:apply` 创建空 worktree
  > **How to apply**: `/opsx:propose` 或人工创建 change 时，若仅补 spec 无代码，在 Why 写「追溯性归档」并跳过 apply

- [ ] 📌 **CI 增加 openspec validate --all** → **Promote to** 后续 devops change
  > **Why**: 手工 spec 易格式漂移（Scenario 层级等）
  > **How to apply**: PR 检查 openspec/specs 变更时运行 validate
