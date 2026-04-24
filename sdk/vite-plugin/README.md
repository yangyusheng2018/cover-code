# istanbul-live-vite-plugin

Vite 插件组合：在 **`vite-plugin-istanbul`** 之上封装 **项目标识**、**是否启用**、**可选浏览器端定时上报**（注入 `index.html`），并对 Vue SFC 的 **`?vue&type=template`** 虚拟块提供可选的补插桩插件，使模板分支进入覆盖率统计。

依赖 **`istanbul-live-core`** 生成上报脚本与 Git / 仓库根解析。

## 安装

```bash
pnpm add istanbul-live-vite-plugin istanbul-live-core
# peer: vite ^5 || ^6
```

## 在 vite.config 中使用

本包导出 **`istanbulLiveVitePlugin(options)`**，返回 **插件数组**（istanbul、可选 Vue template 插件、上报插件）。必须在 `plugins` 中**展开**，不要只把返回值当作单个插件嵌套进别的 `config` 钩子，否则子插件可能未进入最终管线。

```ts
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { istanbulLiveVitePlugin } from "istanbul-live-vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const coverage = mode !== "production" && env.VITE_COVERAGE !== "false";

  return {
    optimizeDeps: {
      // monorepo 源码依赖时建议排除，避免预构建缓存旧实现
      exclude: ["istanbul-live-vite-plugin"],
    },
    plugins: [
      vue(),
      ...istanbulLiveVitePlugin({
        coverage,
        project_code: "my-app",
        include: ["src/**/*"],
        exclude: ["node_modules", "dist/"],
        extension: [".vue", ".js", ".ts"],
        requireEnv: false,
        upload: {
          endpoint: "http://127.0.0.1:3000/api/coverage/upload",
          intervalMs: 10000,
        },
      }),
    ],
    build: { sourcemap: true },
  };
});
```

## 何时启用（coverage 开关）

1. 若传入 **`coverage: boolean`**，**仅由该值决定**是否插桩/上报（推荐在 `defineConfig` 里用 `loadEnv` / `mode` 自行计算）。
2. 若未传 `coverage`，则回退为 **`(enabled ?? true) && (instrument ?? true)`**（兼容旧配置）。

启用插桩时 **`project_code` 必填**（非空字符串），否则构建抛错。

## 透传给 vite-plugin-istanbul 的选项

`IstanbulPluginOptions` 中的字段（如 `include`、`exclude`、`extension`、`cwd`、`nycrcPath`、`requireEnv`、`checkProd`、`forceBuildInstrument` 等）会原样合并；本包默认设置 `checkProd: true`、`forceBuildInstrument: true`（可被覆盖）。

## 上报（upload）

与 Webpack 插件语义一致：`upload.endpoint` 存在且启用覆盖率时，在 **`serve` / `build` / `preview`** 命令下向 HTML **head-prepend** 注入内联 IIFE，定时 POST `window.__coverage__`（键与 `path` 可按 `reportPathRoot` 规范为仓库相对路径）。

可选字段：`intervalMs`、`headers`、`reportPathRoot`、`gitBranch`、`gitCommit` —— 详见 **`istanbul-live-core`** 的 `CoverageUploadClientOptions`。

## Vue 模板插桩

- **`vueTemplateCoverage`**：默认 `true`。设为 `false` 可关闭对 `type=template` 的二次处理。
- 关闭后仅依赖 `vite-plugin-istanbul` 对 script 等的插桩。

## 常见问题

- **未插桩**：确认 `plugins` 使用了展开运算符 `...istanbulLiveVitePlugin(...)`，且 `coverage` 为 `true`（或回退的 enabled/instrument 为真）。
- **上报无请求**：检查 `upload.endpoint`、`coverage` 与当前命令（preview 也会注入脚本）。

## 示例工程

**`examples/vite-vue3`** 提供完整 `vite.config.js`。

## 发布

先发布 **`istanbul-live-core`**，再发布本包。仓库根：`pnpm run publish:sdk:vite-plugin`。
