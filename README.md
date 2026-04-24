# cover-code（pnpm monorepo）

- **总览与数据流（推荐先读）**：[**`docs/PROJECT.md`**](docs/PROJECT.md)
- **模块关系图与目录说明**：[**`docs/模块关系说明.md`**](docs/模块关系说明.md)
- **技术博客式入门（SDK + 管理端安装 + 项目与任务）**：[**`BLOG-覆盖率平台入门.md`**](BLOG-覆盖率平台入门.md)

本仓库将以下内容放在同一 **pnpm workspace** 中管理：

- **`sdk/`**：原 `E:\work\test-cover\packages` 下的 Istanbul 实时覆盖率相关包（`istanbul-live-*` npm 包名）
- **`examples/`**：原 `E:\work\test-cover\examples` 下的演示与 `coverage-server`
- **`apps/cover-admin-front/`**：原 `E:\work\cover-admin-front` 管理端（包名 `cover-admin-bi`）
- **`apps/cover-admin/`**：原 `E:\server\cover-admin` NestJS 后端（包名 `cover-admin-server`）

## 结构

- `sdk/core`（[**README**](sdk/core/README.md)）：`istanbul-live-core`，上报脚本与路径/Git 解析
- `sdk/vite-plugin`（[**README**](sdk/vite-plugin/README.md)）：`istanbulLiveVitePlugin`
- `sdk/webpack-plugin`（[**README**](sdk/webpack-plugin/README.md)）：`IstanbulLiveWebpackPlugin`
- `sdk/instrument`（[**README**](sdk/instrument/README.md)）：`istanbul-live-babel`，Babel 插桩辅助
- `examples/*`：Vite / Webpack 演示与覆盖率接收服务
- `apps/cover-admin-front`（[**README**](apps/cover-admin-front/README.md)）：Vue 3 管理前端（包名 `cover-admin-bi`）
- `apps/cover-admin`：NestJS 管理端 API（接口文档见 `apps/cover-admin/docs/API.md`）

## 使用

```bash
pnpm install
```

根目录脚本与原先 `test-cover` 一致，并增加管理端：

- `pnpm run dev:admin` / `pnpm run build:admin` / `pnpm run preview:admin`
- `pnpm run dev:server`（`nest start --watch`）、`pnpm run build:server`、`pnpm run start:server:prod`
- `pnpm run receiver`、`pnpm run dev:vite` 等同原 monorepo

环境变量（可选）：`COVERAGE_RECEIVER_PORT`、`COVERAGE_RECEIVER_HOST`。

插件与前端说明见各包目录 **`README.md`** 与 **`docs/PROJECT.md`**。
