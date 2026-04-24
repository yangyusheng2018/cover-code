import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchCoverage } from '../branch-coverages/entities/branch-coverage.entity';
import { Project } from '../projects/entities/project.entity';
import { CoverageFile } from './entities/coverage-file.entity';
import { CoverageReport } from './entities/coverage-report.entity';
import { buildCoverageFileTree } from './coverage-path-tree';
import {
  buildSourceHint,
  joinPathInRepo,
} from './coverage-source-hint';
import {
  lineCoverageRatePercent,
  mergeFileStats,
  summarizeLineDetails,
} from './coverage-line-stats';
import type { CoverageLineDetail } from './coverage-line-types';
import { CoverageBranchDiffService } from './coverage-branch-diff.service';

@Injectable()
export class CoverageReportDetailService {
  constructor(
    @InjectRepository(CoverageReport)
    private readonly reportRepo: Repository<CoverageReport>,
    @InjectRepository(CoverageFile)
    private readonly fileRepo: Repository<CoverageFile>,
    private readonly branchDiff: CoverageBranchDiffService,
  ) {}

  /**
   * 某条分支覆盖率配置下，指定或「最近更新时间」最新一次上报的详情（汇总 + 文件树 + 行级数据）。
   * 其它 commit 的上报仍保存在库中，仅默认取最新一条；传 `reportId` 可查看历史。
   */
  async getDetailForBranchCoverage(
    bc: BranchCoverage & { project: Project },
    reportId: number | undefined,
    includeLineDetails: boolean,
    view?: 'full' | 'incremental',
  ) {
    const report = await this.findReport(bc.id, reportId);
    if (reportId && !report) {
      throw new NotFoundException('覆盖率上报记录不存在或不属于该分支覆盖率');
    }
    if (!report) {
      return {
        empty: true as const,
        message: '暂无覆盖率上报数据',
        branchCoverage: this.branchCoverageBlock(bc),
        report: null,
        summary: null,
        fileTree: buildCoverageFileTree([]),
        files: [],
        visualizationHint: this.visualizationHint(),
      };
    }

    const files = await this.fileRepo.find({
      where: { reportId: report.id },
      order: { path: 'ASC' },
    });

    const includeDetailsForMap =
      view === 'incremental' ? true : includeLineDetails !== false;
    const mapped = this.mapFiles(bc.project, report, files, includeDetailsForMap);

    if (view !== 'incremental') {
      const paths = files.map((f) => f.path);
      const fileTree = buildCoverageFileTree(paths);
      const perStats = mapped.map((f) => f.stats);
      const total = mergeFileStats(perStats);
      const filesOut = this.stripLineDetailsIfNeeded(mapped, includeLineDetails);
      return {
        empty: false as const,
        branchCoverage: this.branchCoverageBlock(bc),
        report: {
          id: report.id,
          gitCommit: report.gitCommit,
          coverageMode: report.coverageMode ?? 'full',
          parentCommit: report.parentCommit,
          diffBaseCommit: report.diffBaseCommit,
          fileCount: report.fileCount,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
        summary: {
          coverageRatePercent: lineCoverageRatePercent(total),
          totalFiles: files.length,
          linesInstrumentOk: total.instrumentOk,
          linesCovered: total.covered,
          linesUncovered: total.uncovered,
          linesNone: total.none,
          linesFail: total.fail,
        },
        fileTree,
        files: filesOut,
        visualizationHint: this.visualizationHint(),
      };
    }

    const mainBranch = bc.project.mainBranch?.trim() || 'main';
    const testBranch = bc.testBranch?.trim() || '';
    const { pathToMarks, error } = await this.branchDiff.fetchGithubCompareLineMarks(
      bc.project,
      mainBranch,
      testBranch,
    );

    const diffContext = {
      baseBranch: mainBranch,
      headBranch: testBranch,
      provider: 'github' as const,
      error: error ?? null,
    };

    const mappedInc: Array<{
      path: string;
      stats: ReturnType<typeof summarizeLineDetails>;
      lineDetails?: CoverageLineDetail[];
      sourceHint: ReturnType<typeof buildSourceHint>;
    }> = [];

    for (const row of mapped) {
      const rp = this.branchDiff.repoPathForCoverageFile(bc.project, row.path);
      const marks = pathToMarks.get(rp);
      if (!marks?.size) {
        continue;
      }
      const details = row.lineDetails ?? [];
      let filtered: CoverageLineDetail[] = details
        .filter((d) => marks.has(d.line))
        .map((d) => ({
          ...d,
          diffMark: marks.get(d.line) ?? ' ',
        }));

      if (!filtered.length) {
        filtered = [...marks.keys()]
          .sort((a, b) => a - b)
          .map((line) => ({
            line,
            inScope: true,
            instrument: 'none' as const,
            covered: null,
            diffMark: marks.get(line) ?? ' ',
          }));
      }

      const stats = summarizeLineDetails(
        filtered.map(({ diffMark: _dm, ...rest }) => rest),
      );
      const outRow: (typeof mappedInc)[0] = {
        path: row.path,
        stats,
        sourceHint: row.sourceHint,
      };
      if (includeLineDetails !== false) {
        outRow.lineDetails = filtered;
      }
      mappedInc.push(outRow);
    }

    const pathsInc = mappedInc.map((f) => f.path);
    const fileTreeInc = buildCoverageFileTree(pathsInc);
    const perStatsInc = mappedInc.map((f) => f.stats);
    const totalInc = mergeFileStats(perStatsInc);

    return {
      empty: false as const,
      branchCoverage: this.branchCoverageBlock(bc),
      report: {
        id: report.id,
        gitCommit: report.gitCommit,
        coverageMode: report.coverageMode ?? 'full',
        parentCommit: report.parentCommit,
        diffBaseCommit: report.diffBaseCommit,
        fileCount: report.fileCount,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      },
      summary: {
        coverageRatePercent: lineCoverageRatePercent(totalInc),
        totalFiles: mappedInc.length,
        linesInstrumentOk: totalInc.instrumentOk,
        linesCovered: totalInc.covered,
        linesUncovered: totalInc.uncovered,
        linesNone: totalInc.none,
        linesFail: totalInc.fail,
      },
      fileTree: fileTreeInc,
      files: mappedInc,
      diffContext,
      visualizationHint: this.visualizationHint(),
    };
  }

  private stripLineDetailsIfNeeded<
    T extends { lineDetails?: CoverageLineDetail[] },
  >(rows: T[], includeLineDetails: boolean): T[] {
    if (includeLineDetails !== false) {
      return rows;
    }
    return rows.map((r) => {
      const { lineDetails: _ld, ...rest } = r;
      return rest as T;
    });
  }

  private visualizationHint() {
    return {
      lineDetail: {
        none: '无 statement / 不可执行行（未插桩）',
        okCovered: '插桩成功且已覆盖',
        okUncovered: '插桩成功但未覆盖',
        fail: '插桩失败（由上报 meta.instrumentFailures 标记）',
        carried: '由父提交继承的已覆盖（carried=true）',
      },
      sourceNote:
        '服务端不持久化源码。可选用 POST /api/branch-coverages/source-file 由后端代拉 HTTP raw（与 sourceHint 同源规则）；或自行请求 sourceHint.rawFileUrl 后按行号与 lineDetails 对齐着色。',
    };
  }

  private branchCoverageBlock(bc: BranchCoverage & { project: Project }) {
    return {
      id: bc.id,
      projectId: bc.projectId,
      testBranch: bc.testBranch,
      projectCode: bc.project.code,
      projectName: bc.project.name,
      gitUrl: bc.project.gitUrl,
      mainBranch: bc.project.mainBranch,
      relativeDir: bc.project.relativeDir,
      hasRepoToken: !!(bc.project.repoToken && bc.project.repoToken.trim()),
    };
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

  private mapFiles(
    project: Project,
    report: CoverageReport,
    files: CoverageFile[],
    includeLineDetails: boolean,
  ) {
    const commit = report.gitCommit;
    const out: Array<{
      path: string;
      stats: ReturnType<typeof summarizeLineDetails>;
      lineDetails?: CoverageLineDetail[];
      sourceHint: ReturnType<typeof buildSourceHint>;
    }> = [];

    for (const f of files) {
      const details = f.lineDetails ?? [];
      const stats = summarizeLineDetails(details);
      const pathInRepo = joinPathInRepo(project.relativeDir, f.path);
      const sourceHint = buildSourceHint(project.gitUrl, commit, pathInRepo);

      const row: (typeof out)[0] = {
        path: f.path,
        stats,
        sourceHint,
      };
      if (includeLineDetails) {
        row.lineDetails = details;
      }
      out.push(row);
    }
    return out;
  }
}
