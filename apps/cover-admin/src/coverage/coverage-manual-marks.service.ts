import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CoverageFile } from "./entities/coverage-file.entity";
import { CoverageReport } from "./entities/coverage-report.entity";
import type { CoverageLineDetail } from "./coverage-line-types";
import {
  applyManualMarksToLineDetails,
  manualMarksOrNull,
  mergeManualMarksPatch,
  type CoverageFileManualMarks,
  type ManualMarkKind,
} from "./coverage-manual-marks";
import { lineDetailsToHitArrays } from "./coverage-line-merge";

export type ManualMarksBatchItem = {
  path: string;
  fileMark?: unknown;
  lineMarks?: Record<string, unknown>;
};

@Injectable()
export class CoverageManualMarksService {
  constructor(
    @InjectRepository(CoverageFile)
    private readonly fileRepo: Repository<CoverageFile>,
    @InjectRepository(CoverageReport)
    private readonly reportRepo: Repository<CoverageReport>,
  ) {}

  private assertMark(v: unknown): ManualMarkKind {
    if (v === "redundant_covered" || v === "instrument_excluded") {
      return v;
    }
    throw new BadRequestException(`非法标记: ${String(v)}`);
  }

  private normalizePatch(item: ManualMarksBatchItem): {
    fileMark?: ManualMarkKind | null;
    lineMarks?: Record<string, ManualMarkKind | null>;
  } {
    const out: {
      fileMark?: ManualMarkKind | null;
      lineMarks?: Record<string, ManualMarkKind | null>;
    } = {};
    if (item.fileMark !== undefined) {
      out.fileMark =
        item.fileMark === null ? null : this.assertMark(item.fileMark);
    }
    if (item.lineMarks) {
      out.lineMarks = Object.fromEntries(
        Object.entries(item.lineMarks).map(([k, v]) => [
          k,
          v === null || v === undefined ? null : this.assertMark(v),
        ]),
      ) as Record<string, ManualMarkKind | null>;
    }
    return out;
  }

  async applyBatch(
    branchCoverageId: number,
    reportId: number,
    items: ManualMarksBatchItem[],
  ): Promise<{ updated: number }> {
    if (!items?.length) {
      throw new BadRequestException("items 不能为空");
    }
    const report = await this.reportRepo.findOne({
      where: { id: reportId, branchCoverageId },
    });
    if (!report) {
      throw new NotFoundException("覆盖率上报不存在或不属于该分支覆盖率");
    }

    let updated = 0;
    for (const item of items) {
      const path = item.path?.trim();
      if (!path) {
        throw new BadRequestException("path 不能为空");
      }
      const hasLinePatch =
        item.lineMarks != null && Object.keys(item.lineMarks).length > 0;
      const hasFilePatch = item.fileMark !== undefined;
      if (!hasFilePatch && !hasLinePatch) {
        throw new BadRequestException(`未指定 fileMark 或 lineMarks：${path}`);
      }

      const file = await this.fileRepo.findOne({
        where: { reportId, path },
      });
      if (!file) {
        throw new NotFoundException(`文件不存在于该次上报：${path}`);
      }

      const patch = this.normalizePatch(item);
      const nextMarks = mergeManualMarksPatch(file.manualMarks ?? undefined, {
        fileMark: patch.fileMark,
        lineMarks: patch.lineMarks,
      });
      const normalized = manualMarksOrNull(nextMarks) ?? null;

      const core: CoverageLineDetail[] =
        file.lineDetailsCore != null && file.lineDetailsCore.length > 0
          ? file.lineDetailsCore
          : (JSON.parse(
              JSON.stringify(file.lineDetails ?? []),
            ) as CoverageLineDetail[]);

      if (!file.lineDetailsCore?.length) {
        file.lineDetailsCore = JSON.parse(JSON.stringify(core)) as CoverageLineDetail[];
      }

      const merged = applyManualMarksToLineDetails(core, normalized ?? undefined);
      const { coveredLines, uncoveredLines } = lineDetailsToHitArrays(merged);

      file.manualMarks = normalized;
      file.lineDetails = merged;
      file.coveredLines = coveredLines;
      file.uncoveredLines = uncoveredLines;

      await this.fileRepo.save(file);
      updated++;
    }

    return { updated };
  }
}
