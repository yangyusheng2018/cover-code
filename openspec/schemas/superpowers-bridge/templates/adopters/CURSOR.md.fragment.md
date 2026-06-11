## 变更工作流（Cursor 启动先读）

本仓库采用 [`superpowers-bridge`](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge) 衔接 OpenSpec 与 Superpowers。集成细则以 bridge README 为准；以下为路由指引（已沉淀至 `.cursor/rules/openspec-superpowers-*.mdc` 与 `chinese-documentation.mdc`）。

### 入口分流

| 触发场景 | 正确做法 |
|----------|----------|
| 口头「设计讨论 / 脑暴」 | 先口头脑暴，不写 `docs/superpowers/specs/`；五条判准全满足后升级 `/opsx:propose` |
| `/opsx:new` / `/opsx:ff` / `/opsx:propose` | 按 schema 既定流程执行 |
| Bug 修复 / 错别字 / 配置微调 | 直接 PR，不建 change |
| 已在 change 中 | `/opsx:continue` 或 `/opsx:apply` / `/opsx:verify` / `/opsx:archive` |

### 何时不走 opsx（直接 PR）

| 情境 | 是否直接 PR |
|------|-------------|
| 新功能 / 架构变更 / 破坏性变更 | ❌ 否，走 opsx |
| Bug 修复 / 测试补写 / 错别字 / 文档 / 配置微调 | ✅ 是 |

### 文档语言

规划产物与项目说明默认使用**简体中文**；命令、路径、schema 名、skill 名保持英文。
