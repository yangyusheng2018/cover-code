import { Injectable } from '@nestjs/common';
import { joinPathInRepo, parseGithubOwnerRepo } from './coverage-source-hint';
import { parseUnifiedPatchToNewSideLineMarks } from './coverage-unified-diff-parse';
import type { Project } from '../projects/entities/project.entity';

const UA = 'cover-admin-branch-diff/1.0';
const FETCH_TIMEOUT_MS = 25_000;

type GithubCompareFile = {
  filename?: string;
  patch?: string | null;
};

type GithubCompareJson = {
  files?: GithubCompareFile[];
  message?: string;
};

@Injectable()
export class CoverageBranchDiffService {
  /**
   * 拉取 GitHub `baseBranch...headBranch` 对比，解析每个文件的 unified `patch`，
   * 得到仓库相对路径 →（新文件行号 → '+' | ' '）。
   */
  async fetchGithubCompareLineMarks(
    project: Project,
    baseBranch: string,
    headBranch: string,
  ): Promise<{
    pathToMarks: Map<string, Map<number, '+' | ' '>>;
    error?: string;
  }> {
    const gh = parseGithubOwnerRepo(project.gitUrl);
    if (!gh) {
      return {
        pathToMarks: new Map(),
        error:
          '增量视图暂仅支持 GitHub 仓库（https://github.com/... 或 git@github.com:owner/repo）。',
      };
    }
    const base = baseBranch.trim();
    const head = headBranch.trim();
    if (!base || !head) {
      return { pathToMarks: new Map(), error: '主分支或目标分支名为空' };
    }
    const spec = `${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
    const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/compare/${spec}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': UA,
    };
    const t = project.repoToken?.trim();
    if (t) {
      headers.Authorization = `Bearer ${t}`;
    }
    let res: Response;
    try {
      res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { pathToMarks: new Map(), error: `请求 GitHub compare 失败：${msg}` };
    }
    const rawText = await res.text();
    if (!res.ok) {
      let extra = rawText.slice(0, 400);
      try {
        const j = JSON.parse(rawText) as { message?: string };
        if (j?.message) {
          extra = j.message;
        }
      } catch {
        /* ignore */
      }
      return {
        pathToMarks: new Map(),
        error: `GitHub compare 返回 ${res.status}：${extra}`,
      };
    }
    let json: GithubCompareJson;
    try {
      json = JSON.parse(rawText) as GithubCompareJson;
    } catch {
      return { pathToMarks: new Map(), error: 'GitHub compare 响应非 JSON' };
    }
    const pathToMarks = new Map<string, Map<number, '+' | ' '>>();
    for (const f of json.files ?? []) {
      const fn = (f.filename ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
      const patch = f.patch;
      if (!fn || !patch) {
        continue;
      }
      const marks = parseUnifiedPatchToNewSideLineMarks(patch);
      if (marks.size === 0) {
        continue;
      }
      pathToMarks.set(fn, marks);
    }
    return { pathToMarks };
  }

  /** 将上报文件 path 转为与 GitHub compare `filename` 对齐的仓库路径 */
  repoPathForCoverageFile(project: Project, coverageFilePath: string): string {
    return joinPathInRepo(project.relativeDir, coverageFilePath).replace(/\\/g, '/');
  }
}
