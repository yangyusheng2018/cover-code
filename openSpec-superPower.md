# OpenSpec × Superpowers 分工说明

本仓库默认使用 **superpowers-bridge** schema，将 OpenSpec 与 Superpowers 衔接为一条可追溯的变更流程。

## 一句话分工

| 工具 | 职责 |
|------|------|
| **OpenSpec** | **做什么** — 变更管理、规格产物、校验、归档 |
| **Superpowers** | **怎么做** — 脑暴纪律、微任务计划、TDD 实现、代码审查、分支收尾 |

所有步骤均通过 OpenSpec 的 `/opsx:*` 命令**入口**触发；Superpowers 仅在 schema 指定的环节被**调用**。

---

## 完整流程对照

| 步骤 | 命令 / 产物 | 主要用谁 | 说明 |
|------|-------------|----------|------|
| 0. 探索（可选） | `/opsx:explore` | OpenSpec | 只讨论、调研，不写实现代码 |
| 1. 创建变更 | `/opsx:new` / `/opsx:propose` / `/opsx:ff` | OpenSpec | 创建 change 目录，管理 artifact 依赖 |
| 2. 脑暴 | `brainstorm.md` | 两者协作 | OpenSpec 管产物位置；调用 `superpowers:brainstorming` |
| 3. 提案 | `proposal.md` | OpenSpec | 从脑暴提炼 why / what / capabilities |
| 4. 设计 | `design.md` | OpenSpec | 将脑暴整理为结构化设计 |
| 5. 规格 | `specs/**/*.md` | OpenSpec | delta 规格（ADDED / MODIFIED 等） |
| 6. 任务清单 | `tasks.md` | OpenSpec | 粗粒度 checkbox 任务 |
| 7. 实现计划 | `plan.md` | 两者协作 | OpenSpec 管产物；调用 `superpowers:writing-plans` 拆微步骤 |
| 8. 写代码 | `/opsx:apply` | Superpowers | 见下方 apply 子步骤 |
| 9. 验证 | `/opsx:verify` → `verify.md` | OpenSpec | `openspec-verify-change` + `openspec validate` |
| 10. 回顾 | `retrospective.md` | OpenSpec | 按模板撰写证据型回顾（无 Superpowers skill） |
| 11. 归档 | `/opsx:archive` | OpenSpec | 同步 delta specs 并移入 archive |
| 12. 收尾 | apply 最后一步 | Superpowers | `finishing-a-development-branch`（开 PR / 合并等） |

### Artifact 依赖关系

```text
brainstorm ──┬──→ proposal ──→ specs ──┐
             │                         ├──→ tasks ──→ plan ──→ [apply] ──→ verify ──→ retrospective
             └──→ design ──────────────┘
```

---

## `/opsx:apply` 内部步骤

apply 阶段以 Superpowers 执行为主，OpenSpec 负责验证与归档：

```text
0. 技能预检（Pre-flight）
→ 1. using-git-worktrees              # 创建隔离工作树
→ 2. subagent-driven-development      # 按 plan.md 逐任务实现
      ↳ test-driven-development       # 自动：先写失败测试再写代码
      ↳ requesting-code-review        # 自动：每任务 + 最终代码审查
→ 3. openspec-verify-change           # 生成 verify.md（OpenSpec）
→ 4. retrospective.md                 # 撰写回顾（OpenSpec 模板）
→ 5. openspec archive                 # 同步规格并归档（OpenSpec CLI）
→ 6. finishing-a-development-branch   # 最后一步：开 PR
```

**顺序不可打乱**：回顾与归档须在开 PR 之前完成。

---

## 纯 OpenSpec 的步骤

- `/opsx:explore`
- 产物：`proposal.md`、`design.md`、`specs/`、`tasks.md`
- `/opsx:verify`、`retrospective.md`、`/opsx:archive`、`/opsx:sync`
- 变更脚手架、artifact 依赖图、`openspec validate`、规格同步

## 用到 Superpowers 的步骤

| Superpowers skill | 使用环节 |
|-------------------|----------|
| `brainstorming` | 生成 `brainstorm.md` |
| `writing-plans` | 生成 `plan.md` |
| `using-git-worktrees` | apply 第 1 步 |
| `subagent-driven-development` | apply 第 2 步（主执行器） |
| `test-driven-development` | apply 内自动触发 |
| `requesting-code-review` | apply 内自动触发 |
| `finishing-a-development-branch` | apply 最后一步 |

## 两者协作的步骤

- **脑暴**、**plan**：OpenSpec 规定产物路径与格式，Superpowers 提供执行方法
- **apply**：OpenSpec 的 `/opsx:apply` 作入口，内部按 schema 依次调用 Superpowers 与 OpenSpec verify/archive

---

## 输出路径（禁止泄漏）

集成后，Superpowers 默认输出路径**不得**使用：

| 内容 | 正确路径 | 禁止路径 |
|------|----------|----------|
| 脑暴结果 | `openspec/changes/<名称>/brainstorm.md` | `docs/superpowers/specs/` |
| 实现计划 | `openspec/changes/<名称>/plan.md` | `docs/superpowers/plans/` |

---

## 快速全流程

```
/opsx:ff <名称>
/opsx:apply
/opsx:verify
/opsx:continue    → retrospective
/opsx:archive
```

## 前置准备

1. 安装 OpenSpec CLI：`npm install -g @fission-ai/openspec@latest`
2. 在 Cursor Agent 安装 Superpowers：`/plugin-add superpowers`

---

## 例外：`spec-driven` change

进行中的 change 若创建时指定了 `spec-driven`（例如 `admin-dashboard-frontend`），则：

- **规划阶段**：全部为 OpenSpec（proposal → specs → design → tasks）
- **`/opsx:apply`**：按 `tasks.md` 逐项实现，**不强制** Superpowers 的 worktree / TDD / subagent 流程

新建 change 默认使用 `superpowers-bridge`（见 `openspec/config.yaml`）。简单修复可显式指定：

```bash
/opsx:new <名称> --schema spec-driven
```

或直接提 PR，不创建 change。

---

## 清除未归档需求：`/clear-spec`

用于**放弃**尚未归档的 change（规划作废、方向变更、误创建等）。与 `/opsx:archive` 不同：archive 是正常收尾；clear-spec 是删除规划目录，**不可恢复**。

```text
/clear-spec <change-名称>
```

| 项目 | 说明 |
|------|------|
| 适用 | `openspec/changes/<名称>/` 下**未归档**的 change |
| 不适用 | 已在 `openspec/changes/archive/` 中的 change |
| 删除范围 | 该 change 目录内全部规划产物（proposal、design、specs、tasks、plan 等） |
| 不删除 | `openspec/specs/` 主规格（除非曾手动 sync）；已提交的代码与 git 分支 |
| 执行前 | Agent 会列出内容并要求**用户确认** |

示例：

```text
/clear-spec admin-dashboard-frontend
```

清除后若需重新规划，使用 `/opsx:new <名称>` 或 `/opsx:propose`。

---

## 何时两个都不用

以下低风险变更**直接 PR**，不建 change：

- Bug 修复（不改变对外合约）
- 测试补写、Linter 调整、非破坏性依赖升级
- 错别字、文档更新、配置值微调

原则：**流程仪式应与变更风险成正比**。

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `openspec.md` | 命令速查 |
| `.cursor/commands/clear-spec.md` | `/clear-spec` 清除未归档 change |
| `openspec/config.yaml` | 默认 schema 与 AI 注入规则 |
| `.cursor/rules/openspec-superpowers-workflow.mdc` | 路由与阶段分工 |
| `.cursor/rules/openspec-superpowers-guardrails.mdc` | 反模式与 apply 约束 |
| `.cursor/rules/chinese-documentation.mdc` | 文档语言规范 |
| `openspec/schemas/superpowers-bridge/` | 集成 schema（来源 [JiangWay/openspec-schemas](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge)） |
