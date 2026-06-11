## Purpose

cover-code 根目录 pnpm workspace 的组织方式与根级脚本约定。

## Requirements

### Requirement: Workspace 包布局

仓库 MUST 使用 pnpm workspace 将 SDK、示例、管理端前后端置于同一 monorepo；根 `package.json` MUST 声明 `packageManager` 为 pnpm，子包通过 `workspace:*` 或 filter 引用本地包。

#### Scenario: 开发者安装依赖

- **WHEN** 在仓库根目录执行 `pnpm install`
- **THEN** 全部 workspace 包依赖被安装，且根 `postinstall` 触发 SDK 构建（`build:sdk`）

#### Scenario: 按 filter 启动子应用

- **WHEN** 执行根脚本 `dev:admin`、`dev:server`、`dev:vite` 等
- **THEN** 对应子包（`cover-admin-bi`、`cover-admin-server`、`vite-vue3-demo` 等）以 pnpm filter 方式启动

### Requirement: 根级脚本入口

根 `package.json` MUST 提供 SDK 构建/发布、管理端开发/构建、示例工程开发等统一脚本；脚本名称与目标包 MUST 与 `docs/PROJECT.md` 索引一致。

#### Scenario: 构建全部 SDK

- **WHEN** 执行 `pnpm run build:sdk`
- **THEN** 所有 `istanbul-live-*` 包按依赖顺序完成 TypeScript 编译

#### Scenario: 联调管理端

- **WHEN** 分别执行 `pnpm run dev:server` 与 `pnpm run dev:admin`
- **THEN** NestJS API 与 Vue 管理前端可独立启动并经由配置的 API 基址通信

### Requirement: 文档入口

仓库 MUST 在根 `README.md` 链接 `docs/PROJECT.md`、`docs/模块关系说明.md` 与 `BLOG-覆盖率平台入门.md`，作为 monorepo 总览与接入指南。

#### Scenario: 新成员了解结构

- **WHEN** 阅读根 README 中的文档链接
- **THEN** 可获知 sdk、examples、apps 各目录职责及数据流概览
