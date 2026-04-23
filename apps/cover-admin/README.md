# NestJS 后端应用（双 Token 登录）

基于 NestJS 的后端应用，支持 **Access Token + Refresh Token** 双 token 登录。

- **MySQL 8**：存储用户信息、refresh_token
- **Redis**：存储 access_token（支持登出即失效）

## 功能

- **注册** `POST /api/users/register`：用户名、密码、可选邮箱
- **登录** `POST /api/auth/login`：返回 `accessToken`、`refreshToken`、`expiresIn`、`user`
- **刷新** `POST /api/auth/refresh`：用 `refreshToken` 换取新的 access/refresh token
- **登出** `POST /api/auth/logout`：可传 `refreshToken` 和/或 `accessToken` 使对应 token 失效
- **当前用户** `GET /api/auth/profile`：需在 Header 中携带 `Authorization: Bearer <accessToken>`

## 快速开始

### 1. 数据库与 Redis

**MySQL 8**（账号 `nest_mysql` / 密码 `nest_mysql_pwd`）：

```bash
# 创建数据库后执行建表脚本
mysql -u nest_mysql -p cover_admin < database/schema.sql
```

或手动创建数据库后，在 MySQL 中执行 `database/schema.sql` 中的 SQL。

**Redis**（密码 `nest_redis_pwd`）：确保 Redis 已启动并配置了 requirepass。

### 2. 启动应用

```bash
# 安装依赖（需已安装 [pnpm](https://pnpm.io/installation)）
pnpm install

# 复制环境变量并按需修改
copy .env.example .env

# 开发模式
pnpm run start:dev

# 生产模式（须先编译出 dist）
pnpm run build
pnpm run start:prod
```

服务默认运行在 `http://localhost:3001`（见 `main.ts` / 环境变量 `PORT`），业务接口统一前缀为 `/api`。浏览器欢迎页 **`GET /home`**（HTML）无 `/api` 前缀，例如 `http://localhost:3001/home`。

若出现 **`Cannot find module '.../dist/main'`** 或找不到 **`dist/main.js`**：请在**项目根目录**执行 **`pnpm run build`** 后再启动；调试配置里的程序路径请指向 **`dist/main.js`**（需带 `.js` 扩展名）。

若在 **`pnpm install`** 时看到 **`[DEP0169] url.parse()`** 弃用提示：栈中一般为 `pnpm.cjs` / `toNerfDart`，来自 **pnpm（Corepack）内部**解析 registry 等时调用了 Node 的旧版 `url.parse`，**与本项目源码无关**，一般可忽略。若想去掉提示，可在执行 pnpm 前设置环境变量（Node 18+ 支持）：`NODE_OPTIONS=--disable-warning=DEP0169`；PowerShell 示例：`$env:NODE_OPTIONS='--disable-warning=DEP0169'`。需定位其它弃用来源时，可临时使用 `NODE_OPTIONS=--trace-deprecation`。

## 接口示例

### 注册

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test\",\"password\":\"123456\",\"email\":\"test@example.com\"}"
```

### 登录（双 Token）

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test\",\"password\":\"123456\"}"
```

响应示例：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m",
  "user": { "id": "...", "username": "test", "email": "test@example.com" }
}
```

### 刷新 Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"<上一步返回的 refreshToken>\"}"
```

### 获取当前用户（需 Access Token）

```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <accessToken>"
```

### 登出

可只传 `refreshToken`、只传 `accessToken`，或两个都传。

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"<refreshToken>\",\"accessToken\":\"<accessToken>\"}"
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_DATABASE | MySQL 连接 | localhost / 3306 / nest_mysql / nest_mysql_pwd / cover_admin |
| REDIS_HOST / REDIS_PORT / REDIS_PASSWORD | Redis 连接 | localhost / 6379 / nest_redis_pwd |
| JWT_ACCESS_SECRET / JWT_ACCESS_EXPIRES | Access Token | 见 .env.example |
| JWT_REFRESH_SECRET / JWT_REFRESH_EXPIRES | Refresh Token | 见 .env.example |

生产环境请务必修改 JWT 密钥及数据库、Redis 密码。

## 数据库结构（MySQL）

建表脚本：`database/schema.sql`；一键建库含种子数据：`docs/data.sql`（库名 **`cover_admin`**，与 `.env` 中 `DB_DATABASE` 一致）。

- **user**、**refresh_token**：登录与用户
- **role**、**user_role**、**api_permission**、**role_api_permission**、**ui_permission**、**role_ui_permission**：RBAC（角色即用户组）。种子含默认「用户角色」（`code=super_admin`），绑定全部接口与菜单权限；初始用户 `admin` 归属该角色。`super_admin` **无**代码层权限短路，与其它角色一样仅靠绑定表生效。
- **`ui_permission.show_in_menu`**：是否在侧栏菜单栏展示；已有库可执行 `database/patch-012-ui-permission-show-in-menu.sql`。

Access token 存于 **Redis**，key 前缀 `access_token:`，TTL 与 JWT 过期时间一致，登出时删除。

## 项目结构

```
src/
├── auth/           # 认证（登录、刷新、登出、双 token，Redis + MySQL）
├── users/          # 用户（注册、列表、删除）
├── permission/     # 权限（角色/用户组、接口权限、UI 权限树）
├── redis/          # Redis 服务（access_token 存取）
database/
└── schema.sql      # MySQL 建表与种子（与 docs/data.sql 对齐）
docs/
├── API.md          # HTTP 接口清单
└── data.sql        # CREATE DATABASE + 全量初始化
app.module.ts
main.ts
```
