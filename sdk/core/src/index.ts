import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/** 自 `fromDir` 起向父目录查找，用于判定 monorepo / Git 仓库根 */
const REPORT_PATH_ROOT_MARKERS = [".git", "pnpm-workspace.yaml", "pnpm-workspace.yml"];

/**
 * 从应用目录（如 Vite `config.root`）向上查找 `.git` 或 `pnpm-workspace.yaml` 等，
 * 得到用于上报相对路径的「仓库根」。找不到则退回 `fromDir`。
 */
export function resolveCoverageReportPathRoot(fromDir: string): string {
  let dir = path.resolve(fromDir);
  const root = path.parse(dir).root;
  for (;;) {
    for (const name of REPORT_PATH_ROOT_MARKERS) {
      try {
        if (fs.existsSync(path.join(dir, name))) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) break;
    dir = parent;
  }
  return path.resolve(fromDir);
}

/**
 * 在 `cwd` 下执行 `git` 解析当前分支与完整 commit SHA（失败时返回空字符串）。
 * 供构建插件在注入上报脚本前写入请求头。
 */
export function resolveGitUploadMeta(cwd: string): {
  branch: string;
  commit: string;
} {
  let branch = "";
  let commit = "";
  try {
    commit = execSync("git rev-parse HEAD", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    /* 非 Git 目录或 git 不可用 */
  }
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    /* 同上 */
  }
  return { branch, commit };
}

export type CoverageUploadClientOptions = {
  /**
   * 项目标识（与插件选项 `project_code` 对应）；随请求头发送 `X-Project-Code`，必填非空。
   */
  projectCode: string;
  /** 上报地址：完整 URL，需服务端支持 POST（如 http://127.0.0.1:9876/coverage） */
  endpoint: string;
  /** 上报间隔（毫秒）；过短会增加请求频率，默认 3000，最小 500 */
  intervalMs?: number;
  /** 与 fetch 合并的额外请求头（需可 JSON 序列化，如 Authorization） */
  headers?: Record<string, string>;
  /** Istanbul 写入的全局变量名，默认 __coverage__ */
  coverageVariable?: string;
  /**
   * 上报相对路径所相对的根目录（绝对路径）；POST 前会把 `__coverage__` 顶层键及每条 `path`
   * 改写为该根下的相对路径（统一为正斜杠）。省略时由插件从项目根向上解析 monorepo/Git 根。
   */
  reportPathRoot?: string;
  /**
   * 当前 Git 分支名，随请求头发送 `X-Git-Branch`。省略时在插件构建时于 `reportPathRoot` 下执行 `git` 解析。
   */
  gitBranch?: string;
  /**
   * 当前提交完整 SHA，随请求头发送 `X-Git-Commit`。省略时由插件从 Git 解析。
   */
  gitCommit?: string;
  /**
   * 与 cover-admin `branch_coverage.task_scope` 对齐：`full`（默认）或 `incremental`；
   * 上报时发送 `X-Coverage-Task-Scope`（会覆盖 `headers` 中同名键）。
   */
  taskScope?: "full" | "incremental";
};

/**
 * 生成注入到页面中的 IIFE 脚本：按间隔将全局覆盖率对象 JSON 后 POST 到 endpoint。
 */
export function buildCoverageUploadInlineScript(
  options: CoverageUploadClientOptions
): string {
  const projectCode = options.projectCode?.trim() ?? "";
  if (!projectCode) {
    throw new Error(
      "@istanbul-live/core: projectCode is required for coverage upload"
    );
  }
  const endpoint = options.endpoint;
  const intervalMs = Math.max(500, options.intervalMs ?? 3000);
  const coverageVariable = options.coverageVariable ?? "__coverage__";
  const reportPathRoot = options.reportPathRoot?.trim() ?? "";
  const branch = options.gitBranch?.trim() ?? "";
  const commit = options.gitCommit?.trim() ?? "";
  const ts = options.taskScope?.trim();
  const taskScopeHeader =
    ts === "incremental" || ts === "full"
      ? { "X-Coverage-Task-Scope": ts }
      : {};
  const headersJson = JSON.stringify({
    "Content-Type": "application/json",
    "X-Project-Code": projectCode,
    ...(branch ? { "X-Git-Branch": branch } : {}),
    ...(commit ? { "X-Git-Commit": commit } : {}),
    ...(options.headers ?? {}),
    ...taskScopeHeader
  });
  const rootJson = JSON.stringify(reportPathRoot);

  return `(()=>{var ENDPOINT=${JSON.stringify(endpoint)};var INTERVAL=${intervalMs};var CVAR=${JSON.stringify(coverageVariable)};var HDRS=${headersJson};var REPO_ROOT=${rootJson};function readCov(){try{var g=typeof globalThis!=="undefined"?globalThis:typeof window!=="undefined"?window:typeof self!=="undefined"?self:null;if(!g)return null;var c=g[CVAR];return c&&typeof c==="object"?c:null}catch(e){return null}}function normPath(p){var s=String(p).split("\\\\").join("/");while(s.indexOf("//")>=0)s=s.split("//").join("/");while(s.length>1&&s.charAt(s.length-1)==="/")s=s.slice(0,-1);return s}function repoRelKey(full,root){var f=normPath(full),r=normPath(root);if(!f||!r)return null;if(f.toLowerCase()===r.toLowerCase())return null;var rl=r.length;if(f.length<=rl||f.charAt(rl)!=="/")return null;if(f.slice(0,rl).toLowerCase()!==r.toLowerCase())return null;return f.slice(rl+1)}function covForUpload(c){if(!REPO_ROOT||!c)return c;var out={},k,nk,v;for(k in c){if(!Object.prototype.hasOwnProperty.call(c,k))continue;nk=repoRelKey(k,REPO_ROOT);if(nk==null)nk=k;v=c[k];if(nk!==k&&v&&typeof v==="object"){v=Object.assign({},v);if(typeof v.path==="string")v.path=nk}out[nk]=v}return out}function send(){var c=readCov();if(!c)return;var body=JSON.stringify(covForUpload(c));fetch(ENDPOINT,{method:"POST",headers:HDRS,body:body,keepalive:true,credentials:"omit",mode:"cors"}).catch(function(){})}send();setInterval(send,INTERVAL)})();`;
}
