# cover-code（pnpm monorepo）

各目录职责、上下游关系与数据流见 **[`docs/模块关系说明.md`](docs/模块关系说明.md)**。

本仓库将以下内容放在同一 **pnpm workspace** 中管理：

- **`sdk/`**：原 `E:\work\test-cover\packages` 下的 Istanbul 实时覆盖率相关包（`@istanbul-live/*`）
- **`examples/`**：原 `E:\work\test-cover\examples` 下的演示与 `coverage-server`
- **`apps/cover-admin-front/`**：原 `E:\work\cover-admin-front` 管理端（包名 `cover-admin-bi`）
- **`apps/cover-admin/`**：原 `E:\server\cover-admin` NestJS 后端（包名 `cover-admin-server`）

## 结构

- `sdk/core`：生成内联上报脚本 `buildCoverageUploadInlineScript`
- `sdk/vite-plugin`：`istanbulLiveVitePlugin`（`vite-plugin-istanbul` + 上报）
- `sdk/webpack-plugin`：`IstanbulLiveWebpackPlugin`（`webpack-plugin-istanbul` + 可选上报）
- `sdk/instrument`：Babel + `babel-plugin-istanbul` 辅助
- `examples/*`：Vite / Webpack 演示与覆盖率接收服务
- `apps/cover-admin-front`：Vue 3 + Vite 管理前端
- `apps/cover-admin`：NestJS 管理端 API

## 使用

```bash
pnpm install
```

根目录脚本与原先 `test-cover` 一致，并增加管理端：

- `pnpm run dev:admin` / `pnpm run build:admin` / `pnpm run preview:admin`
- `pnpm run dev:server`（`nest start --watch`）、`pnpm run build:server`、`pnpm run start:server:prod`
- `pnpm run receiver`、`pnpm run dev:vite` 等同原 monorepo

环境变量（可选）：`COVERAGE_RECEIVER_PORT`、`COVERAGE_RECEIVER_HOST`。

更详细的插件说明与常见问题见原 `test-cover` 的 README 内容；路径上已将 `packages/` 改为 `sdk/`。
