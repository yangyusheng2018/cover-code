# 从插桩到看板：一套覆盖率采集与管理平台入门

> 本文面向希望**接入浏览器端 Istanbul 覆盖率**、并配合**统一管理后台**使用的开发 / 测试 / 平台同学，介绍本仓库 **cover-code** 的能力边界、SDK 用法、管理端安装，以及「项目」与「覆盖率任务」的配置顺序。

---

## 一、这套系统在解决什么问题

前端单测之外，很多团队还希望掌握**真实运行环境**下的语句 / 分支覆盖。常见路径是：

1. 在 **Vite** 或 **Webpack** 构建链路里打开 **Istanbul 插桩**，在浏览器里维护 `window.__coverage__`；
2. 由页面脚本**周期性 POST** 到服务端，与 **Git 分支、commit、项目标识** 绑定后落库；
3. 在**管理界面**里按项目 / 测试分支查看报告、对比增量、必要时做**人工标记**（冗余行、兜底代码、插桩排除等）。

**cover-code** monorepo 把上述链路拆成四块（关系详见 [`docs/模块关系说明.md`](docs/模块关系说明.md) 与 [`docs/PROJECT.md`](docs/PROJECT.md)）：

| 部分 | 职责 |
|------|------|
| **SDK（`sdk/`）** | 在业务工程里插桩 + 可选上报脚本 |
| **cover-admin 后端** | 接收覆盖率、鉴权、项目 / 任务 / 报告数据 |
| **cover-admin-front** | Vue 管理端：项目、全量 / 增量任务、详情弹窗等 |
| **examples** | 本地联调 demo、简易接收服务 |

---

## 二、SDK：在业务项目里接入

SDK 由多个 npm 包组成，业务侧通常只直接依赖**构建插件**之一；二者都依赖 **`istanbul-live-core`** 生成上报逻辑。

| 包名 | 场景 |
|------|------|
| `istanbul-live-vite-plugin` | Vite 5/6 + `vite-plugin-istanbul` |
| `istanbul-live-webpack-plugin` | Webpack 5 + 自定义 istanbul-loader |
| `istanbul-live-core` | 一般由插件间接依赖；自研上报时可单独用 |
| `istanbul-live-babel` | 非 Vite/Webpack 标准链时的 Babel 单段插桩辅助 |

### 2.1 与管理系统对齐的两个关键配置

1. **`project_code`（插件侧）**  
   必须与管理后台里该项目的 **`code`（项目编码）** 一致。服务端接收上报时，会用请求头 **`X-Project-Code`**（由 SDK 从 `project_code` 映射）去匹配 `branch_coverage` 等配置。

2. **`upload.endpoint`**  
   指向管理后端的 **`POST /api/coverage/upload`**（公开接口，无需 JWT）。端口以你部署的 `cover-admin` 为准（开发常见为 `3000` 或 `3001`，需与前端 `VITE_API_BASE_URL` 一致）。

若尚未在后台创建「项目 + 覆盖率任务」，上报可能返回业务失败（HTTP 仍为 200，体里 `success: false`），详见 [`apps/cover-admin/docs/API.md`](apps/cover-admin/docs/API.md) 中「覆盖率上报」章节。

### 2.2 Vite 最小思路

在 `vite.config` 里**展开**插件数组，并用环境变量控制是否开启覆盖率（示例见 `examples/vite-vue3/vite.config.js`）：

```ts
import { istanbulLiveVitePlugin } from 'istanbul-live-vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    ...istanbulLiveVitePlugin({
      coverage: true, // 或由 mode / loadEnv 计算
      project_code: '与你的项目 code 一致',
      upload: { endpoint: 'http://127.0.0.1:3000/api/coverage/upload' },
      // 其余 include/exclude 等与 vite-plugin-istanbul 一致
    }),
  ],
})
```

更细的参数、Vue 模板插桩、`optimizeDeps.exclude` 等见 [**`sdk/vite-plugin/README.md`**](sdk/vite-plugin/README.md)。

### 2.3 Webpack 最小思路

使用 `IstanbulLiveWebpackPlugin`，由 **`coverage: true`** 开启；需 **html-webpack-plugin** 才能注入上报脚本（示例见 `examples/webpack-react-ts/webpack.config.cjs`）：

```js
const { IstanbulLiveWebpackPlugin } = require('istanbul-live-webpack-plugin')

plugins: [
  new HtmlWebpackPlugin({ template: 'index.html' }),
  new IstanbulLiveWebpackPlugin({
    project_code: '与你的项目 code 一致',
    coverage: true,
    upload: { endpoint: 'http://127.0.0.1:3000/api/coverage/upload' },
  }),
]
```

Source Map、源码目录不在 `src` 时的 **`instrumentRoots`** 等见 [**`sdk/webpack-plugin/README.md`**](sdk/webpack-plugin/README.md)。

---

## 三、安装与运行管理系统

管理系统 = **NestJS 后端**（`apps/cover-admin`）+ **Vue 前端**（`apps/cover-admin-front`）。推荐在**仓库根目录**用 pnpm workspace 一条链路启动。

### 3.1 依赖服务：MySQL 与 Redis

后端使用 **MySQL 8** 持久化、**Redis** 管理登录态（Access / Refresh Token）。在 `apps/cover-admin` 目录：

1. 创建数据库（名称与账号以你环境为准，README 中有示例账号说明）。
2. 执行建表脚本：

```bash
mysql -u <user> -p <db_name> < apps/cover-admin/database/schema.sql
```

3. 启动 Redis（若配置了 `requirepass`，需与 `.env` 一致）。

### 3.2 后端环境变量与启动

```bash
cd apps/cover-admin
copy .env.example .env   # Windows；Linux/macOS 用 cp
# 编辑 .env：数据库、Redis、PORT 等
pnpm install
pnpm run start:dev
```

默认监听端口以 **`.env` / `main.ts`** 为准（文档中常见示例为 `3001`，亦有 `3000`，以你本机为准）。

### 3.3 前端环境变量与启动

在仓库根目录：

```bash
pnpm install
```

在 **`apps/cover-admin-front`** 配置 `VITE_API_BASE_URL` 指向后端根（如 `http://127.0.0.1:3001`），与后端 `PORT` 一致。

```bash
pnpm run dev:admin
```

浏览器访问 Vite 提示的本地地址，使用 **`POST /api/users/register`** 注册的首个账号登录；菜单与按钮受 **RBAC / UI 权限** 控制，若看不到「项目管理」等菜单，需在后台为角色分配对应接口与菜单权限（详见 `apps/cover-admin/docs/API.md` 权限表）。

生产构建：

```bash
pnpm run build:server
pnpm run build:admin
```

---

## 四、如何添加「项目」

项目是 Git 仓库维度的元数据：**名称、唯一 code、仓库地址、主分支、相对目录、可选 Token** 等。后续 SDK 的 `project_code`、上报路由匹配，都依赖这里的 **`code`**。

### 4.1 在界面中操作

1. 登录管理端。
2. 打开 **「项目管理」**（路由一般为 `/report/project`）。
3. 点击 **新建**，填写表单：
   - **项目名称**、**项目 code**（全局唯一，建议与仓库或业务线约定一致）；
   - **Git URL**、**主分支**（如 `main` / `master`）；
   - **相对路径**：覆盖率路径相对仓库根的路径（与上报文件路径对齐，增量对比等逻辑会用到）；
   - **仓库 Token**（私有仓库拉 raw / 对比时可能需要；编辑时留空通常表示不修改已存 Token）。
4. 保存后，项目会出现在列表与后续「覆盖率任务」的项目下拉框中。

### 4.2 与 API 的对应关系

前端调用 `POST /api/projects/create`（需 **`project:create`** 等权限）。字段与校验以后端 DTO 为准，完整清单见 **`apps/cover-admin/docs/API.md`**。

---

## 五、什么是「覆盖率任务」以及如何创建

**覆盖率任务**在本系统中建模为 **`branch_coverage`**：**隶属于某个项目**，并绑定一条 **测试分支名**（`testBranch`），以及任务类型 **`taskScope`**：

| `taskScope` | 管理菜单 | 典型用途 |
|-------------|----------|----------|
| **`full`** | **全量覆盖率管理** | 按测试分支查看整体行覆盖等 |
| **`incremental`** | **增量覆盖率** | 结合主分支与测试分支的 diff，只看变更相关行的统计与详情 |

同一 **`projectId` + `testBranch`** 下，**全量与增量各至多一条**任务（两种 scope 可并存两条记录）。创建接口为 `POST /api/branch-coverages/create`，body 含 `projectId`、`testBranch`、`taskScope`。

### 5.1 在界面中创建

1. 确保已完成上一节的 **项目** 创建，并记下 **`project_code`**（即项目 `code`）。
2. 打开 **「全量覆盖率管理」** 或 **「增量覆盖率」**。
3. 点击 **新建**，选择项目、填写 **测试分支**（与 CI / 本地运行应用时的 Git 分支一致，或与上报头 `X-Git-Branch` 能对上的命名习惯）。
4. 保存后，列表中会出现该任务；浏览器/SDK 上报时，服务端根据 **`X-Project-Code` + `X-Git-Branch`**（及库内配置）把数据归入对应任务下的 **`coverage_report`**。

### 5.2 运行插桩应用并验证

1. 业务工程里将 **`project_code`** 设为该项目 **`code`**；
2. `upload.endpoint` 指向当前环境的 **`/api/coverage/upload`**；
3. 启动应用，打开页面，等待若干上报周期；
4. 回到管理端对应任务，查看上报列表 / 打开 **覆盖率详情** 弹窗（含文件树、源码、人工标记等）。

---

## 六、小结与延伸阅读

- **先做数据模型**：MySQL + Redis → 启动后端 → 注册/权限 → **项目** → **覆盖率任务（全量或增量）** → 再配 **SDK** 的 `project_code` 与 `endpoint`。
- **再做体验优化**：增量任务需 GitHub 对比等配置与 `relativePath` 对齐，详见详情弹窗内提示与 `API.md`。
- 仓库内延伸阅读：
  - [`docs/PROJECT.md`](docs/PROJECT.md) — 总览与脚本索引  
  - [`sdk/vite-plugin/README.md`](sdk/vite-plugin/README.md)、[`sdk/webpack-plugin/README.md`](sdk/webpack-plugin/README.md)  
  - [`apps/cover-admin-front/README.md`](apps/cover-admin-front/README.md)  
  - [`apps/cover-admin/docs/API.md`](apps/cover-admin/docs/API.md)  

若你后续把本文对外发布，可将仓库根路径改为你的公开文档站或内部 Wiki 链接；代码与接口以各提交版本为准，发布前建议再对照 **`API.md`** 核对一遍路径与权限码。
