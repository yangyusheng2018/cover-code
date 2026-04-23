/**
 * 为前端拉取源码提供 raw URL 提示；服务端代理拉取见 CoverageSourceFetchService。
 */
export interface SourceHintDto {
  /** 可直接 fetch 的原始文件 URL（仅 GitHub https 仓库且 commit 存在时） */
  rawFileUrl?: string;
  /** 当前覆盖率对应的提交 */
  commit: string | null;
  /** 相对仓库根的路径（含项目 relativeDir 前缀） */
  pathInRepo: string;
  gitUrl: string;
}

/** 将 project.relativeDir 与上报文件 path 拼成仓库内路径 */
export function joinPathInRepo(
  relativeDir: string | null | undefined,
  filePath: string,
): string {
  const f = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const r = (relativeDir ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!r) return f;
  return `${r}/${f}`;
}

/** 对 raw URL 的路径段分段编码，保留 `/` */
export function encodeRepoFilePathForUrl(pathInRepo: string): string {
  return pathInRepo
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/**
 * 按常见 Git 托管规则生成可尝试的 raw HTTP URL 列表（顺序即尝试顺序）。
 * 支持：GitHub（HTTPS / git@github.com）、Gitee、GitLab（含自建，按 /-/raw/ 规则）。
 */
export function listRawFileUrlCandidates(
  gitUrl: string,
  commit: string,
  pathInRepo: string,
): string[] {
  const c = commit.trim();
  const p = encodeRepoFilePathForUrl(pathInRepo);
  if (!c || !p) return [];

  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  };

  const raw = gitUrl.trim();

  const ghSsh = raw.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ghSsh) {
    const repo = ghSsh[2].replace(/\.git$/i, "");
    add(`https://raw.githubusercontent.com/${ghSsh[1]}/${repo}/${c}/${p}`);
  }

  let url: URL;
  try {
    url = new URL(raw.replace(/\.git$/i, ""));
  } catch {
    return urls;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return urls;
  }

  const host = url.hostname.toLowerCase();
  const parts = url.pathname
    .replace(/\/$/, "")
    .split("/")
    .filter(Boolean);
  if (parts.length < 2) return urls;

  if (host === "github.com") {
    const owner = parts[0];
    const repo = parts[1];
    add(`https://raw.githubusercontent.com/${owner}/${repo}/${c}/${p}`);
    return urls;
  }

  if (host === "gitee.com") {
    const owner = parts[0];
    const repo = parts[1];
    add(`https://gitee.com/${owner}/${repo}/raw/${c}/${p}`);
    return urls;
  }

  const base = `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  add(`${base}/-/raw/${c}/${p}`);

  return urls;
}

/** 解析 GitHub `owner/repo`（HTTPS 或 git@github.com），非 GitHub 返回 null */
export function parseGithubOwnerRepo(gitUrl: string): { owner: string; repo: string } | null {
  const s = gitUrl.trim();
  const ssh = s.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) {
    return { owner: ssh[1], repo: ssh[2].replace(/\.git$/i, "") };
  }
  try {
    const u = new URL(s.replace(/\.git$/i, ""));
    if (u.hostname.toLowerCase() !== "github.com") return null;
    const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/**
 * GitHub: https://github.com/org/repo(.git) → raw.githubusercontent.com/org/repo/ref/path
 */
export function buildSourceHint(
  gitUrl: string,
  gitCommit: string | null,
  pathInRepo: string,
): SourceHintDto {
  const commit = gitCommit?.trim() || null;
  const normalizedPath = pathInRepo.replace(/\\/g, "/").replace(/^\/+/, "");

  const hint: SourceHintDto = {
    commit,
    pathInRepo: normalizedPath,
    gitUrl: gitUrl.trim(),
  };

  if (!commit) {
    return hint;
  }

  const candidates = listRawFileUrlCandidates(gitUrl, commit, normalizedPath);
  if (candidates.length > 0) {
    hint.rawFileUrl = candidates[0];
  }
  return hint;
}
