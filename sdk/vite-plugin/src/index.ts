import path from "node:path";
import {
  buildCoverageUploadInlineScript,
  resolveCoverageReportPathRoot,
  resolveGitUploadMeta
} from "istanbul-live-core";
import type { CoverageUploadClientOptions } from "istanbul-live-core";
import type { Plugin } from "vite";
import * as VitePluginIstanbul from "vite-plugin-istanbul";
import type { IstanbulPluginOptions } from "vite-plugin-istanbul";

import { createVueTemplateInstrumentPlugin } from "./vue-sfc-template-instrument.js";

export type { IstanbulPluginOptions };

const createViteIstanbul = VitePluginIstanbul.default as unknown as (
  opts?: IstanbulPluginOptions
) => Plugin;

/** 与 `istanbulLiveVitePlugin` 的 `project_code` 合并后传入上报逻辑 */
export type IstanbulLiveVitePluginUploadOptions = Omit<
  CoverageUploadClientOptions,
  "projectCode"
>;

const ISTANBUL_OPTION_KEYS = [
  "include",
  "exclude",
  "extension",
  "requireEnv",
  "cypress",
  "checkProd",
  "forceBuildInstrument",
  "cwd",
  "nycrcPath",
  "generatorOpts",
  "onCover"
] as const satisfies readonly (keyof IstanbulPluginOptions)[];

function pickIstanbulPluginOptions(
  opts: IstanbulLiveVitePluginOptions
): IstanbulPluginOptions {
  const out: IstanbulPluginOptions = {};
  for (const k of ISTANBUL_OPTION_KEYS) {
    if (opts[k] !== undefined) {
      (out as Record<string, unknown>)[k] = opts[k];
    }
  }
  return out;
}

/**
 * 是否启用本包负责的插桩与上报。
 * - 传入 `boolean` 时仅由该值决定（推荐在 `vite.config` 里用 `loadEnv` / `defineConfig(({ mode }))` 等自行计算）。
 * - 未传入时兼容旧配置：等价于 `(enabled ?? true) && (instrument ?? true)`。
 */
function isCoverageActive(options: IstanbulLiveVitePluginOptions): boolean {
  if (typeof options.coverage === "boolean") return options.coverage;
  return (options.enabled ?? true) && (options.instrument ?? true);
}

function mergeIstanbulOptions(
  options: IstanbulLiveVitePluginOptions
): IstanbulPluginOptions {
  const picked = pickIstanbulPluginOptions(options);
  return {
    checkProd: true,
    forceBuildInstrument: true,
    ...picked
  };
}

/**
 * 在 `vite-plugin-istanbul` 选项之上，增加本包的上报等字段。
 * 凡属于 `IstanbulPluginOptions` 的键会原样传给 `vite-plugin-istanbul`。
 */
export type IstanbulLiveVitePluginOptions = IstanbulPluginOptions & {
  /**
   * 项目代码/标识，必填（在启用覆盖率时）；随上报请求头发送 `X-Project-Code`。
   */
  project_code: string;
  /**
   * 是否启用插桩与上报。应在应用层根据环境自行传入（如 `defineConfig(({ mode }) => { const env = loadEnv(...); return { ... }; })`），
   * 插件内不再根据 Vite `mode` / 白名单做隐含判断。
   */
  coverage?: boolean;
  /**
   * 未设置 `coverage` 时参与回退判断：`(enabled ?? true) && (instrument ?? true)`。
   * 新代码请优先只传 `coverage`。
   */
  enabled?: boolean;
  instrument?: boolean;
  /** @deprecated 已由应用层 `coverage` 取代；传入无效 */
  coverageModes?: string[];
  /** 覆盖率实时上报；`projectCode` 由 `project_code` 提供 */
  upload?: IstanbulLiveVitePluginUploadOptions;
  /** 已废弃：由 `vite-plugin-istanbul` 负责插桩，忽略 */
  injectStatementMapSources?: boolean;
  /** 已废弃：`vite-plugin-istanbul` 使用合并 source map，忽略 */
  remapCoverageToOriginalSource?: boolean;
  /**
   * 是否为 Vue SFC 的 `?vue&type=template` 虚拟块补插桩（在 `vite-plugin-istanbul` 之后执行）。
   * 默认开启，用于保证模板编译出的 render 函数带上分支/语句计数器。
   */
  vueTemplateCoverage?: boolean;
};

function createUploadPlugin(
  getOptions: () => IstanbulLiveVitePluginOptions,
  state: { root: string; uploadSnippet: string }
): Plugin {
  return {
    name: "istanbul-live",
    configResolved(config) {
      const options = getOptions();
      state.root = config.root || options.cwd || process.cwd();
      const active = isCoverageActive(options);
      const cmd = config.command;
      const shouldInstrument =
        active && (cmd === "serve" || cmd === "build");
      const shouldInjectUpload =
        active &&
        (cmd === "serve" || cmd === "build" || cmd === "preview");
      const projectCode = options.project_code?.trim() ?? "";
      if (shouldInstrument && !projectCode) {
        throw new Error(
          "[istanbul-live] project_code is required when coverage is enabled"
        );
      }
      const upload = options.upload;
      const endpoint = upload?.endpoint?.trim();
      if (!shouldInjectUpload || !projectCode || !upload || !endpoint) {
        state.uploadSnippet = "";
        return;
      }
      const reportRoot =
        upload.reportPathRoot != null && upload.reportPathRoot !== ""
          ? upload.reportPathRoot
          : resolveCoverageReportPathRoot(state.root);
      const resolvedReportRoot = path.resolve(reportRoot);
      const gitMeta = resolveGitUploadMeta(resolvedReportRoot);
      state.uploadSnippet = buildCoverageUploadInlineScript({
        ...upload,
        endpoint,
        projectCode,
        reportPathRoot: resolvedReportRoot,
        gitBranch:
          upload.gitBranch !== undefined ? upload.gitBranch : gitMeta.branch,
        gitCommit:
          upload.gitCommit !== undefined ? upload.gitCommit : gitMeta.commit
      });
    },
    transformIndexHtml(html) {
      if (!state.uploadSnippet) return html;
      return {
        html,
        tags: [
          {
            tag: "script",
            children: state.uploadSnippet,
            injectTo: "head-prepend"
          }
        ]
      };
    }
  };
}

/**
 * 基于 `vite-plugin-istanbul` 的覆盖率插件：`IstanbulPluginOptions` 字段会透传；
 * 是否启用由应用层 `coverage`（或回退的 `enabled`/`instrument`）决定。
 *
 * 返回 **插件数组**（`vite-plugin-istanbul`、可选的 Vue `type=template` 补插桩、`istanbul-live` 上报），
 * 请在 `vite.config` 中展开：`plugins: [vue(), ...istanbulLiveVitePlugin(opts)]`。
 * （若在 `config` 钩子里再 `return { plugins: [istanbul] }`，Vite 可能不会把嵌套插件合并进最终管线，导致插桩不生效。）
 */
export function istanbulLiveVitePlugin(
  options: IstanbulLiveVitePluginOptions
): Plugin[] {
  const state = { root: options.cwd ?? process.cwd(), uploadSnippet: "" };
  const getOptions = () => options;
  const uploadPlugin = createUploadPlugin(getOptions, state);

  if (!isCoverageActive(options)) {
    return [uploadPlugin];
  }

  const mergedIstanbul = mergeIstanbulOptions(options);
  const istanbul = createViteIstanbul(mergedIstanbul);
  const vueTemplate =
    options.vueTemplateCoverage === false
      ? null
      : createVueTemplateInstrumentPlugin({
          istanbul: mergedIstanbul,
          liveCoverageActive: () => isCoverageActive(options)
        });

  return vueTemplate
    ? [istanbul, vueTemplate, uploadPlugin]
    : [istanbul, uploadPlugin];
}
