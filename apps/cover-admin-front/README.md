# cover-admin-bi（cover-admin-front）

Vue 3 + Vite + TypeScript 实现的**覆盖率与管理后台前端**，与 NestJS 服务 **`cover-admin-server`**（目录 `apps/cover-admin`）通过 HTTP API 通信。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 构建 | Vite 6 |
| UI | Element Plus 2（中文 locale） |
| 状态 | Pinia |
| 路由 | Vue Router 4（History 模式） |
| HTTP | Axios（封装见 `src/api/`） |
| 样式 | SCSS |

## 本地开发

在**仓库根目录**（pnpm workspace）执行：

```bash
pnpm install
pnpm run dev:admin
```

默认由根脚本 `pnpm --filter cover-admin-bi dev` 启动 Vite 开发服务器；需配合后端 **`pnpm run dev:server`**（或已部署的 API 基地址）。

### 环境变量

在 `apps/cover-admin-front` 下可放置 `.env.development` 等（Vite 约定），常见项：

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | 后端 API 根路径（如 `http://127.0.0.1:3000`），见 `src/api/http.ts` 中 `import.meta.env` |

（若项目内另有 `import.meta.env` 引用，以源码为准。）

### 构建与预览

```bash
pnpm run build:admin
pnpm run preview:admin
```

`build` 脚本执行 `vue-tsc` 类型检查后再 `vite build`。

## 目录结构（摘要）

```
src/
  api/           # 按业务域拆分的请求与类型（如 branchCoverages、auth）
  components/    # 可复用组件（含 report 下覆盖率详情弹窗等）
  directives/    # 如 UI 权限指令 uiCode
  layouts/       # 主布局 MainLayout（侧栏 + 顶栏 + 路由视图）
  router/        # 路由表、登录后落地页解析
  stores/        # Pinia（auth 等）
  views/         # 页面级视图
    auth/        # 登录
    report/      # 项目、全量/增量分支覆盖率管理
    permission/  # 角色、接口权限、菜单与按钮
    users/       # 用户管理
    welcome/     # 欢迎页
```

## 路由与权限

- **路由定义**：`src/router/index.ts`。主要业务路径包括：
  - `/login`：登录
  - `/home`：欢迎
  - `/report/project`：项目管理
  - `/report/branch-coverage`：全量分支覆盖率
  - `/report/incremental-coverage`：增量覆盖率
  - `/system/user`、`/permission/roles`、`/system/api-permission`、`/system/ui-permission` 等系统与权限页
- **登录守卫**：`beforeEach` 中加载 session；未登录跳转登录页并带 `redirect`。
- **菜单 / 按钮权限**：`meta.useUiPathGate` 为真时，根据 `auth.effectiveUiTree` 与 `canSeeRoutePath` 判定是否可访问；无权限跳转 `/403`。

## 与后端的契约

- HTTP 路径、请求体与权限 code 以服务端 **`apps/cover-admin/docs/API.md`** 为准。
- 前端 `src/api/` 内模块与控制器资源一一对应；覆盖率相关类型与解析见 `branchCoverages.ts`、`coverage-report.ts` 等。

## 覆盖率相关 UI 能力（摘要）

- 分支覆盖率列表、详情弹窗（全量 / 增量视图）、行级源码与 Git 拉取、人工标记（冗余 / 兜底代码 / 插桩排除等）与文件树未覆盖提示等，逻辑集中在 `src/components/report/BranchCoverageDetailDialog.vue` 与对应 API 模块。

## Node 版本

`package.json` 声明 `engines.node >= 18`，建议使用与仓库一致的 pnpm（根 `packageManager` 字段）。
