import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { CoverageFile } from './entities/coverage-file.entity';
import { CoverageReport } from './entities/coverage-report.entity';
import {
  joinPathInRepo,
  listRawFileUrlCandidates,
  parseGithubOwnerRepo,
} from './coverage-source-hint';

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 6 * 1024 * 1024;

const UA = 'cover-admin-source-fetch/1.0';

/**
 * 私有仓库：按候选 URL 托管类型尝试不同鉴权头（顺序即尝试顺序）。
 */
function buildAuthHeaderAttempts(urlStr: string, token: string | null | undefined): Record<string, string>[] {
  const t = token?.trim();
  if (!t) {
    return [{ 'User-Agent': UA }];
  }
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return [{ 'User-Agent': UA, Authorization: `Bearer ${t}` }];
  }

  if (u.hostname === 'raw.githubusercontent.com') {
    return [
      { 'User-Agent': UA, Authorization: `Bearer ${t}` },
      { 'User-Agent': UA, Authorization: `token ${t}` },
    ];
  }

  if (urlStr.includes('/-/raw/')) {
    return [{ 'User-Agent': UA, 'PRIVATE-TOKEN': t }];
  }

  if (u.hostname === 'gitee.com') {
    return [
      { 'User-Agent': UA, Authorization: `token ${t}` },
      { 'User-Agent': UA, Authorization: `Bearer ${t}` },
    ];
  }

  return [{ 'User-Agent': UA, Authorization: `Bearer ${t}` }];
}

type GithubApiFile = {
  type?: string;
  encoding?: string;
  content?: string;
  download_url?: string | null;
  message?: string;
};

@Injectable()
export class CoverageSourceFetchService {
  constructor(
    @InjectRepository(CoverageReport)
    private readonly reportRepo: Repository<CoverageReport>,
    @InjectRepository(CoverageFile)
    private readonly fileRepo: Repository<CoverageFile>,
  ) {}

  /**
   * 按某次覆盖率上报中的文件路径，从 Git 托管 HTTP raw 拉取对应 commit 的源码正文。
   */
  async fetchSourceForFile(
    branchCoverageId: number,
    reportId: number | undefined,
    filePath: string,
    project: Project,
  ): Promise<{
    content: string;
    urlUsed: string;
    pathInRepo: string;
    commit: string;
    reportId: number;
  }> {
    const path = filePath.trim();
    if (!path) throw new BadRequestException('path 不能为空');
    if (path.includes('..')) throw new BadRequestException('非法路径');

    const report = await this.findReport(branchCoverageId, reportId);
    if (reportId && !report) {
      throw new NotFoundException('覆盖率上报记录不存在或不属于该分支覆盖率');
    }
    if (!report) {
      throw new NotFoundException('暂无覆盖率上报数据');
    }

    const row = await this.fileRepo.findOne({
      where: { reportId: report.id, path },
    });
    if (!row) {
      throw new NotFoundException('该次上报中不存在此文件路径');
    }

    const commit = report.gitCommit?.trim();
    if (!commit) {
      throw new BadRequestException(
        '当前上报未记录 git commit（上报时须带 X-Git-Commit），无法拉取对应版本源码',
      );
    }

    const pathInRepo = joinPathInRepo(project.relativeDir, path);
    const candidates = listRawFileUrlCandidates(project.gitUrl, commit, pathInRepo);
    if (candidates.length === 0) {
      throw new BadRequestException(
        '无法根据 gitUrl 生成拉取地址，请使用 GitHub / Gitee / GitLab 的 HTTPS 克隆地址（或 git@github.com:owner/repo）',
      );
    }

    const repoToken = project.repoToken;
    let lastNote = '';

    const gh = parseGithubOwnerRepo(project.gitUrl);
    if (gh && repoToken?.trim()) {
      const apiResult = await this.tryGithubContentsApi(
        gh.owner,
        gh.repo,
        commit,
        pathInRepo,
        repoToken.trim(),
      );
      if (apiResult.ok) {
        return {
          content: apiResult.content,
          urlUsed: apiResult.urlUsed,
          pathInRepo: pathInRepo.replace(/\\/g, '/').replace(/^\/+/, ''),
          commit,
          reportId: report.id,
        };
      }
      lastNote = apiResult.note;
    }

    for (const url of candidates) {
      const headerSets = buildAuthHeaderAttempts(url, repoToken);
      for (const headers of headerSets) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
          const res = await fetch(url, {
            signal: ctrl.signal,
            redirect: 'follow',
            headers,
          }).finally(() => clearTimeout(timer));

          if (res.status === 401 || res.status === 403) {
            lastNote = `${res.status} ${url}`;
            continue;
          }
          if (res.status === 404) {
            lastNote = `404 ${url}`;
            break;
          }
          if (!res.ok) {
            lastNote = `${res.status} ${url}`;
            break;
          }

          const buf = await res.arrayBuffer();
          if (buf.byteLength > MAX_BYTES) {
            throw new PayloadTooLargeException(
              `文件超过 ${MAX_BYTES} 字节上限，请改为本地查看或拆分仓库`,
            );
          }
          const content = new TextDecoder('utf-8', { fatal: false }).decode(buf);
          return {
            content,
            urlUsed: url,
            pathInRepo: pathInRepo.replace(/\\/g, '/').replace(/^\/+/, ''),
            commit,
            reportId: report.id,
          };
        } catch (e) {
          if (e instanceof PayloadTooLargeException) throw e;
          const msg = e instanceof Error ? e.message : String(e);
          lastNote = `${msg} (${url})`;
        }
      }
    }

    throw new BadGatewayException(
      `无法从远程仓库拉取源码（请检查 gitUrl、relativeDir、commit、路径；私有仓库请在项目中配置仓库 token）。最近尝试：${lastNote || '（无）'}`,
    );
  }

  /**
   * GitHub 私有仓库：raw.githubusercontent.com 对部分 PAT 不稳定，优先走 REST Contents API。
   */
  private async tryGithubContentsApi(
    owner: string,
    repo: string,
    commit: string,
    pathInRepo: string,
    token: string,
  ): Promise<
    | { ok: true; content: string; urlUsed: string }
    | { ok: false; note: string }
  > {
    const normalized = pathInRepo.replace(/\\/g, '/').replace(/^\/+/, '');
    const pathParam = normalized
      .split('/')
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${pathParam}?ref=${encodeURIComponent(commit)}`;

    const authAttempts: Record<string, string>[] = [
      { Authorization: `Bearer ${token}` },
      { Authorization: `token ${token}` },
    ];

    let last = '';
    for (const auth of authAttempts) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        const res = await fetch(apiUrl, {
          signal: ctrl.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': UA,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...auth,
          },
        }).finally(() => clearTimeout(timer));

        const text = await res.text();
        let json: GithubApiFile | GithubApiFile[] | null = null;
        try {
          json = JSON.parse(text) as GithubApiFile | GithubApiFile[];
        } catch {
          last = `GitHub API ${res.status}（非 JSON） ${apiUrl}`;
          continue;
        }

        if (!res.ok) {
          const msg =
            !Array.isArray(json) && json && typeof json === 'object' && 'message' in json
              ? String((json as GithubApiFile).message ?? '')
              : '';
          last = `GitHub API ${res.status}${msg ? `: ${msg}` : ''} ${apiUrl}`;
          continue;
        }

        if (Array.isArray(json)) {
          return {
            ok: false,
            note: `GitHub API 路径为目录而非文件（请核对 path / relativeDir） ${apiUrl}`,
          };
        }

        if (json.type && json.type !== 'file') {
          return {
            ok: false,
            note: `GitHub API 非文件节点 type=${json.type} ${apiUrl}`,
          };
        }

        if (json.encoding === 'base64' && json.content) {
          const rawB64 = json.content.replace(/\n/g, '');
          const buf = Buffer.from(rawB64, 'base64');
          if (buf.byteLength > MAX_BYTES) {
            return {
              ok: false,
              note: `GitHub API 文件超过 ${MAX_BYTES} 字节`,
            };
          }
          return {
            ok: true,
            content: buf.toString('utf-8'),
            urlUsed: apiUrl,
          };
        }

        if (json.download_url) {
          for (const authDl of authAttempts) {
            try {
              const c = new AbortController();
              const tmr = setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
              const raw = await fetch(json.download_url, {
                signal: c.signal,
                headers: { 'User-Agent': UA, ...authDl },
              }).finally(() => clearTimeout(tmr));
              if (!raw.ok) {
                last = `GitHub download_url ${raw.status}`;
                continue;
              }
              const buf = await raw.arrayBuffer();
              if (buf.byteLength > MAX_BYTES) {
                return { ok: false, note: `GitHub 下载超过 ${MAX_BYTES} 字节` };
              }
              return {
                ok: true,
                content: new TextDecoder('utf-8', { fatal: false }).decode(buf),
                urlUsed: json.download_url,
              };
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              last = `GitHub download_url ${msg}`;
            }
          }
          continue;
        }

        last = `GitHub API 无 content/download_url ${apiUrl}`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        last = `GitHub API ${msg}`;
      }
    }

    return { ok: false, note: last || 'GitHub Contents API 失败' };
  }

  private async findReport(
    branchCoverageId: number,
    reportId?: number,
  ): Promise<CoverageReport | null> {
    if (reportId) {
      return this.reportRepo.findOne({
        where: { id: reportId, branchCoverageId },
      });
    }
    const rows = await this.reportRepo.find({
      where: { branchCoverageId },
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: 1,
    });
    return rows[0] ?? null;
  }
}
