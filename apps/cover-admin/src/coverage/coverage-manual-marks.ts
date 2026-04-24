import type { CoverageLineDetail } from "./coverage-line-types";

/** 人工标记：不参与父提交继承合并逻辑，仅在本列与入库后再次合并时覆盖展示与统计 */
export type ManualMarkKind =
  | "redundant_covered"
  | "fallback_covered"
  | "instrument_excluded";

export interface CoverageFileManualMarks {
  /** 整文件标记（优先级低于行级 lineMarks） */
  fileMark?: ManualMarkKind;
  /** 行号字符串 → 标记 */
  lineMarks?: Record<string, ManualMarkKind>;
}

export function applyManualMarksToLineDetails(
  details: CoverageLineDetail[],
  marks: CoverageFileManualMarks | null | undefined,
): CoverageLineDetail[] {
  const hasFile = marks?.fileMark != null;
  const lineKeys = marks?.lineMarks ? Object.keys(marks.lineMarks) : [];
  if (!marks || (!hasFile && lineKeys.length === 0)) {
    return details.map((d) => {
      const { manualMark: _m, ...rest } = d as CoverageLineDetail & {
        manualMark?: ManualMarkKind;
      };
      return rest as CoverageLineDetail;
    });
  }

  const perLine = new Map<number, ManualMarkKind>();
  if (marks.lineMarks) {
    for (const [k, v] of Object.entries(marks.lineMarks)) {
      const ln = Number(k);
      if (Number.isFinite(ln) && ln >= 1) {
        perLine.set(ln, v);
      }
    }
  }

  return details.map((d) => {
    const lineKind = perLine.get(d.line);
    const kind = lineKind ?? marks.fileMark;
    if (!kind) {
      const { manualMark: _m, ...rest } = d as CoverageLineDetail & {
        manualMark?: ManualMarkKind;
      };
      return rest as CoverageLineDetail;
    }
    if (kind === "redundant_covered" || kind === "fallback_covered") {
      return {
        ...d,
        instrument: "ok",
        covered: true,
        carried: false,
        manualMark: kind,
      };
    }
    return {
      ...d,
      instrument: "none",
      covered: null,
      carried: false,
      manualMark: kind,
    };
  });
}

export function mergeManualMarksPatch(
  existing: CoverageFileManualMarks | null | undefined,
  patch: {
    fileMark?: ManualMarkKind | null;
    lineMarks?: Record<string, ManualMarkKind | null>;
  },
): CoverageFileManualMarks {
  const out: CoverageFileManualMarks = {};
  if (existing?.lineMarks) {
    out.lineMarks = { ...existing.lineMarks };
  }
  if (patch.fileMark === null) {
    /* 清除整文件标记 */
  } else if (patch.fileMark !== undefined) {
    out.fileMark = patch.fileMark;
  } else if (existing?.fileMark) {
    out.fileMark = existing.fileMark;
  }
  if (patch.lineMarks) {
    out.lineMarks ??= {};
    for (const [k, v] of Object.entries(patch.lineMarks)) {
      if (v === null || v === undefined) {
        delete out.lineMarks[k];
      } else {
        out.lineMarks[k] = v;
      }
    }
  }
  if (!out.fileMark) {
    delete out.fileMark;
  }
  if (!out.lineMarks || Object.keys(out.lineMarks).length === 0) {
    delete out.lineMarks;
  }
  return out;
}

export function manualMarksOrNull(
  m: CoverageFileManualMarks,
): CoverageFileManualMarks | null {
  if (m.fileMark) {
    return m;
  }
  if (m.lineMarks && Object.keys(m.lineMarks).length > 0) {
    return m;
  }
  return null;
}
