# istanbul-live-babel

（npm 包名 **`istanbul-live-babel`**，目录为 `sdk/instrument`。）

在**不经过** Vite / Webpack 官方插件链时，为自定义流水线提供 **Babel + `babel-plugin-istanbul`** 的一次性插桩能力：对单段源码调用 `babel.transformAsync`，并处理无效的占位 `inputSourceMap`。

适用于自建 Rollup 插件、脚本化插桩、测试工具等场景。

## 安装

```bash
pnpm add istanbul-live-babel @babel/core
# babel-plugin-istanbul 已作为本包依赖
```

## API

### `instrumentWithIstanbul(opts): Promise<BabelFileResult | null>`

| 字段 | 说明 |
|------|------|
| `code` | 源代码字符串。 |
| `filename` | 传给 Babel / istanbul 的文件名，影响 `__coverage__` 的键。 |
| `cwd` | 工作目录。 |
| `root` | 可选，Babel `root`，默认同 `cwd`。 |
| `inputSourceMap` | 可选；会先经 `pickInputSourceMap` 过滤空 mappings。 |
| `retainLines` | 可选，默认 `false`。 |

返回 Babel 结果（含 `code` / `map`）；失败时可能为 `null`。

### `pickInputSourceMap(map): TransformOptions["inputSourceMap"] | undefined`

若 `map.mappings` 为空或仅空白，返回 `undefined`，避免 Babel 因无效 map 报错。构建工具有时生成 `mappings: ""` 的占位对象，应先过此函数再传入 `instrumentWithIstanbul`。

### `ISTANBUL_EXTENSIONS`

常量数组：`[".js", ".cjs", ".mjs", ".ts", ".tsx", ".jsx", ".vue"]`，与常见 istanbul 扩展对齐；含 `.vue` 时需在业务侧保证 `filename` 与内容一致（本包不对 SFC 做拆分）。

## 与 webpack/vite 插件的关系

生产站点覆盖率通常直接使用 **`istanbul-live-webpack-plugin`** 或 **`istanbul-live-vite-plugin`**；本包为**补充工具库**，不是浏览器运行时依赖。

## 发布

包名 **`istanbul-live-babel`**。仓库根：`pnpm run publish:sdk`。
