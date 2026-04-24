# 项目接口清单

> **维护约定**：本项目所有 HTTP 接口以本文档为对外说明；**凡接口路径、方法、请求体、鉴权或权限策略发生变更，须同步更新本文件**（路径：`docs/API.md`）。

业务接口统一前缀：**`/api`**，基础地址示例：`http://localhost:3001/api`（端口以 `PORT` / 实际监听为准）。

**例外**：**`GET /home`** 为 HTML 欢迎页，**不在** `/api` 前缀下，同机访问示例：`http://localhost:3001/home`。

---

## 一、根接口与欢迎页

| 方法 | 路径    | 鉴权           | 说明                                                                                                           |
| ---- | ------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| GET  | `/api`  | 公开 `@Public` | 应用说明（JSON 字符串）。                                                                                      |
| GET  | `/home` | 公开 `@Public` | **欢迎页**：返回 `text/html` 极简页面；与种子菜单 `menu.home` 的 `path` 一致，供前端侧栏跳转或浏览器直接打开。 |

---

## 二、覆盖率上报 `/api/coverage`

供前端/SDK 上报 **Istanbul** 单文件 coverage（`statementMap` + `s` 等）。**公开 `@Public`，无需 JWT**。根据 **`X-Project-Code`**、**`X-Git-Branch`** 查找 `branch_coverage`（**每个项目 + 测试分支至多一条**配置；**不**根据 `X-Coverage-Task-Scope` 等头区分）。未配置时 **HTTP 200**，`{ "success": false, "message": "无此项目或者分支" }`。

**同一 `branch_coverage` + 同一 `git_commit`（`X-Git-Commit`，均未传则视为 `NULL` 桶）** 再次上报时 **更新同一条 `coverage_report`** 并替换 `coverage_file` 行级数据，不新增记录。入库前会将本次 Istanbul 解析结果与 **库内该提交已有快照** 做行级合并：若某行本次未覆盖但此前已标记为已覆盖，则仍保留为已覆盖（`carried: true`），避免浏览器刷新导致 `__coverage__` 归零后再次上报把历史覆盖「冲掉」。**之后**再按 `meta.parentCommit` / `X-Parent-Commit` 与父提交报告合并（见下），顺序为：先粘合同提交历史，再应用父提交继承与 `resetLines`。

**隐式父提交（新 commit 首次上报）**：若请求**未**携带 `X-Parent-Commit` / `meta.parentCommit`，且当前 `git_commit` 在库中**尚不存在**对应 `coverage_report`（即该提交首次入库），服务端会自动选取同分支下 **另一 commit** 中 **`updated_at` 最新** 的一条已有上报作为父快照，对各行做与显式父提交相同的继承合并（`carried`），并把该父 SHA 写入 `coverage_report.parent_commit`。若源码已变，请在 `meta.fileChanges` 中对相关路径声明 **`resetLines`**，这些行将不以父快照为准。已显式声明父提交时，**不会**启用隐式父逻辑。

**多版本与代码变更**：库表对 `(branch_coverage_id, git_commit)` 唯一；**不同提交**各占一条 `coverage_report`，**历史 commit 不会被删除**；每次上报**仅覆盖**与当前 `X-Git-Commit`（及 NULL 桶）对应的那一条。同一分支上修改代码并产生新 commit 后，应使用 **新的 `X-Git-Commit`** 上报。管理端 **`POST /api/branch-coverages/coverage-reports`** 可列出该分支下全部上报摘要，详情 **`POST /api/branch-coverages/coverage-report`** 可选 **`reportId`** 查看指定一次；不传 `reportId` 时取该分支下 **`updated_at` 最新** 的一条（与「最近活跃」一致）。若需在**同一 commit** 上丢弃粘性与继承，可使用管理端「重置覆盖率」或 `meta.fileChanges.*.resetLines`。

**Source map 与原始源码行号**：服务端在入库前使用 **`istanbul-lib-coverage`** 与 **`istanbul-lib-source-maps`**，对整份 Istanbul payload 做一次 **`transformCoverage`**：若各文件 coverage 上带有 **`inputSourceMap`**（或后续扩展注册外链 map），则将 **statementMap / fnMap / branchMap** 等位置映射回 **原始源文件**，再计算 `line_details` 行号。无可用 source map 时行为与旧版一致。映射过程若抛错，会 **记录告警并回退** 为未映射的原始数据，避免上报失败。

### 请求体（两种）

1. **兼容旧版**：根对象即为 Istanbul 的「多文件」对象（顶层键为文件路径）。
2. **推荐**：`{ "payload": { ...与旧版相同... }, "meta": { ... } }`，便于携带 **父提交合并、增量范围、插桩失败行** 等。

### 请求头（除必填外均可选）

| 头                   | 说明                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `X-Project-Code`     | 项目唯一 `code`（必填）                                                                                                                 |
| `X-Git-Branch`       | 测试分支，须与「分支覆盖率」中 `test_branch` 一致（必填）                                                                               |
| `X-Git-Commit`       | 当前提交 SHA，写入 `coverage_report.git_commit`                                                                                         |
| `X-Parent-Commit`    | 父提交；若库中已有该提交的 `coverage_report`，则对 **未出现在 `meta.fileChanges.*.resetLines` 中的行** 继承父提交「已覆盖」状态（见下）。不传且为**新 commit 首次入库**时，服务端可能自动选用最近一条其它 commit 作为隐式父（见上文） |
| `X-Coverage-Mode`    | `full`（默认）或 `incremental`；与 `meta.mode` 二选一，**body.meta 优先**                                                               |
| `X-Diff-Base-Commit` | 增量 diff 基准（如 main 顶端），写入 `coverage_report.diff_base_commit`                                                                 |

### `meta` 字段（与请求头同名字段 **body 优先**）

| 字段                 | 说明                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parentCommit`       | 同 `X-Parent-Commit`                                                                                                                                                                                                                                        |
| `mode`               | `full` \| `incremental`                                                                                                                                                                                                                                     |
| `diffBaseCommit`     | 同 `X-Diff-Base-Commit`                                                                                                                                                                                                                                     |
| `fileChanges`        | `{ "路径": { "resetLines": [行号] } }` 相对父提交 **新增/修改需重算** 的行；这些行 **不继承** 父覆盖                                                                                                                                                        |
| `incrementalScopes`  | `{ "路径": [行号] }` 增量模式下 **diff 范围内** 的行，用于 `line_details.inScope`；缺省则 `inScope` 对展示行多为 `true`                                                                                                                                     |
| `instrumentFailures` | `{ "路径": [行号] }` 插桩失败行，`instrument: "fail"`                                                                                                                                                                                                       |
| `maxSourceLines`     | `{ "路径": 行数 }` **源文件真实行数**（建议上报）。Vue/SFC 等经编译后 Istanbul 行号往往远大于 `.vue` 文件行数；服务端按 **`min(Istanbul 映射上界, 此处行数)`** 截断 `line_details`，避免出现大量与编辑器不一致的「空行」。路径 key 与上报 coverage 键一致。 |

### `coverage_file` 存储

- **`line_details`**：JSON 数组（每元素一行，见下表）。
- **`covered_lines` / `uncovered_lines`**：由 `line_details` 派生，与旧表结构兼容并便于聚合查询。

### `coverage_file.line_details`（JSON 数组，每元素一行）

| 字段         | 说明                                    |
| ------------ | --------------------------------------- |
| `line`       | 行号                                    |
| `inScope`    | 增量：是否属于 diff 范围；全量恒 `true` |
| `instrument` | `none` \| `ok` \| `fail`                |
| `covered`    | 仅 `ok` 时为布尔；否则 `null`           |
| `carried`    | 可选：是否由 **父提交** 或 **同一 commit 上一次入库** 继承的已覆盖          |

| 方法 | 路径                   | 鉴权           | 说明                                                                                                                                                                                                                  |
| ---- | ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST | `/api/coverage/upload` | 公开 `@Public` | **HTTP 始终 200**（业务失败亦为 200）。成功：`success: true`，含 `replaced`、`coverageMode`、`parentResolved`（传了父提交且库中命中父报告时为 `true`）、`message`、`reportId`、`files`（含 `lineCount` 与覆盖计数）。 |

---

## 三、用户模块 `/api/users`

| 方法 | 路径                         | 鉴权 / 接口权限                                  | 说明                                                                                                                                                                                                                                                     |
| ---- | ---------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST | `/api/users/register`        | 公开 `@Public`                                   | **用户注册**。请求体：`username`（必填）、`password`（必填）、`email`（可选）。密码 bcrypt 后入库，返回用户信息（不含密码）。                                                                                                                            |
| POST | `/api/users/change-password` | JWT；未声明 `@RequireApiPermissions`（仅需登录） | **修改自己的密码**。请求体：`oldPassword`（当前密码）、`newPassword`（新密码，至少 6 字符）。原密码错误返回 **401**；新密码与当前密码相同返回 **400**。成功返回 `{ message: '密码已更新' }`。不改变 refresh Cookie；已签发的 access token 仍有效至过期。 |
| POST | `/api/users/list`            | JWT + 接口权限 `user:list`                       | **用户列表分页**。请求体：`username`（可选，模糊）、`page`（可选，默认 1）、`pageSize`（可选，默认 10，最大 100）。返回 `{ list, total, page, pageSize }`，list 不含密码。                                                                               |
| POST | `/api/users/delete`          | JWT + 接口权限 `user:delete`                     | **删除用户**。请求体：`id`（必填，用户 id）。                                                                                                                                                                                                            |

---

## 四、认证模块 `/api/auth`

| 方法 | 路径                       | 鉴权                      | 说明                                                                                                                                                                                                                                                                                              |
| ---- | -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST | `/api/auth/login`          | 公开 `@Public`            | **登录**。请求体：`username`、`password`。响应体返回 `accessToken`、`expiresIn`、`user`；refreshToken 写入 HttpOnly Cookie `refresh_token`。登录成功会**清除**该用户在 Redis 中的「当前生效角色」（见 `switch-role`）。                                                                           |
| POST | `/api/auth/refresh`        | 公开 `@Public`            | **刷新 Token**。从 Cookie 读取 `refresh_token`，响应体返回新 `accessToken` 等，并刷新 Cookie。                                                                                                                                                                                                    |
| POST | `/api/auth/logout`         | 公开 `@Public`            | **登出**。清除 refresh Cookie；请求体可选 `accessToken`，传入则使该 access 在 Redis 立即失效；并**清除**该用户「当前生效角色」Redis 状态。                                                                                                                                                        |
| GET  | `/api/auth/profile`        | JWT；`@SkipApiPermission` | **当前用户信息**。Header：`Authorization: Bearer <accessToken>`。返回当前用户（不含密码）。                                                                                                                                                                                                       |
| GET  | `/api/auth/my-permissions` | JWT；`@SkipApiPermission` | **当前用户权限汇总**。返回 `roles`、`activeRoleId`（可选，当前仅按该角色算权限时为数字，否则 `null`）、`activeRole`（同上时的 `{ id, name, code }`）、`apiPermissionCodes`、`uiPermissionTree`、`summary`。                                                                                       |
| POST | `/api/auth/switch-role`    | JWT；`@SkipApiPermission` | **切换当前生效角色**。请求体可选：`roleId`（正整数，且须属于当前用户已分配角色）。**不传**或 **`roleId` 为 `null`**：恢复为**多角色权限合并**。成功后返回 `{ activeRoleId }`（清除时为 `null`）。状态存 Redis（键按用户 id），默认 TTL 见环境变量 `REDIS_ACTIVE_ROLE_TTL_SECONDS`（默认 30 天）。 |

---

## 五、用户组（角色）模块 `/api/roles`

以下均需 **JWT** + 对应 **接口权限 code**（见各表「接口权限」列）。

| 方法 | 路径                             | 接口权限                   | 说明                                                                                    |
| ---- | -------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| POST | `/api/roles/list`                | `role:list`                | 请求体：`keyword`（可选）、`page`、`pageSize`。返回 `{ list, total, page, pageSize }`。 |
| POST | `/api/roles/detail`              | `role:detail`              | 请求体：`id`（角色 id）。返回 `role`、`apiPermissionIds`、`uiPermissionIds`。           |
| POST | `/api/roles/create`              | `role:create`              | 请求体：`name`、`code`、`description`（可选）。                                         |
| POST | `/api/roles/update`              | `role:update`              | 请求体：`id` 必填；`name`、`code`、`description` 可选。                                 |
| POST | `/api/roles/delete`              | `role:delete`              | 请求体：`id`。                                                                          |
| POST | `/api/roles/assign-users`        | `role:assign-users`        | 请求体：`roleId`、`userIds`（数组，至少 1 个）。向角色添加用户（用户可多角色）。        |
| POST | `/api/roles/remove-users`        | `role:remove-users`        | 请求体：`roleId`、`userIds`。从角色移除用户。                                           |
| POST | `/api/roles/set-api-permissions` | `role:set-api-permissions` | 请求体：`roleId`、`apiPermissionIds`（数组）。**整表替换**该角色的接口权限绑定。        |
| POST | `/api/roles/set-ui-permissions`  | `role:set-ui-permissions`  | 请求体：`roleId`、`uiPermissionIds`（数组）。**整表替换**该角色的菜单/按钮节点绑定。    |
| POST | `/api/roles/list-users`          | `role:list-users`          | 请求体：`roleId`、`page`、`pageSize`。分页返回角色下的用户列表（不含密码）。            |

**说明**：**未**在 Redis 中指定「当前生效角色」时，接口权限码与 UI 节点为**该用户全部角色**的并集。通过 `POST /api/auth/switch-role` 指定了某一 `roleId` 后，接口权限与菜单树**仅按该角色**在库中的绑定计算（`super_admin` 与其它角色相同，**无**代码层短路；须具备 `role_api_permission` / `role_ui_permission` 绑定方可访问）。

---

## 六、接口权限定义 `/api/api-permissions`

用于维护后端校验用的权限元数据（与 `@RequireApiPermissions('code')` 一致）。

| 方法 | 路径                          | 接口权限          | 说明                                                                    |
| ---- | ----------------------------- | ----------------- | ----------------------------------------------------------------------- |
| POST | `/api/api-permissions/list`   | `api-perm:list`   | 请求体：`keyword`（可选）、`page`、`pageSize`。                         |
| POST | `/api/api-permissions/create` | `api-perm:create` | 请求体：`code`、`name`；可选 `httpMethod`、`routePath`、`description`。 |
| POST | `/api/api-permissions/update` | `api-perm:update` | 请求体：`id` 必填；其余字段可选。                                       |
| POST | `/api/api-permissions/delete` | `api-perm:delete` | 请求体：`id`。                                                          |

---

## 七、菜单与按钮权限树 `/api/ui-permissions`

`type` 取值：`directory`（目录，仅归类、一般无 `path`）、`menu`（**实际可访问页面**）、`button`（按钮）。`parentId` 可空表示根；种子数据中根节点为目录「用户权限」，其下仅 `menu` 为页面；**按钮**须提供全局唯一 `code`。

**`showInMenu`（布尔）**：是否出现在侧栏菜单栏；库列 `show_in_menu`，接口与树节点 JSON 字段名为 **`showInMenu`**。为 `false` 时节点仍参与权限与完整树（`/api/ui-permissions/*`），前端渲染侧栏时可过滤；种子中 **按钮** 默认为 `false`，**目录/菜单** 为 `true`。新建节点省略时默认为 `true`。

| 方法 | 路径                         | 接口权限         | 说明                                                                                                                                                                                                                            |
| ---- | ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST | `/api/ui-permissions/list`   | `ui-perm:list`   | 请求体：可选 `parentId`（不传则全部平铺；传 `null` 表示仅根）。返回项含 `showInMenu` 等实体字段。                                                                                                                               |
| GET  | `/api/ui-permissions/tree`   | `ui-perm:tree`   | 返回完整管理端菜单/按钮树（嵌套 `children`）；每节点含 `showInMenu`。                                                                                                                                                           |
| POST | `/api/ui-permissions/create` | `ui-perm:create` | 请求体：`type`、`name`；可选 `parentId`、`code`、`path`、`sortOrder`、`showInMenu`、`remark`。                                                                                                                                  |
| POST | `/api/ui-permissions/update` | `ui-perm:update` | 请求体：`id` 必填；其余可选（含 `showInMenu`）。                                                                                                                                                                                |
| POST | `/api/ui-permissions/move`   | `ui-perm:move`   | **移动节点**。请求体：`id`（要移动的节点）；`parentId` **必填语义**：传 **`null`** 表示移到**根目录**（与根级 `directory` 并列，`parent_id` 为空）；传**正整数**为**目标父节点** id。不可移到自身或其子孙下（服务端校验环路）。 |
| POST | `/api/ui-permissions/delete` | `ui-perm:delete` | 请求体：`id`（子节点由库外键级联删除）。                                                                                                                                                                                        |

---

## 八、项目管理 `/api/projects`

以下均需 **JWT** + 对应接口权限。项目字段：`name`、`code`（全局唯一）、`gitUrl`、`mainBranch`（默认 `master`）、`relativeDir`（可选，项目相对目录）。请求体也可使用 **`relativePath`**，与 `relativeDir` 同义；若两者都传，以 **`relativeDir`** 为准。

**`repoToken`（仓库访问令牌）**：创建 / 更新时可传，用于服务端拉取**私有**仓库源码（如 `POST /api/branch-coverages/source-file`）。**响应中永不返回令牌明文**，仅返回 **`hasRepoToken`**（布尔）表示是否已配置。更新时传 **`repoToken: ""`** 可清空已保存的令牌；省略该字段则不修改原值。

| 方法 | 路径                    | 接口权限         | 说明                                                                                                                                                                              |
| ---- | ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET  | `/api/projects/options` | `project:list`   | **无请求体**。返回 `{ list: [{ id, code, name }] }`，为全部项目、按 `id` 升序，供下拉等场景（如新建分支覆盖率选项目）。                                                           |
| POST | `/api/projects/options` | `project:list`   | 与 GET 行为相同；请求体可省略或传 `{}`。                                                                                                                                          |
| POST | `/api/projects/list`    | `project:list`   | 请求体：可选 `keyword`（名称或 `code` 模糊）、`page`、`pageSize`。返回 `{ list, total, page, pageSize }`；`list` 每项含 **`hasRepoToken`**，不含 `repoToken`。                    |
| POST | `/api/projects/detail`  | `project:detail` | 请求体：`id`（项目 id）。返回含 **`hasRepoToken`**，不含 `repoToken`。                                                                                                            |
| POST | `/api/projects/create`  | `project:create` | 请求体：`name`、`code`、`gitUrl`；可选 `mainBranch`（省略则存为 `master`）、`relativeDir` 或 `relativePath`（二选一即可，同义）、**`repoToken`**。`code` 仅允许字母数字及 `._-`。 |
| POST | `/api/projects/update`  | `project:update` | 请求体：`id` 必填；`name`、`code`、`gitUrl`、`mainBranch`、`relativeDir` / `relativePath`、**`repoToken`** 可选（见上文令牌语义）。                                               |
| POST | `/api/projects/delete`  | `project:delete` | 请求体：`id`。删除项目时，关联的**分支覆盖率**记录由外键级联删除。                                                                                                                |

---

## 九、分支覆盖率 `/api/branch-coverages`

关联「项目」与「测试分支」；列表/详情/创建/更新返回扁平结构，含关联项目的 **`projectCode`**、**`projectName`**（由 join 得到，请求体无需重复传名称与 code）。**`coverage-report`** 返回的 **`branchCoverage`** 中含 **`hasRepoToken`**（该项目是否已配置仓库令牌，用于私有拉取，**不**返回令牌本身）。

### 覆盖率详情（弹窗 / 可视化）

**`POST /api/branch-coverages/coverage-reports`**（`branch-coverage:detail`）：请求体 **`branchCoverageId`**（必填）。返回 **`{ list }`**：`list` 为该分支下全部 `coverage_report` 摘要，按 **`updated_at` 降序**（首条即默认「当前最新」），元素含 **`id`、`gitCommit`、`fileCount`、`coverageMode`、`createdAt`、`updatedAt`**。

**`POST /api/branch-coverages/coverage-report`**（`branch-coverage:detail`）：请求体 **`branchCoverageId`**（必填）；可选 **`reportId`**（指定某次 `coverage_report`，不传则取该分支覆盖率下 **`updated_at` 最新** 一条）；可选 **`includeLineDetails`**（默认 `true`，为 `false` 时不返回每行 `lineDetails`，仅汇总与文件树，减小体积）；可选 **`view`**：`full`（默认）或 **`incremental`**——**仅当**该 `branch_coverage` 的 **`task_scope` 为 `incremental`** 时允许；否则 **400**。为 `incremental` 时调用 GitHub **`{主分支}...{测试分支}`** compare API，仅在 unified diff 涉及的新文件侧行上重算汇总，文件树与 `files` 仅含能对齐路径且有 `patch` 的文件；行对象可带 **`diffMark`**（`+` / 空格表示上下文）。非 GitHub 仓库或 compare 失败时返回 **`diffContext.error`**，且 `files` 可能为空。

- 成功且已有上报：返回 **`summary`**（总**行覆盖率** `coverageRatePercent`、各维度行数）、**`fileTree`**（目录树）、**`files[]`**（每文件 **`stats`**：插桩成功行、覆盖行、未覆盖行、未插桩、插桩失败；**`lineDetails`** 与上报入库一致；**`sourceHint`**：常见托管时可能含 **`rawFileUrl`**（与 `source-file` 同源规则），便于前端直接 `fetch` 源码后按行号着色）。
- 尚无上报：**`empty: true`**，无 `report`。
- 源码不在服务端持久化；着色规则见返回中的 **`visualizationHint`**。需要由后端代拉正文时用 **`POST /api/branch-coverages/source-file`**。

**`POST /api/branch-coverages/source-file`**（`branch-coverage:detail`）：请求体 **`branchCoverageId`**（必填）、**`path`**（必填，与 `coverage_file.path` / 文件树节点路径一致）；可选 **`reportId`**（不传则取该分支下**最新**一次上报）。服务端根据项目的 **`gitUrl`**、**`relativeDir`**、**`repo_token`（若项目在「项目管理」中配置）** 与上报的 **`git_commit`** 拉取文件正文（不执行本机 `git clone`）。**GitHub 且已配置 token 时优先使用 REST Contents API**（私有仓库比 `raw.githubusercontent.com` 更可靠），失败再回退 raw URL；GitLab 使用 `PRIVATE-TOKEN`；Gitee 等仍走 raw 并尝试 `token` / `Bearer`。

- 成功：`{ content, urlUsed, pathInRepo, commit, reportId }`（`content` 为 UTF-8 文本；单文件上限约 6MB）。
- **400**：未记录 commit、路径非法、`gitUrl` 无法解析为可拉取地址等。
- **404**：分支覆盖率不存在、指定上报不存在、该次上报中无此 `path`。
- **413**：文件过大。
- **502**：各候选 raw 地址均拉取失败（私有仓库未配置或令牌无效、路径与 commit 不匹配、网络等）。

| 方法 | 路径                                    | 接口权限                 | 说明                                                                                                                                                                                                              |
| ---- | --------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST | `/api/branch-coverages/list`            | `branch-coverage:list`   | 请求体：可选 **`taskScope`**：`full`（默认）或 `incremental`，只返回该任务类型；可选 `projectId`、`keyword`、`page`、`pageSize`。返回项含 `id`、`projectId`、`testBranch`、**`taskScope`**、`projectCode`、`projectName`、`createdAt`、`updatedAt`。 |
| POST | `/api/branch-coverages/detail`          | `branch-coverage:detail` | 请求体：`id`。                                                                                                                                                                                                    |
| POST | `/api/branch-coverages/coverage-reports` | `branch-coverage:detail` | 列出该分支下全部上报摘要（多 commit）。                                                                                                                                                                           |
| POST | `/api/branch-coverages/coverage-report`  | `branch-coverage:detail` | 见上文「覆盖率详情」。                                                                                                                                                                                            |
| POST | `/api/branch-coverages/source-file`     | `branch-coverage:detail` | 见上文「source-file」：按 `path` 从远程 HTTP raw 拉取与上报 commit 一致的源码正文。                                                                                                                               |
| POST | `/api/branch-coverages/reset-coverage`  | `branch-coverage:update` | **清空覆盖率**：请求体 `branchCoverageId`。删除该配置下全部 `coverage_report`（级联删除 `coverage_file`），**不删除** `branch_coverage` 记录本身。返回 `deletedReportCount`。                                     |
| POST | `/api/branch-coverages/create`          | `branch-coverage:create` | 请求体：`projectId`、`testBranch`、可选 **`taskScope`**（`full` \| `incremental`，默认 `full`）。**同一 `projectId` + `test_branch` 全局仅允许一条**（不可并存两条）；`task_scope` 仅决定归属全量/增量管理列表。                                                                                                                                    |
| POST | `/api/branch-coverages/update`          | `branch-coverage:update` | 请求体：`id`；可选 `projectId`、`testBranch`。                                                                                                                                                                    |
| POST | `/api/branch-coverages/delete`          | `branch-coverage:delete` | 请求体：`id`。                                                                                                                                                                                                    |

---

## 十、接口汇总表

| 方法 | 完整路径                                | 用途                                     |
| ---- | --------------------------------------- | ---------------------------------------- |
| GET  | `/api`                                  | 应用说明                                 |
| GET  | `/home`                                 | HTML 欢迎页                              |
| POST | `/api/coverage/upload`                  | Istanbul 覆盖率上报（公开）              |
| POST | `/api/users/register`                   | 用户注册                                 |
| POST | `/api/users/change-password`            | 当前用户修改自己的密码                   |
| POST | `/api/users/list`                       | 用户列表分页                             |
| POST | `/api/users/delete`                     | 删除用户                                 |
| POST | `/api/auth/login`                       | 登录                                     |
| POST | `/api/auth/refresh`                     | 刷新 Token                               |
| POST | `/api/auth/logout`                      | 登出                                     |
| GET  | `/api/auth/profile`                     | 当前用户                                 |
| GET  | `/api/auth/my-permissions`              | 当前用户权限树与接口权限码汇总           |
| POST | `/api/auth/switch-role`                 | 切换当前生效角色（或恢复多角色合并）     |
| POST | `/api/roles/list`                       | 角色列表                                 |
| POST | `/api/roles/detail`                     | 角色详情（含已绑权限 id）                |
| POST | `/api/roles/create`                     | 创建角色                                 |
| POST | `/api/roles/update`                     | 更新角色                                 |
| POST | `/api/roles/delete`                     | 删除角色                                 |
| POST | `/api/roles/assign-users`               | 角色添加用户                             |
| POST | `/api/roles/remove-users`               | 角色移除用户                             |
| POST | `/api/roles/set-api-permissions`        | 配置角色接口权限                         |
| POST | `/api/roles/set-ui-permissions`         | 配置角色菜单/按钮                        |
| POST | `/api/roles/list-users`                 | 角色下用户分页                           |
| POST | `/api/api-permissions/list`             | 接口权限列表                             |
| POST | `/api/api-permissions/create`           | 创建接口权限                             |
| POST | `/api/api-permissions/update`           | 更新接口权限                             |
| POST | `/api/api-permissions/delete`           | 删除接口权限                             |
| POST | `/api/ui-permissions/list`              | UI 权限平铺列表                          |
| GET  | `/api/ui-permissions/tree`              | UI 权限树                                |
| POST | `/api/ui-permissions/create`            | 创建 UI 节点                             |
| POST | `/api/ui-permissions/update`            | 更新 UI 节点                             |
| POST | `/api/ui-permissions/move`              | 移动 UI 节点（根或其它父节点下）         |
| POST | `/api/ui-permissions/delete`            | 删除 UI 节点                             |
| GET  | `/api/projects/options`                 | 全部项目简要列表（id/code/name，下拉用） |
| POST | `/api/projects/options`                 | 同上（POST 别名）                        |
| POST | `/api/projects/list`                    | 项目分页列表                             |
| POST | `/api/projects/detail`                  | 项目详情                                 |
| POST | `/api/projects/create`                  | 创建项目                                 |
| POST | `/api/projects/update`                  | 更新项目                                 |
| POST | `/api/projects/delete`                  | 删除项目                                 |
| POST | `/api/branch-coverages/list`            | 分支覆盖率分页列表（按 `taskScope` 区分全量/增量）                       |
| POST | `/api/branch-coverages/detail`          | 分支覆盖率详情                           |
| POST | `/api/branch-coverages/coverage-reports` | 分支覆盖率下全部上报摘要（多 commit）   |
| POST | `/api/branch-coverages/coverage-report`  | 分支覆盖率上报详情（汇总、文件树、行级） |
| POST | `/api/branch-coverages/source-file`     | 按文件路径从远程拉取源码（HTTP raw）     |
| POST | `/api/branch-coverages/reset-coverage`  | 清空该分支下的覆盖率上报数据             |
| POST | `/api/branch-coverages/create`          | 创建分支覆盖率                           |
| POST | `/api/branch-coverages/update`          | 更新分支覆盖率                           |
| POST | `/api/branch-coverages/delete`          | 删除分支覆盖率                           |

---

## 十一、认证与权限说明

- **JWT**：除标注为 `@Public` 的接口外，均需在 Header 携带 `Authorization: Bearer <accessToken>`。全局 `JwtAuthGuard` 生效。
- **接口权限**：全局 `ApiPermissionGuard` 在 JWT 之后执行。控制器方法上带有 `@RequireApiPermissions('a','b')` 时，当前用户须拥有所列全部 `code`（含 `super_admin` 编码角色，与其它角色一致，均按 `role_api_permission` 绑定校验）。`@SkipApiPermission` 表示仅校验登录，不校验接口权限码。
- **切换生效角色**：`POST /api/auth/switch-role` 将当前用户上下文限定为某一已拥有角色（Redis 持久化，按用户 id）；清空后接口/菜单权限恢复为**所有角色并集**。登录、登出会清除该状态，避免串会话。
- **RefreshToken**：存 MySQL，经 HttpOnly Cookie `refresh_token` 下发；登录/刷新/登出与公开接口说明不变。
- **跨域 Cookie**：前端需 `credentials: 'include'`（或 axios `withCredentials: true`），与后端 CORS `credentials: true` 配合。

### 种子菜单与前端路由（`docs/data.sql` / `database/schema.sql`）

前端若根据 **`GET /api/auth/my-permissions`** 返回的 `uiPermissionTree`（`path`、`code`、`showInMenu` 等）生成侧栏或控制路由，**`path` / `code` 须与库表 `ui_permission` 一致**；侧栏条目建议仅展示 `showInMenu === true` 的节点（目录无 `path` 时仍可按需作为分组标题）。

当前种子结构：**根节点一条** `directory`「用户权限」（无 `path`）；其下为若干 **`menu` 页面**及各自的 **`button`**：

| code                   | path（示例）              | 说明                                                               |
| ---------------------- | ------------------------- | ------------------------------------------------------------------ |
| （根目录无 code）      | —                         | `directory`「用户权限」                                            |
| `menu.home`            | `/home`                   | 欢迎页（与 `GET /home` 同源路径）                                  |
| `menu.user`            | `/system/user`            | 用户管理页面（侧栏菜单展示名）                                     |
| `btn.user.query`       | —                         | 用户管理页：查询                                                   |
| `btn.user.add`         | —                         | 用户管理页：添加用户（如调注册或后续管理员建用户接口，需自行对接） |
| `btn.user.delete`      | —                         | 用户管理页：删除                                                   |
| `menu.role`            | `/system/role`            | 角色管理页                                                         |
| `menu.api_permission`  | `/system/api-permission`  | 接口权限页                                                         |
| `menu.ui_permission`   | `/system/ui-permission`   | 菜单与按钮页                                                       |
| `menu.project`         | `/system/project`         | 项目管理页                                                         |
| `menu.branch_coverage` | `/system/branch-coverage` | 分支覆盖率页                                                       |
| `menu.incremental_coverage` | `/system/incremental-coverage` | 增量覆盖率页（前端实际路由为 `/report/incremental-coverage`，与 UI 路径成对门禁） |
| `btn.incremental_coverage.query` / `.add` / `.detail` / `.reset` / `.edit` / `.remove` | — | **增量覆盖率**页内按钮（与全量页 `btn.branch_coverage.*` 解耦，角色可单独授权） |
| 其它 `btn.*`           | —                         | 各页内其余按钮                                                     |

**种子「用户角色」**（`role.code = super_admin`，展示名可为「用户角色」）：种子通过 `INSERT INTO role_ui_permission SELECT 1, id FROM ui_permission` 绑定**全部** UI 节点；接口权限为 `SELECT 1, id FROM api_permission`；初始用户 `admin` 通过 `user_role` 绑定该角色。运行时**不**因 `super_admin` 编码而跳过上述绑定校验。

---

## 十二、内置接口权限 code 一览（与 `database/schema.sql` 种子对齐）

| code                                                                                                                               | 说明                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user:list` / `user:delete`                                                                                                        | 用户列表 / 删除用户                                                                                                                                  |
| `role:list` / `role:detail` / `role:create` / `role:update` / `role:delete`                                                        | 角色 CRUD                                                                                                                                            |
| `role:assign-users` / `role:remove-users`                                                                                          | 角色成员                                                                                                                                             |
| `role:set-api-permissions` / `role:set-ui-permissions`                                                                             | 角色绑定接口 / UI                                                                                                                                    |
| `role:list-users`                                                                                                                  | 角色下用户列表                                                                                                                                       |
| `api-perm:list` / `api-perm:create` / `api-perm:update` / `api-perm:delete`                                                        | 接口权限定义 CRUD                                                                                                                                    |
| `ui-perm:list` / `ui-perm:tree` / `ui-perm:create` / `ui-perm:update` / `ui-perm:move` / `ui-perm:delete`                          | 菜单与按钮树 CRUD / 移动                                                                                                                             |
| `project:list` / `project:detail` / `project:create` / `project:update` / `project:delete`                                         | 项目管理 CRUD                                                                                                                                        |
| `branch-coverage:list` / `branch-coverage:detail` / `branch-coverage:create` / `branch-coverage:update` / `branch-coverage:delete` | 分支覆盖率 CRUD；`branch-coverage:detail` 含 **`coverage-reports`**、**`coverage-report`** 与 **`source-file`**；`branch-coverage:update` 含 **清空覆盖率** `reset-coverage` |

新增受保护接口时：在代码上增加 `@RequireApiPermissions('...')`，在库表 `api_permission` 中增加对应 `code`，并通过角色绑定给用户；**并更新本文件相关章节与汇总表。**
