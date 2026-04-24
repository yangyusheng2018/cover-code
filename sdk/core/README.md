# istanbul-live-core

**无框架绑定**的共享工具：为 Webpack / Vite 插件提供

- 浏览器端 **覆盖率定时上报**内联脚本（`buildCoverageUploadInlineScript`）
- **仓库根**解析（`resolveCoverageReportPathRoot`）：自给定目录向上查找 `.git` 或 `pnpm-workspace.yaml`
- **Git 元数据**（`resolveGitUploadMeta`）：在指定目录执行 `git rev-parse` 得到分支与 commit，供上报头使用

本包被 **`istanbul-live-webpack-plugin`** 与 **`istanbul-live-vite-plugin`** 依赖；业务项目通常**不直接**依赖 core，除非自行拼接上报脚本或复用路径/Git 逻辑。

## API 摘要

### `buildCoverageUploadInlineScript(options: CoverageUploadClientOptions): string`

生成一段 IIFE 字符串，行为包括：

- 从 `globalThis` 读取 `coverageVariable`（默认 `__coverage__`）
- 按 `reportPathRoot` 将覆盖率对象的键（及条目内 `path`）规范为相对路径
- 按 `intervalMs`（默认 3000 ms，最小 500）`fetch(POST)` 到 `endpoint`
- 请求头 JSON 内含 `Content-Type`、`X-Project-Code`、可选 `X-Git-Branch` / `X-Git-Commit` 及自定义 `headers`

**必填**：`projectCode`（非空）、`endpoint`。

### `resolveCoverageReportPathRoot(fromDir: string): string`

从 `fromDir` 向上查找标记目录，用于上报体中路径统一为「仓库相对路径」。

### `resolveGitUploadMeta(cwd: string): { branch: string; commit: string }`

在 `cwd` 下执行 git；失败时返回空字符串，不抛错。

## 类型：`CoverageUploadClientOptions`

| 字段 | 说明 |
|------|------|
| `projectCode` | 与插件 `project_code` 对应。 |
| `endpoint` | POST 完整 URL。 |
| `intervalMs` | 上报间隔。 |
| `headers` | 额外请求头（可 JSON 序列化）。 |
| `coverageVariable` | 默认 `__coverage__`。 |
| `reportPathRoot` | 路径归一化根；省略时由调用方（插件）解析。 |
| `gitBranch` / `gitCommit` | 省略时插件侧可用 `resolveGitUploadMeta` 填充。 |

## 发布

包名 **`istanbul-live-core`**（无 scope）。发布顺序上应**先于**两个构建插件。仓库根：`pnpm run publish:sdk`。
