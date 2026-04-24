import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Repository } from "typeorm";
import { BranchCoverage } from "../branch-coverages/entities/branch-coverage.entity";
import { Project } from "../projects/entities/project.entity";
import { CoverageFile } from "./entities/coverage-file.entity";
import { CoverageReport } from "./entities/coverage-report.entity";
import {
  mergeParentLineDetails,
  mergeParentLineDetailsCrossCommit,
  lineDetailsToHitArrays,
} from "./coverage-line-merge";
import type { CoverageLineDetail } from "./coverage-line-types";
import { CoverageBranchDiffService } from "./coverage-branch-diff.service";
import { joinPathInRepo } from "./coverage-source-hint";
import { isWrappedPayload, normalizeUploadMeta } from "./coverage-upload-meta";
import { parseIstanbulFileToLineDetails } from "./istanbul-line-coverage";
import { remapIstanbulPayloadToOriginalSources } from "./coverage-sourcemap-remap";
import {
  parseUnifiedPatchToNewSideDiffPlusLineNumbers,
  parseUnifiedPatchToNewToOldLineMap,
} from "./coverage-unified-diff-parse";

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
    private readonly branchDiff: CoverageBranchDiffService,
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

    const rawMetaObj =
      rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)
        ? (rawMeta as Record<string, unknown>)
        : {};
    const hadExplicitParentRequest =
      !!parentCommitHeader?.trim() ||
      (typeof rawMetaObj.parentCommit === "string" &&
        rawMetaObj.parentCommit.trim() !== "");

    const gc = this.normCommit(gitCommit);
    let effectiveParentCommit = this.normCommit(meta.parentCommit ?? undefined);

    const parentFilesMap = new Map<string, CoverageLineDetail[]>();
    let parentResolved = false;
    if (effectiveParentCommit) {
      const parentReport = await this.reportRepo.findOne({
        where: { branchCoverageId: bc.id, gitCommit: effectiveParentCommit },
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

    /**
     * 新 commit 首次上报且未显式传父提交时：自动取该分支下「另一 commit」中最近更新的一条作为隐式父。
     * 与显式父提交合并时：跨提交仅在有远端仓库两提交间的 unified patch（GitHub compare）且能解析行映射时继承，否则不按行号猜对齐。
     */
    if (
      !hadExplicitParentRequest &&
      !stickyReport &&
      parentFilesMap.size === 0
    ) {
      const implicit = await this.loadImplicitParentReportMap(bc.id, gc);
      if (implicit) {
        for (const [path, details] of implicit.map) {
          parentFilesMap.set(path, details);
        }
        effectiveParentCommit = implicit.commitNorm;
        parentResolved = true;
        this.logger.debug(
          `coverage ingest: implicit parent commit ${implicit.commitNorm} for branch_coverage=${bc.id} new git_commit=${gc ?? "NULL"}`,
        );
      }
    }
    if (stickyReport) {
      const stickyFiles = await this.fileRepo.find({
        where: { reportId: stickyReport.id },
      });
      for (const f of stickyFiles) {
        stickySameCommitMap.set(f.path, f.lineDetails);
      }
    }

    /**
     * 父提交 ≠ 当前提交时：通过 GitHub `compare/{parent}...{head}`（两 commit SHA）拉各文件 patch，
     * 供 unified diff 解析新行→旧行映射（与是否在服务端克隆仓库无关）。
     */
    /** compare 成功则为 true，此时 `crossCommitPathToPatch` 为本次拉取结果（可为空 Map）；失败则为 false，跨提交不做父合并 */
    let crossCommitCompareOk = false;
    let crossCommitPathToPatch = new Map<string, string>();
    if (
      effectiveParentCommit &&
      gc &&
      effectiveParentCommit !== gc &&
      parentFilesMap.size > 0
    ) {
      const cmp = await this.branchDiff.fetchGithubComparePatchesBetweenShas(
        project,
        effectiveParentCommit,
        gc,
      );
      if (cmp.error) {
        this.logger.warn(
          `coverage ingest: parent↔head commit diff unavailable (${cmp.error}); cross-commit parent merge skipped`,
        );
      } else {
        crossCommitCompareOk = true;
        crossCommitPathToPatch = cmp.pathToPatch;
      }
    }

    /**
     * 增量覆盖率任务：仅持久化主分支 vs 测试分支 GitHub compare 中「有 diff 行」的文件，
     * 且每文件只保留 patch 中涉及的新侧行号（与详情页 incremental 视图一致）。
     * compare 不可用时打日志，仍写入全量路径（避免上报失败）。
     */
    let incrementalGithubMarks: Map<string, Map<number, "+" | " ">> | null =
      null;
    if (bc.taskScope === "incremental") {
      const mainBr = project.mainBranch?.trim() || "main";
      const testBr = bc.testBranch.trim() || "";
      const incDiff = await this.branchDiff.fetchGithubCompareLineMarks(
        project,
        mainBr,
        testBr,
      );
      if (incDiff.error) {
        this.logger.warn(
          `incremental task ingest: GitHub compare 不可用 (${incDiff.error})，未按 diff 裁剪入库路径`,
        );
      } else if (incDiff.pathToMarks.size > 0) {
        incrementalGithubMarks = incDiff.pathToMarks;
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
      if (effectiveParentCommit && parentDetail?.length) {
        const repoPath = joinPathInRepo(project.relativeDir, path)
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");
        const isCrossCommit = !!(
          effectiveParentCommit &&
          gc &&
          effectiveParentCommit !== gc
        );
        if (isCrossCommit) {
          if (!crossCommitCompareOk) {
            /* compare 不可用：不做跨提交父合并 */
          } else {
            const patch =
              this.pickByRepoPath(
                crossCommitPathToPatch,
                project,
                path,
                repoPath,
              ) ?? null;
            if (patch) {
              const newToOld = parseUnifiedPatchToNewToOldLineMap(patch);
              const diffPlusLines =
                parseUnifiedPatchToNewSideDiffPlusLineNumbers(patch);
              lineDetails = mergeParentLineDetailsCrossCommit(
                lineDetails,
                parentDetail,
                resetLines,
                newToOld,
                diffPlusLines,
              );
            } else {
              /** compare 中无该文件条目：两提交间视为未改此文件，新老行号一致 */
              lineDetails = mergeParentLineDetails(
                lineDetails,
                parentDetail,
                resetLines,
              );
            }
          }
        } else {
          lineDetails = mergeParentLineDetails(
            lineDetails,
            parentDetail,
            resetLines,
          );
        }
      }

      if (incrementalGithubMarks) {
        const rpInc = this.branchDiff.repoPathForCoverageFile(project, path);
        const marks = this.pickByRepoPath(
          incrementalGithubMarks,
          project,
          path,
          rpInc,
        );
        if (!marks?.size) {
          continue;
        }
        lineDetails = lineDetails.filter((d) => marks.has(d.line));
        if (lineDetails.length === 0) {
          continue;
        }
      }

      const { coveredLines, uncoveredLines } =
        lineDetailsToHitArrays(lineDetails);
      rows.push({ path, lineDetails, coveredLines, uncoveredLines });
    }

    if (rows.length === 0) {
      throw new BadRequestException("未解析到有效的 Istanbul 覆盖率数据");
    }

    const diffBaseNorm = this.normCommit(meta.diffBaseCommit ?? undefined);
    const storedCoverageMode =
      bc.taskScope === "incremental" ? "incremental" : meta.mode ?? "full";

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
        primary.coverageMode = storedCoverageMode;
        primary.parentCommit = effectiveParentCommit;
        primary.diffBaseCommit = diffBaseNorm;
        await em.save(primary);
        report = primary;
      } else {
        replaced = false;
        report = em.create(CoverageReport, {
          branchCoverageId: bc.id,
          gitCommit: gc,
          coverageMode: storedCoverageMode,
          parentCommit: effectiveParentCommit,
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
        parentResolved: effectiveParentCommit ? parentResolved : undefined,
        coverageMode: storedCoverageMode,
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

  /**
   * 取同分支下与 `currentGc` 不同的、最近更新的一条 `coverage_report` 的文件行快照，用于隐式父合并。
   */
  private async loadImplicitParentReportMap(
    branchCoverageId: number,
    currentGc: string | null,
  ): Promise<{ commitNorm: string; map: Map<string, CoverageLineDetail[]> } | null> {
    const qb = this.reportRepo
      .createQueryBuilder("r")
      .where("r.branchCoverageId = :bcId", { bcId: branchCoverageId })
      .orderBy("r.updatedAt", "DESC")
      .addOrderBy("r.id", "DESC");
    if (currentGc === null) {
      qb.andWhere("r.gitCommit IS NOT NULL");
    } else {
      qb.andWhere("(r.gitCommit IS NULL OR r.gitCommit != :gc)", { gc: currentGc });
    }
    const rep = await qb.getOne();
    const cn = this.normCommit(rep?.gitCommit ?? undefined);
    if (!rep || !cn) {
      return null;
    }
    const pfs = await this.fileRepo.find({
      where: { reportId: rep.id },
    });
    const map = new Map<string, CoverageLineDetail[]>();
    for (const f of pfs) {
      map.set(f.path, f.lineDetails);
    }
    if (map.size === 0) {
      return null;
    }
    return { commitNorm: cn, map };
  }

  /**
   * coverage 路径与 compare filename 可能因 relativeDir/上报键形式不同而不一致；
   * 这里做多策略匹配，尽量命中同一仓库文件。
   */
  private pickByRepoPath<T>(
    map: Map<string, T>,
    project: Project,
    coveragePath: string,
    joinedRepoPath: string,
  ): T | undefined {
    const normalize = (s: string) => s.replace(/\\/g, "/").replace(/^\/+/, "");
    const rp = normalize(joinedRepoPath);
    const cp = normalize(coveragePath);
    const rd = normalize(project.relativeDir ?? "").replace(/\/+$/, "");
    const cpStrip = rd && cp.startsWith(`${rd}/`) ? cp.slice(rd.length + 1) : cp;

    const direct = map.get(rp) ?? map.get(cp) ?? map.get(cpStrip);
    if (direct !== undefined) {
      return direct;
    }

    const candidates = [rp, cp, cpStrip].filter(Boolean);
    let bestKey: string | null = null;
    for (const k of map.keys()) {
      const nk = normalize(k);
      if (candidates.some((c) => nk.endsWith(`/${c}`) || c.endsWith(`/${nk}`))) {
        if (!bestKey || nk.length < bestKey.length) {
          bestKey = k;
        }
      }
    }
    return bestKey ? map.get(bestKey) : undefined;
  }
}
