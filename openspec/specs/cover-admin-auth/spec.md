## Purpose

cover-admin NestJS 后端的认证、用户管理与 RBAC（角色、接口权限、UI 权限）。

## Requirements

### Requirement: JWT 与 Refresh Token

系统 MUST 使用 JWT access token（Header `Authorization: Bearer`）保护除 `@Public` 外的 API；refresh token MUST 存 MySQL 并通过 HttpOnly Cookie `refresh_token` 下发；登录、刷新、登出接口 MUST 在 `docs/API.md` 有完整说明。

#### Scenario: 用户登录

- **WHEN** 客户端 `POST /api/auth/login` 提交有效 username/password
- **THEN** 响应含 `accessToken`、`expiresIn`、`user`；refresh token 写入 Cookie；Redis 中该用户「当前生效角色」被清除

#### Scenario: 刷新 access token

- **WHEN** 客户端 `POST /api/auth/refresh` 且 Cookie 含有效 refresh_token
- **THEN** 返回新 accessToken 并刷新 Cookie

### Requirement: 用户注册与自助改密

`POST /api/users/register` MUST 为公开接口，接受 username、password、可选 email；`POST /api/users/change-password` MUST 要求 JWT 且仅允许修改当前用户密码。

#### Scenario: 首个用户注册

- **WHEN** 无 JWT 调用 register 且 username 未占用
- **THEN** 用户入库（密码 bcrypt），返回不含密码的用户信息

### Requirement: 角色与双轨权限

系统 MUST 支持角色（用户组）CRUD、用户多角色绑定、角色与接口权限/UI 权限的整表替换绑定；接口权限 code MUST 与 `@RequireApiPermissions` 装饰器一致。

#### Scenario: 接口权限校验

- **WHEN** 已登录用户访问带 `@RequireApiPermissions('project:list')` 的接口
- **THEN** 用户 MUST 拥有该 code（按当前生效角色或全角色并集）；否则拒绝

#### Scenario: 切换当前生效角色

- **WHEN** 用户 `POST /api/auth/switch-role` 传入其拥有的 `roleId`
- **THEN** Redis 记录生效角色；后续 `my-permissions` 与接口校验仅按该角色计算；传 null 恢复多角色并集

### Requirement: UI 权限树

系统 MUST 维护 `ui_permission` 树（directory/menu/button）；`GET /api/ui-permissions/tree` 与 `GET /api/auth/my-permissions` 返回的 `uiPermissionTree` MUST 含 `path`、`code`、`showInMenu` 等字段供前端门禁。

#### Scenario: 菜单节点过滤

- **WHEN** 前端渲染侧栏且节点 `showInMenu` 为 false
- **THEN** 该节点 MUST 不出现在侧栏，但仍参与权限校验（如 button 类型）

### Requirement: API 文档同步

凡路由、鉴权、请求体变更 MUST 同步更新 `apps/cover-admin/docs/API.md`（见 `.cursor/rules/sync-api-docs.mdc`）。

#### Scenario: 新增受保护接口

- **WHEN** 开发者新增带 `@RequireApiPermissions` 的控制器方法
- **THEN** 同一变更 MUST 更新 API.md 对应章节与汇总表
