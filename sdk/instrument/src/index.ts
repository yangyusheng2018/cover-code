/**
 * @istanbul-live/instrument
 *
 * 供自定义 Vite/Webpack 链或其它工具复用：对单段源码做 babel-plugin-istanbul 插桩、过滤无效 inputSourceMap。
 */

import type { BabelFileResult, TransformOptions } from "@babel/core";
import babel from "@babel/core";
import istanbul from "babel-plugin-istanbul";

/** 与 babel-plugin-istanbul / test-exclude 常见扩展对齐；含 `.vue` 时需与业务 filename 策略一致 */
export const ISTANBUL_EXTENSIONS = [
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".vue"
] as const;

/**
 * 构建工具会产出 `mappings: ""` 的占位 map；传给 Babel 会导致无效 inputSourceMap。
 */
export function pickInputSourceMap(
  map: unknown
): TransformOptions["inputSourceMap"] {
  if (!map || typeof map !== "object") return undefined;
  const m = map as { mappings?: unknown };
  if (m.mappings == null || String(m.mappings).trim() === "") {
    return undefined;
  }
  return map as TransformOptions["inputSourceMap"];
}

export type InstrumentWithIstanbulOptions = {
  code: string;
  /** 传给 babel-plugin-istanbul 的 filename（决定 __coverage__ 键） */
  filename: string;
  cwd: string;
  /** Babel root，默认同 cwd */
  root?: string;
  inputSourceMap?: TransformOptions["inputSourceMap"];
  retainLines?: boolean;
};

/**
 * 对单段 JS/TS（或已是 JS 的编译产物）做 babel-plugin-istanbul 插桩。
 */
export async function instrumentWithIstanbul(
  opts: InstrumentWithIstanbulOptions
): Promise<BabelFileResult | null> {
  const result = await babel.transformAsync(opts.code, {
    filename: opts.filename,
    cwd: opts.cwd,
    root: opts.root ?? opts.cwd,
    sourceMaps: true,
    retainLines: opts.retainLines ?? false,
    ast: false,
    babelrc: false,
    configFile: false,
    ...(opts.inputSourceMap ? { inputSourceMap: opts.inputSourceMap } : {}),
    plugins: [
      [istanbul, { cwd: opts.cwd, extension: [...ISTANBUL_EXTENSIONS] }]
    ]
  });
  return result ?? null;
}
