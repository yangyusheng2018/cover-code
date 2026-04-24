import path from "node:path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import type { Compiler, RuleSetRule, WebpackPluginInstance } from "webpack";
import {
  buildCoverageUploadInlineScript,
  resolveCoverageReportPathRoot,
  resolveGitUploadMeta,
} from "istanbul-live-core";
import type { CoverageUploadClientOptions } from "istanbul-live-core";

export type IstanbulLiveWebpackPluginUploadOptions = Omit<
  CoverageUploadClientOptions,
  "projectCode"
>;

/**
 * 与 `webpack-plugin-istanbul` 中传给 `createTestExclude` 的字段一致（`dist/utils.d.ts`）。
 * 若上游增加选项，可在此补充 `ISTANBUL_OPTION_KEYS`。
 */
export type WebpackPluginIstanbulUserOptions = {
  include?: string | string[];
  exclude?: string | string[];
  extension?: string | string[];
  cwd?: string;
};

export type IstanbulLiveWebpackPluginOptions =
  WebpackPluginIstanbulUserOptions & {
    project_code: string;
    /**
     * 是否启用插桩与（可选）上报；**仅配置布尔**，本插件不读环境变量。
     * 与 `coverage` 二选一即可；若两者都传，以 `coverage` 为准。
     * 未传 `coverage` 与 `enableCoverage`、或二者均非布尔时，视为关闭。
     */
    enableCoverage?: boolean;
    /**
     * 与 `enableCoverage` 同义；若两者都传，以此为准。
     */
    coverage?: boolean;
    /** 可选；有 `endpoint` 时才向 HTML 注入定时上报脚本 */
    upload?: IstanbulLiveWebpackPluginUploadOptions;
    /**
     * 仅 Webpack：本包注入的 istanbul-loader 所用的 filesystem `include` 根目录（绝对路径或相对于 `context`）。
     * 默认 `["<context>/src"]`。源码不在 `src` 下时请与 `include` glob 一并显式配置。
     */
    instrumentRoots?: string | string[];
  } & Record<string, unknown>;

const ISTANBUL_OPTION_KEYS = [
  "include",
  "exclude",
  "extension",
  "cwd",
] as const satisfies readonly (keyof WebpackPluginIstanbulUserOptions)[];

/**
 * 是否启用：仅看 `coverage` / `enableCoverage` 的布尔值（不读环境变量、不看 webpack `mode`）。
 * 优先 `coverage`；都未传或非布尔则关闭。
 */
function shouldActivatePlugin(opts: IstanbulLiveWebpackPluginOptions): boolean {
  if (typeof opts.coverage === "boolean") return opts.coverage;
  if (typeof opts.enableCoverage === "boolean") return opts.enableCoverage;
  return false;
}

function pickWebpackPluginIstanbulOptions(
  opts: IstanbulLiveWebpackPluginOptions,
  context: string,
): WebpackPluginIstanbulUserOptions {
  const raw = opts as Record<string, unknown>;
  const out: WebpackPluginIstanbulUserOptions = {};
  for (const key of ISTANBUL_OPTION_KEYS) {
    if (raw[key] !== undefined) {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }
  if (out.cwd === undefined) {
    out.cwd = (opts.cwd as string | undefined) ?? context;
  }
  if (out.include === undefined) {
    out.include = ["src/**/*"];
  }
  return out;
}

/**
 * Webpack `module.rules[].include`：istanbul-loader 默认挂到 `<context>/src`。
 */
function defaultFilesystemIncludeRoots(context: string): string[] {
  return [path.join(context, "src")];
}

/**
 * 基于 **`webpack-plugin-istanbul`** 的 test-exclude 选项，用本包 **`istanbul-loader`**
 *（把 Webpack 传入的 inputSourceMap 交给 `istanbul-lib-instrument`；官方 `webpack-plugin-istanbul/loader` 不传第三参，无法产生 `inputSourceMap`）。
 *
 * 让 window.__coverage__[path].inputSourceMap 存在、便于 POST 给后端：
 *
 * - devtool：勿用 false；开发可用 eval-source-map 或 cheap-module-source-map；要独立 .map 可用 source-map。
 * - vue-loader：options.sourceMap 为 true，保证 ?vue&type=script 等子模块由 selectBlock 传出 map。
 * - 其它 babel/ts 等 loader：须在链路上 callback 传入 map。
 * - 插件 cwd、include 与项目一致；源码不在 src 时用 instrumentRoots。
 * - `__coverage__` 的 key 对 .vue 子块为「resourcePath + resourceQuery」（如带 `?vue&type=script`），避免与裸入口互相覆盖；裸入口仍透传不插桩。
 *
 * 是否启用：仅由 **`coverage` / `enableCoverage`（布尔）** 决定。配置了 **`upload.endpoint`** 时经 html-webpack-plugin 注入上报脚本。
 */
export class IstanbulLiveWebpackPlugin implements WebpackPluginInstance {
  constructor(private readonly options: IstanbulLiveWebpackPluginOptions) {}

  apply(compiler: Compiler): void {
    const opts = this.options;
    if (!shouldActivatePlugin(opts)) return;

    const context = compiler.options.context || process.cwd();
    const projectCode = opts.project_code?.trim() ?? "";
    if (!projectCode) {
      throw new Error(
        "[istanbul-live] project_code is required when IstanbulLiveWebpackPlugin is enabled (coverage / enableCoverage)",
      );
    }

    const istanbulOpts = pickWebpackPluginIstanbulOptions(opts, context);
    const istanbulLoader = require.resolve("./istanbul-loader.js");
    const roots =
      opts.instrumentRoots != null
        ? (Array.isArray(opts.instrumentRoots)
            ? opts.instrumentRoots
            : [opts.instrumentRoots]
          ).map((p) => (path.isAbsolute(p) ? p : path.join(context, p)))
        : defaultFilesystemIncludeRoots(context);

    compiler.hooks.afterEnvironment.tap("istanbul-live:istanbul-loader", () => {
      const rule: RuleSetRule = {
        test: /\.([cm]?[jt]sx?|vue)$/,
        enforce: "post",
        exclude: /node_modules/,
        include: roots,
        use: [
          {
            loader: istanbulLoader,
            options: istanbulOpts,
          },
        ],
      };
      compiler.options.module.rules.unshift(rule);
    });

    const upload = opts.upload;
    const endpoint = upload?.endpoint?.trim();
    if (!upload || !endpoint) return;

    const reportRoot =
      upload.reportPathRoot != null && upload.reportPathRoot !== ""
        ? upload.reportPathRoot
        : resolveCoverageReportPathRoot(context);
    const resolvedReportRoot = path.resolve(reportRoot);
    const git = resolveGitUploadMeta(resolvedReportRoot);
    const snippet = buildCoverageUploadInlineScript({
      ...upload,
      endpoint,
      projectCode,
      reportPathRoot: resolvedReportRoot,
      gitBranch: upload.gitBranch !== undefined ? upload.gitBranch : git.branch,
      gitCommit: upload.gitCommit !== undefined ? upload.gitCommit : git.commit,
    });

    compiler.hooks.compilation.tap("istanbul-live:html", (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
        "istanbul-live:inject",
        (data, cb) => {
          data.assetTags.scripts.unshift({
            tagName: "script",
            voidTag: false,
            attributes: {},
            meta: { plugin: "istanbul-live" },
            innerHTML: snippet,
          });
          cb(null, data);
        },
      );
    });
  }
}
