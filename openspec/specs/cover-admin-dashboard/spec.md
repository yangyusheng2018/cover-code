## Purpose

cover-admin-front Vue 3 管理端：登录、RBAC 门禁、项目与覆盖率管理界面。

## Requirements

### Requirement: 认证会话与路由守卫

前端 MUST 使用 Pinia auth store 管理 access token 与用户；未登录访问受保护路由 MUST 重定向至 `/login`；已登录访问 login MUST 重定向至首个可访问菜单页或 `/403`。

#### Scenario: 登录后落地

- **WHEN** 用户登录成功
- **THEN** `resolvePostLoginLanding` MUST 根据 `uiPermissionTree` 解析首个可访问 `path`；无权限时 MUST 进入 forbidden 页

#### Scenario: UI 路径门禁

- **WHEN** 已登录用户访问 `meta.useUiPathGate` 为 true 的路由
- **THEN** MUST 校验 `auth.canSeeRoutePath(to.path)`；无权限 MUST 跳转 `/403`

### Requirement: 权限管理页面

前端 MUST 提供用户管理、用户组、接口权限、菜单与按钮等视图，与 `apps/cover-admin/docs/API.md` 种子菜单 path 对齐。

#### Scenario: 侧栏菜单渲染

- **WHEN** 加载 `my-permissions` 返回 uiPermissionTree
- **THEN** 侧栏 MUST 展示 `showInMenu === true` 的 menu 节点；路由 path MUST 与库表 `ui_permission.path` 一致（如 `/report/project`）

### Requirement: 覆盖率业务页面

前端 MUST 提供项目管理、全量分支覆盖率、增量覆盖率管理页；详情 MUST 通过弹窗展示文件树、行级着色、人工标记与多 commit 报告切换。

#### Scenario: 全量覆盖率列表

- **WHEN** 用户访问 `/report/branch-coverage` 且有 `branch-coverage:list` 权限
- **THEN** 列表 MUST 仅展示 `taskScope=full` 的分支覆盖率任务

#### Scenario: 增量覆盖率列表

- **WHEN** 用户访问 `/report/incremental-coverage`
- **THEN** 列表 MUST 仅展示 `taskScope=incremental` 任务；详情 MUST 支持 incremental 视图与独立按钮权限码

### Requirement: API 基址配置

前端 MUST 通过 `VITE_API_BASE_URL` 指向 cover-admin 根地址；HTTP 客户端 MUST 对 refresh 等接口启用 `credentials: 'include'` 以携带 Cookie。

#### Scenario: 跨域 Cookie 刷新

- **WHEN** access token 过期且 refresh Cookie 有效
- **THEN** 前端 MUST 可调用 `/api/auth/refresh` 获取新 token 且无需用户重新登录

### Requirement: 与后端契约一致

前端 `src/api/` 模块 MUST 与 `docs/API.md` 路径、请求体字段保持一致；破坏性 API 变更 MUST 同步更新前端调用与类型。

#### Scenario: 覆盖率详情请求

- **WHEN** 打开分支覆盖率详情弹窗
- **THEN** 前端 MUST 调用 `coverage-report` 与可选 `source-file` 接口，并按返回 `lineDetails` 与 `visualizationHint` 渲染
