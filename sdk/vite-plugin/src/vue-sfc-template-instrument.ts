import { loadNycConfig } from "@istanbuljs/load-nyc-config";
import { createInstrumenter } from "istanbul-lib-instrument";
import TestExclude from "test-exclude";
import type { Plugin, ResolvedConfig, TransformResult } from "vite";
import type { IstanbulPluginOptions } from "vite-plugin-istanbul";

function normalizeId(id: string): string {
  let s = id;
  if (s.startsWith("\0")) s = s.slice(1);
  return s.replace(/\\/g, "/");
}

/** @vitejs/plugin-vue 的 template 虚拟模块 */
export function isVueTemplateModuleId(id: string): boolean {
  return /[?&]vue&type=template(?:&|$)/.test(normalizeId(id));
}

/** 与 TestExclude / include 一致：真实 .vue 路径（去掉 ?vue 及之后） */
function resolveExcludePath(id: string): string {
  const s = normalizeId(id);
  const [beforeVue] = s.split("?vue");
  return beforeVue;
}

/**
 * Istanbul / __coverage__ 键：与当前仓库内补丁版 `vite-plugin-istanbul` 对齐，
 * 保留 `?vue` query，避免与 `type=script` 块互相覆盖。
 */
function resolveInstrumentFilename(id: string): string {
  const s = normalizeId(id);
  if (s.includes("?vue")) return s;
  const q = s.indexOf("?");
  if (q !== -1) return s.slice(0, q);
  return s;
}

type RawSourceMap = Record<string, unknown>;

function sanitizeSourceMap(rawSourceMap: RawSourceMap): RawSourceMap {
  const { sourcesContent, ...sourceMap } = rawSourceMap;
  return JSON.parse(JSON.stringify(sourceMap)) as RawSourceMap;
}

function getEnvVariable(
  key: string,
  prefix: string | string[],
  env: Record<string, string | boolean | undefined>
): string | undefined {
  if (Array.isArray(prefix)) {
    const envPrefix = prefix.find((pre) => {
      const prefixedName = `${pre}${key}`;
      return env[prefixedName] != null;
    });
    prefix = envPrefix ?? "";
  }
  const v = env[`${prefix}${key}`];
  return v != null ? String(v) : undefined;
}

function resolveViteIstanbulEnabled(
  config: ResolvedConfig,
  opts: Pick<
    IstanbulPluginOptions,
    "requireEnv" | "cypress" | "checkProd" | "forceBuildInstrument"
  >
): boolean {
  const requireEnv = opts.requireEnv ?? false;
  const checkProd = opts.checkProd ?? true;
  const forceBuildInstrument = opts.forceBuildInstrument ?? false;
  const { isProduction, env } = config;
  const { CYPRESS_COVERAGE } = process.env;
  const envPrefix = config.envPrefix ?? "VITE_";
  const envCoverage = opts.cypress
    ? CYPRESS_COVERAGE
    : getEnvVariable("COVERAGE", envPrefix, env);
  const envVar = envCoverage?.toLowerCase() ?? "";
  if (
    (checkProd && isProduction && !forceBuildInstrument) ||
    (!requireEnv && envVar === "false") ||
    (requireEnv && envVar !== "true")
  ) {
    return false;
  }
  return true;
}

const DEFAULT_EXTENSION = [
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".vue"
] as const;

async function createTestExclude(
  opts: Pick<
    IstanbulPluginOptions,
    "include" | "exclude" | "extension" | "cwd" | "nycrcPath"
  >
): Promise<TestExclude> {
  const { nycrcPath, include, exclude, extension } = opts;
  const cwd = opts.cwd ?? process.cwd();
  const nycConfig = await loadNycConfig({ cwd, nycrcPath });
  return new TestExclude({
    cwd,
    include: include ?? nycConfig.include,
    exclude: exclude ?? nycConfig.exclude,
    extension: extension ?? nycConfig.extension ?? [...DEFAULT_EXTENSION],
    excludeNodeModules: true
  });
}

function looksInstrumentedByIstanbul(code: string): boolean {
  return code.includes("cov_") && code.includes("__coverage__");
}

export type VueTemplateInstrumentPluginOptions = {
  istanbul: Pick<
    IstanbulPluginOptions,
    | "include"
    | "exclude"
    | "extension"
    | "cwd"
    | "nycrcPath"
    | "requireEnv"
    | "cypress"
    | "checkProd"
    | "forceBuildInstrument"
    | "generatorOpts"
  >;
  /** 与 `istanbulLiveVitePlugin` 的 `coverage` / 回退字段一致 */
  liveCoverageActive: () => boolean;
};

/**
 * 在 `vite-plugin-istanbul` 之后对 `?vue&type=template` 虚拟块补插桩：
 * 部分场景下 template 编译产物未带上 istanbul 计数器，导致模板分支无覆盖率。
 */
export function createVueTemplateInstrumentPlugin(
  options: VueTemplateInstrumentPluginOptions
): Plugin {
  const MODULE_PREFIX = "/@modules/";
  const NULL_STRING = "\0";
  let testExclude: TestExclude | undefined;
  let viteIstanbulEnabled = true;
  const instrumenter = createInstrumenter({
    coverageGlobalScopeFunc: false,
    coverageGlobalScope: "globalThis",
    preserveComments: true,
    produceSourceMap: true,
    autoWrap: true,
    esModules: true,
    compact: false,
    generatorOpts: { ...options.istanbul.generatorOpts }
  });

  return {
    name: "istanbul-live:vue-sfc-template",
    apply(_, env) {
      const force = options.istanbul.forceBuildInstrument ?? false;
      return force ? true : env.command === "serve";
    },
    enforce: "post",
    async config() {
      testExclude = await createTestExclude(options.istanbul);
    },
    configResolved(config) {
      viteIstanbulEnabled = resolveViteIstanbulEnabled(config, options.istanbul);
    },
    transform(srcCode, id, transformOpts) {
      if (
        !options.liveCoverageActive() ||
        !viteIstanbulEnabled ||
        transformOpts?.ssr ||
        id.startsWith(MODULE_PREFIX) ||
        id.startsWith(NULL_STRING)
      ) {
        return;
      }
      if (!isVueTemplateModuleId(id)) return;
      if (looksInstrumentedByIstanbul(srcCode)) return;
      if (!testExclude?.shouldInstrument(resolveExcludePath(id))) return;

      const instrumentFilename = resolveInstrumentFilename(id);
      const rawCombined = this.getCombinedSourcemap() as unknown as
        | RawSourceMap
        | null
        | undefined;
      const combinedSourceMap = rawCombined
        ? sanitizeSourceMap(rawCombined)
        : undefined;
      const code = instrumenter.instrumentSync(
        srcCode,
        instrumentFilename,
        combinedSourceMap
      );
      const map = instrumenter.lastSourceMap();
      return { code, map: map ?? undefined } as TransformResult;
    }
  };
}
