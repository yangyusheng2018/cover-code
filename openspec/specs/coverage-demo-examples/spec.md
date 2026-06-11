## Purpose

`examples/` 下用于联调 SDK 与本地覆盖率接收的演示工程。

## Requirements

### Requirement: 多构建工具演示工程

仓库 MUST 提供 Vite Vue3、Webpack Vue3、Webpack React TS 等最小可运行示例；各示例 MUST 通过 workspace 依赖 `istanbul-live-*` 包。

#### Scenario: 启动 Vite 演示

- **WHEN** 在根目录执行 `pnpm run dev:vite`
- **THEN** `examples/vite-vue3` 以开发模式启动并启用 Istanbul 插桩（由 vite.config 控制）

#### Scenario: 启动 Webpack React 演示

- **WHEN** 执行 `pnpm run dev:react`
- **THEN** `examples/webpack-react-ts` 启动且 html-webpack-plugin 与 IstanbulLiveWebpackPlugin 协同注入上报脚本

### Requirement: 简易覆盖率接收服务

`examples/coverage-server` MUST 提供可本地运行的简易 HTTP 接收端，用于在不启动 cover-admin 时验证 SDK 上报行为。

#### Scenario: 本地接收上报

- **WHEN** 示例工程将 `upload.endpoint` 指向 coverage-server 监听地址
- **THEN** 浏览器 POST 的 coverage payload 被接收服务记录或响应成功

### Requirement: 示例与正式后端可切换

各示例的配置 MUST 允许将 `upload.endpoint` 切换为 cover-admin 的 `/api/coverage/upload`，以便同一 demo 联调正式管理端。

#### Scenario: 联调 cover-admin

- **WHEN** 示例 `project_code` 与后台项目 `code` 一致，且已创建对应 `branch_coverage`
- **THEN** 上报数据写入 cover-admin 数据库而非仅 demo 接收服务
