import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Repository } from "typeorm";
import { BranchCoverage } from "../branch-coverages/entities/branch-coverage.entity";
import { Project } from "../projects/entities/project.entity";
import { CoverageFile } from "./entities/coverage-file.entity";
import { CoverageReport } from "./entities/coverage-report.entity";
import {
  mergeParentLineDetails,
  lineDetailsToHitArrays,
} from "./coverage-line-merge";
import type { CoverageLineDetail } from "./coverage-line-types";
import { isWrappedPayload, normalizeUploadMeta } from "./coverage-upload-meta";
import { parseIstanbulFileToLineDetails } from "./istanbul-line-coverage";
import { remapIstanbulPayloadToOriginalSources } from "./coverage-sourcemap-remap";

export interface CoverageIngestParams {
  body: Record<string, unknown>;
  projectCode?: string;
  gitBranch?: string;
  gitCommit?: string;
  parentCommitHeader?: string;
  coverageModeHeader?: string;
  diffBaseCommitHeader?: string;
}

@Injectable()
export class CoverageService {
  private readonly logger = new Logger(CoverageService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(BranchCoverage)
    private readonly bcRepo: Repository<BranchCoverage>,
    @InjectRepository(CoverageReport)
    private readonly reportRepo: Repository<CoverageReport>,
    @InjectRepository(CoverageFile)
    private readonly fileRepo: Repository<CoverageFile>,
    private readonly dataSource: DataSource,
  ) {}

  async ingest(params: CoverageIngestParams) {
    const {
      body,
      projectCode,
      gitBranch,
      gitCommit,
      parentCommitHeader,
      coverageModeHeader,
      diffBaseCommitHeader,
    } = params;

    if (!projectCode || !gitBranch) {
      throw new BadRequestException(
        "缺少请求头 X-Project-Code 或 X-Git-Branch",
      );
    }

    const project = await this.projectRepo.findOne({
      where: { code: projectCode.trim() },
    });
    if (!project) {
      return { success: false as const, message: "无此项目或者分支" };
    }
    /** 仅用项目 + 测试分支匹配唯一一条 branch_coverage */
    const branch = gitBranch.trim();
    const bc = await this.bcRepo.findOne({
      where: { projectId: project.id, testBranch: branch },
    });
    if (!bc) {
      return { success: false as const, message: "无此项目或者分支" };
    }

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      throw new BadRequestException("请求体不能为空");
    }

    const istanbulPayload = isWrappedPayload(body)
      ? (body.payload as Record<string, unknown>)
      : body;
    const rawMeta = isWrappedPayload(body) ? body.meta : undefined;

    let workingPayload = istanbulPayload;
    try {
      const remapped =
        await remapIstanbulPayloadToOriginalSources(istanbulPayload);
      if (Object.keys(remapped).length > 0) {
        workingPayload = remapped;
      }
    } catch (err) {
      this.logger.warn(
        `source map 重映射失败，已回退为原始 Istanbul 数据: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const meta = normalizeUploadMeta(rawMeta, {
      parentCommit: parentCommitHeader,
      coverageMode: coverageModeHeader,
      diffBaseCommit: diffBaseCommitHeader,
    });

    const gc = this.normCommit(gitCommit);
    const parentCommitNorm = this.normCommit(meta.parentCommit ?? undefined);

    const parentFilesMap = new Map<string, CoverageLineDetail[]>();
    let parentResolved = false;
    if (parentCommitNorm) {
      const parentReport = await this.reportRepo.findOne({
        where: { branchCoverageId: bc.id, gitCommit: parentCommitNorm },
      });
      if (parentReport) {
        parentResolved = true;
        const pfs = await this.fileRepo.find({
          where: { reportId: parentReport.id },
        });
        for (const f of pfs) {
          parentFilesMap.set(f.path, f.lineDetails);
        }
      }
    }

    /** 同一 (branch_coverage, git_commit) 已入库快照：用于多次上报时「粘性」合并，避免关页后 __coverage__ 归零再次上报冲掉历史已覆盖行 */
    const stickySameCommitMap = new Map<string, CoverageLineDetail[]>();
    const stickyWhere =
      gc === null
        ? { branchCoverageId: bc.id, gitCommit: IsNull() }
        : { branchCoverageId: bc.id, gitCommit: gc };
    const stickyReport = await this.reportRepo.findOne({ where: stickyWhere });
    if (stickyReport) {
      const stickyFiles = await this.fileRepo.find({
        where: { reportId: stickyReport.id },
      });
      for (const f of stickyFiles) {
        stickySameCommitMap.set(f.path, f.lineDetails);
      }
    }

    type Row = {
      path: string;
      lineDetails: CoverageLineDetail[];
      coveredLines: number[];
      uncoveredLines: number[];
    };
    const rows: Row[] = [];

    for (const [pathKey, fileCov] of Object.entries(workingPayload)) {
      if (typeof fileCov !== "object" || fileCov === null) continue;

      const innerPath =
        typeof (fileCov as { path?: unknown }).path === "string"
          ? (fileCov as { path: string }).path.trim()
          : "";
      const path = (innerPath || pathKey).slice(0, 4096);

      const resetLines = new Set(
        meta.fileChanges?.[path]?.resetLines ??
          meta.fileChanges?.[pathKey]?.resetLines ??
          [],
      );
      const incScope =
        meta.incrementalScopes?.[path] ?? meta.incrementalScopes?.[pathKey];
      const mode = meta.mode ?? "full";
      const incrementalLineSet =
        mode === "incremental" && incScope?.length ? new Set(incScope) : null;
      const instFail =
        meta.instrumentFailures?.[path] ?? meta.instrumentFailures?.[pathKey];
      const maxSourceLine =
        meta.maxSourceLines?.[path] ?? meta.maxSourceLines?.[pathKey];

      const fresh = parseIstanbulFileToLineDetails(fileCov, {
        mode,
        incrementalLineSet,
        instrumentFailLines: instFail?.length ? new Set(instFail) : null,
        maxSourceLine,
      });
      if (!fresh?.length) continue;

      let lineDetails = fresh;
      const stickyPrev = stickySameCommitMap.get(path);
      if (stickyPrev?.length) {
        lineDetails = mergeParentLineDetails(
          lineDetails,
          stickyPrev,
          new Set(),
        );
      }
      const parentDetail = parentFilesMap.get(path);
      if (parentCommitNorm && parentDetail?.length) {
        lineDetails = mergeParentLineDetails(
          lineDetails,
          parentDetail,
          resetLines,
        );
      }

      const { coveredLines, uncoveredLines } =
        lineDetailsToHitArrays(lineDetails);
      rows.push({ path, lineDetails, coveredLines, uncoveredLines });
    }

    if (rows.length === 0) {
      throw new BadRequestException("未解析到有效的 Istanbul 覆盖率数据");
    }

    const diffBaseNorm = this.normCommit(meta.diffBaseCommit ?? undefined);

    return this.dataSource.transaction(async (em) => {
      const existingList = await em.find(CoverageReport, {
        where:
          gc === null
            ? { branchCoverageId: bc.id, gitCommit: IsNull() }
            : { branchCoverageId: bc.id, gitCommit: gc },
        order: { id: "ASC" },
      });

      let report: CoverageReport;
      let replaced: boolean;

      if (existingList.length > 0) {
        replaced = true;
        const [primary, ...dupes] = existingList;
        for (const d of dupes) {
          await em.delete(CoverageFile, { reportId: d.id });
          await em.remove(d);
        }
        await em.delete(CoverageFile, { reportId: primary.id });
        primary.fileCount = rows.length;
        primary.gitCommit = gc;
        primary.coverageMode = meta.mode ?? "full";
        primary.parentCommit = parentCommitNorm;
        primary.diffBaseCommit = diffBaseNorm;
        await em.save(primary);
        report = primary;
      } else {
        replaced = false;
        report = em.create(CoverageReport, {
          branchCoverageId: bc.id,
          gitCommit: gc,
          coverageMode: meta.mode ?? "full",
          parentCommit: parentCommitNorm,
          diffBaseCommit: diffBaseNorm,
          fileCount: rows.length,
        });
        await em.save(report);
      }

      for (const r of rows) {
        await em.save(
          em.create(CoverageFile, {
            reportId: report.id,
            path: r.path,
            lineDetails: r.lineDetails,
            coveredLines: r.coveredLines,
            uncoveredLines: r.uncoveredLines,
          }),
        );
      }

      return {
        success: true as const,
        replaced,
        parentResolved: parentCommitNorm ? parentResolved : undefined,
        coverageMode: meta.mode ?? "full",
        message: replaced ? "已覆盖更新" : "已保存",
        reportId: report.id,
        branchCoverageId: bc.id,
        fileCount: rows.length,
        files: rows.map((r) => ({
          path: r.path,
          coveredLineCount: r.coveredLines.length,
          uncoveredLineCount: r.uncoveredLines.length,
          lineCount: r.lineDetails.length,
        })),
      };
    });
  }

  private normCommit(s: string | undefined | null): string | null {
    const t = s?.trim();
    if (!t) return null;
    return t.slice(0, 64);
  }
}
