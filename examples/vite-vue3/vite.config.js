import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { istanbulLiveVitePlugin } from "istanbul-live-vite-plugin";

export default defineConfig(({ mode }) => {
  /** 应用层决定是否开启覆盖率（示例：非 production 且未显式关闭 VITE_COVERAGE） */
  const env = loadEnv(mode, process.cwd(), "");
  const coverage = mode !== "production" && env.VITE_COVERAGE !== "false";

  return {
    /** 工作区内 `istanbul-live-vite-plugin` 走 `dist` 入口，避免预打包缓存旧实现 */
    optimizeDeps: {
      exclude: ["istanbul-live-vite-plugin"],
    },
    plugins: [
      vue(),
      ...istanbulLiveVitePlugin({
        coverage,
        project_code: "cover_test",
        include: ["src/**/*"],
        exclude: ["node_modules", "dist/"],
        extension: [".vue", ".js", ".ts"],
        forceBuildInstrument: true,
        /** 由上面 `coverage` 统一开关；与 `vite-plugin-istanbul` 的 requireEnv 解耦 */
        requireEnv: false,
        upload: {
          /** 与 `pnpm run coverage:server` 一致；双终端：先 coverage:server，再 dev */
          endpoint: "http://localhost:3001/api/coverage/upload",
          // endpoint: "http://127.0.0.1:9876/coverage",
          intervalMs: 10000,
        },
      }),
    ],
    server: {
      port: 5173,
    },
    build: {
      sourcemap: true,
    },
    css: {
      devSourcemap: true,
    },
    preview: {
      port: 4174,
      host: true,
    },
  };
});
