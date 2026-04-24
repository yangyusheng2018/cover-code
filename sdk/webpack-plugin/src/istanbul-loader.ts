import { Buffer } from "node:buffer";
import path from "node:path";
import { createInstrumenter } from "istanbul-lib-instrument";
import type { LoaderContext } from "webpack";
import { resolveCoverageReportPathRoot } from "istanbul-live-core";

type WpiUtils = {
  createTestExclude: (opts: Record<string, unknown>) => {
    shouldInstrument: (file: string) => boolean;
  };
  instrumenterOptions: Record<string, unknown>;
  sanitizeSourceMap: (raw: unknown) => unknown;
};

function loadWebpackPluginIstanbulUtils(): WpiUtils {
  const utilsJs = path.join(
    path.dirname(require.resolve("webpack-plugin-istanbul")),
    "utils.js",
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(utilsJs) as WpiUtils;
}

const { createTestExclude, instrumenterOptions, sanitizeSourceMap } =
  loadWebpackPluginIstanbulUtils();

const instrumenter = createInstrumenter(
  instrumenterOptions as NonNullable<Parameters<typeof createInstrumenter>[0]>,
);

function normalizeInputMap(
  map: string | object | Buffer | undefined | false,
): object | undefined {
  if (map == null || map === false) return undefined;
  let obj: object;
  if (Buffer.isBuffer(map)) {
    const s = map.toString("utf8").trim();
    if (!s) return undefined;
    obj = JSON.parse(s) as object;
  } else if (typeof map === "string") {
    const s = map.trim();
    if (!s) return undefined;
    obj = JSON.parse(s) as object;
  } else {
    obj = map;
  }
  try {
    return sanitizeSourceMap(obj) as object;
  } catch {
    return obj;
  }
}

function normalizePathSlashes(p: string): string {
  return p.replace(/\\/g, "/");
}

function toRepoRelativeIfAbsolute(source: string, reportRoot: string): string {
  const s = normalizePathSlashes(source);
  if (!path.isAbsolute(s)) return s;
  const root = normalizePathSlashes(reportRoot).replace(/\/+$/, "");
  if (!root) return s;
  const lowerS = s.toLowerCase();
  const lowerRoot = root.toLowerCase();
  if (lowerS === lowerRoot) return ".";
  if (!lowerS.startsWith(lowerRoot + "/")) return s;
  return s.slice(root.length + 1);
}

function relativizeInputSourceMap(
  rawMap: object | undefined,
  reportRoot: string,
): object | undefined {
  if (!rawMap) return rawMap;
  const map = rawMap as { sources?: unknown };
  if (!Array.isArray(map.sources)) return rawMap;
  return {
    ...(rawMap as Record<string, unknown>),
    sources: map.sources.map((src) =>
      typeof src === "string" ? toRepoRelativeIfAbsolute(src, reportRoot) : src,
    ),
  };
}

/** 供 istanbul 与 `__coverage__` 使用的唯一文件名（磁盘路径 + query，避免 SFC 各块互相覆盖） */
function coverageFilename(ctx: LoaderContext<Record<string, unknown>>): string {
  return ctx.resourcePath + (ctx.resourceQuery || "");
}

/**
 * 将 Webpack loader 链上的 **inputSourceMap** 传入 `istanbul-lib-instrument` 第三参，
 * 使 `__coverage__[path].inputSourceMap` 可被 POST 给后端做 remap。
 */
function istanbulLiveLoader(
  this: LoaderContext<Record<string, unknown>>,
  content: string,
  map?: string | object | Buffer | false,
): void {
  const callback = this.async();
  const opts = this.getOptions() as Record<string, unknown>;
  try {
    const testExclude = createTestExclude(opts);
    if (!testExclude.shouldInstrument(this.resourcePath)) {
      callback(null, content, map as never);
      return;
    }
    const inputMap = normalizeInputMap(map);
    // Vue SFC 根模块（仅 import/export 包装代码）在多数链路下不会收到 map；
    // 这类模块插桩会产出空 statementMap 并污染同文件的 coverage 观测。
    const isVueResource = this.resourcePath.replace(/\\/g, "/").endsWith(".vue");
    if (isVueResource && inputMap === undefined) {
      callback(null, content, map as never);
      return;
    }
    const cwd =
      typeof opts.cwd === "string" && opts.cwd.trim()
        ? opts.cwd
        : process.cwd();
    const reportRoot = resolveCoverageReportPathRoot(cwd);
    const normalizedInputMap = relativizeInputSourceMap(inputMap, reportRoot);
    const fileKey = coverageFilename(this);
    const code = instrumenter.instrumentSync(
      content,
      fileKey,
      normalizedInputMap as never,
    );
    const outMap = instrumenter.lastSourceMap();
    callback(null, code, (outMap ?? map) as never);
  } catch (err) {
    callback(err as Error);
  }
}

export = istanbulLiveLoader;
