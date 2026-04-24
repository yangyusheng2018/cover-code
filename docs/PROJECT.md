# cover-code 项目说明

本文档从整体介绍 **cover-code** monorepo 的目标、组成、数据流与常用命令。更细的模块关系见 **[模块关系说明.md](./模块关系说明.md)**。

## 项目定位

**cover-code** 是一套围绕 **Istanbul 浏览器端覆盖率** 的工具与产品组合：

1. **SDK（`sdk/`）**：在 **Vite** 或 **Webpack 5** 工程中开启插桩，并可选将 `window.__coverage__` **定时 POST** 到自定义接收端（demo 服务或正式后端）。
2. **管理端（`apps/`）**：**NestJS API** + **Vue 管理前端**，用于项目/分支配置、覆盖率上报接入、报告与增量对比、人工标记等（以仓库内实际功能为准）。
3. **示例（`examples/`）**：最小可运行 demo，用于联调 SDK 与本地接收服务。

## 仓库结构一览

| 路径 | 包名 / 说明 |
|------|-------------|
| `sdk/core` | **`istanbul-live-core`** — 上报脚本、仓库根与 Git 解析 |
| `sdk/vite-plugin` | **`istanbul-live-vite-plugin`** — Vite + vite-plugin-istanbul + 上报 |
| `sdk/webpack-plugin` | **`istanbul-live-webpack-plugin`** — Webpack 5 + 自定义 istanbul-loader + 上报 |
| `sdk/instrument` | **`istanbul-live-babel`** — Babel 单段插桩辅助（非必选） |
| `apps/cover-admin` | **`cover-admin-server`** — NestJS 后端 |
| `apps/cover-admin-front` | **`cover-admin-bi`** — Vue 3 管理前端 |
| `examples/*` | Vite / Webpack / coverage-server 等示例 |

包名以各目录下 **`package.json` 的 `name`** 为准；npm 上为 **无 scope** 的 `istanbul-live-*` 系列（见各包 README）。

## 数据流（概念）

```text
浏览器（插桩后的业务应用）
    │ 定时 POST __coverage__（JSON）
    ▼
cover-admin API 或 examples 中的 coverage 接收服务
    │ 持久化、合并、与 Git / 行映射等（以后端实现为准）
    ▼
管理前端查询、展示、增量 diff、人工标记等
```

SDK 只负责**产生覆盖率数据并上报**；存储与业务规则在服务端。

## 环境要求

- **Node**：建议 ≥ 18（各子包 `engines` 可能略有差异）。
- **包管理**：仓库指定 **pnpm**（见根目录 `packageManager`）。

## 常用命令（根目录）

安装依赖（会触发根 `postinstall`，若配置为 `build` 等需与根 `package.json` 一致）：

```bash
pnpm install
```

| 脚本 | 说明 |
|------|------|
| `pnpm run build:sdk` | 编译全部 `istanbul-live-*` 包 |
| `pnpm run dev:admin` | 启动管理前端（Vite） |
| `pnpm run build:admin` / `preview:admin` | 前端构建 / 预览 |
| `pnpm run dev:server` | Nest 后端开发（watch） |
| `pnpm run build:server` / `start:server` | 后端构建 / 启动 |
| `pnpm run dev:vite` / `dev:webpack` / `dev:react` | 各示例工程 |
| `pnpm run publish:sdk` | 构建后按依赖顺序发布 SDK（需 npm 登录与权限） |

具体脚本以根 **`package.json`** 为准。

## 文档索引

| 文档 | 内容 |
|------|------|
| [模块关系说明.md](./模块关系说明.md) | monorepo 目录职责、mermaid 总览 |
| [../README.md](../README.md) | 仓库入口简述与链接 |
| `sdk/core/README.md` | core API 与上报选项 |
| `sdk/vite-plugin/README.md` | Vite 插件配置与排错 |
| `sdk/webpack-plugin/README.md` | Webpack 插件配置与 source map |
| `sdk/instrument/README.md` | Babel 辅助插桩 |
| `apps/cover-admin-front/README.md` | 前端结构、路由、开发方式 |
| `apps/cover-admin/docs/API.md` | 后端 HTTP 接口与权限 |

## 开发与协作建议

- 修改 **跨前后端契约** 时，同步更新 **`apps/cover-admin/docs/API.md`** 与前端 `src/api/`。
- SDK 与示例同仓库时，可用 **pnpm `workspace:`** 引用；发 npm 时先 **`istanbul-live-core`**，再发插件包。
- 安全相关：上报 endpoint、Token 等勿提交到公开仓库；使用环境变量或 CI 密钥注入。

## 许可与归属

以仓库根目录 **LICENSE**（若存在）及公司内部规范为准；本文档仅描述技术结构。
