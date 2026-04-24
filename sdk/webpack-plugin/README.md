# istanbul-live-webpack-plugin

Webpack 5 插件：在开启覆盖率时，通过自定义 **istanbul-loader**（基于 `istanbul-lib-instrument`）对源码插桩，并可选择通过 **html-webpack-plugin** 向页面注入定时上报脚本，将 `window.__coverage__` POST 到后端。

依赖 **`istanbul-live-core`** 生成上报脚本与解析 Git / 仓库根路径。

## 安装

```bash
pnpm add istanbul-live-webpack-plugin istanbul-live-core
# peer: webpack@^5, html-webpack-plugin@^5（仅在上报时需要 HTML 注入）
```

## 何时启用

由配置项 **`coverage`** 或 **`enableCoverage`**（布尔）决定；**两者都未传或非布尔则完全关闭**（不注册 loader、不注入脚本）。若两者都传，以 **`coverage`** 为准。

插件**不读取**环境变量或 Webpack `mode`。

## 最小配置（仅插桩）

```js
const { IstanbulLiveWebpackPlugin } = require("istanbul-live-webpack-plugin");

module.exports = {
  // ...
  plugins: [
    new IstanbulLiveWebpackPlugin({
      project_code: "my-app", // 必填（启用时）
      coverage: true,
      cwd: __dirname,
      include: ["src/**/*"],
      exclude: ["node_modules/**"],
      extension: [".ts", ".tsx", ".js", ".jsx", ".vue"],
    }),
  ],
};
```

## 插桩 + 上报

配置 **`upload.endpoint`**（完整 URL）后，会在 **HtmlWebpackPlugin** 的 `alterAssetTags` 中向 HTML 追加内联脚本：按间隔 `fetch` POST 全局覆盖率对象。

```js
new IstanbulLiveWebpackPlugin({
  project_code: "my-app",
  coverage: true,
  cwd: __dirname,
  include: ["src/**/*"],
  upload: {
    endpoint: "http://127.0.0.1:3000/api/coverage/upload",
    intervalMs: 3000, // 默认 3000，最小 500
    headers: { Authorization: "Bearer ..." }, // 可选
    reportPathRoot: "/abs/path/to/repo", // 可选，省略则向上查找 .git / pnpm-workspace
    gitBranch: "main", // 可选，省略则在 reportPathRoot 下 git 解析
    gitCommit: "abc...", // 可选
  },
}),
```

上报请求头由 `istanbul-live-core` 生成，包含 `X-Project-Code`、`X-Git-Branch`、`X-Git-Commit`（有值时）等。

## 主要选项说明

| 选项 | 说明 |
|------|------|
| `project_code` | 项目标识，启用覆盖率时**必填**；对应上报头 `X-Project-Code`。 |
| `coverage` / `enableCoverage` | 布尔，控制是否启用插桩与上报逻辑。 |
| `include` / `exclude` / `extension` / `cwd` | 与 `webpack-plugin-istanbul` 的 test-exclude 语义一致；`cwd` 默认 `compiler.context`。 |
| `instrumentRoots` | **仅 Webpack**：istanbul-loader 的 `rule.include` 根目录（绝对或相对 `context`）；默认 `["<context>/src"]`。源码不在 `src` 下时必须与 `include` 一致配置。 |
| `upload` | 见上；无 `endpoint` 则不注入上报脚本。 |

## Source Map 与 Vue

- **devtool**：勿用 `false`；开发推荐 `eval-source-map` 或 `cheap-module-source-map`，以便 loader 收到 `inputSourceMap`，`__coverage__` 中保留映射供后端还原。
- **vue-loader**：需 `options.sourceMap: true`，保证 `?vue&type=script` 等子模块带 map。
- 本包 loader 对 `.vue` 等资源路径与 query 处理与官方 istanbul loader 差异见源码注释（避免子块与入口键冲突）。

## 与 monorepo 协作

在 pnpm workspace 内可对包使用 `workspace:*` 引用；发布到 npm 时需先发布 **`istanbul-live-core`**，再发本包。根目录脚本示例：`pnpm run publish:sdk:webpack-plugin`（见仓库根 `package.json`）。

## 示例工程

仓库内 **`examples/webpack-react-ts`**、**`examples/webpack-vue3`** 含完整 `webpack.config.cjs` 示例。
