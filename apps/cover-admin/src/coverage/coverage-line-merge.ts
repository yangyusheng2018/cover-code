import type { CoverageLineDetail } from "./coverage-line-types";

/**
 * 对「非 resetLines」行：若本次 Istanbul 未覆盖但父提交该行曾为已覆盖，则保留为已覆盖（carried=true）。
 * resetLines 内行完全以本次解析为准。
 */
export function mergeParentLineDetails(
  fresh: CoverageLineDetail[],
  parent: CoverageLineDetail[] | null,
  resetLines: Set<number>,
): CoverageLineDetail[] {
  if (!parent?.length) {
    return fresh.map((f) => ({ ...f, carried: false }));
  }
  const parentByLine = new Map(parent.map((p) => [p.line, p]));

  return fresh.map((f) => {
    if (resetLines.has(f.line)) {
      return { ...f, carried: false };
    }
    if (f.instrument !== "ok") {
      return { ...f, carried: false };
    }
    if (f.covered === true) {
      return { ...f, carried: false };
    }
    const p = parentByLine.get(f.line);
    if (p?.instrument === "ok" && p.covered === true) {
      return { ...f, covered: true, carried: true };
    }
    return { ...f, carried: false };
  });
}

/**
 * 与 {@link mergeParentLineDetails} 相同，但当提供 `newToOld`（新源码行号 → 父提交行号）时，
 * 按 diff 对齐后再查父快照；无映射或映射为空时退化为按行号合并。
 */
export function mergeParentLineDetailsWithLineMapping(
  fresh: CoverageLineDetail[],
  parent: CoverageLineDetail[] | null,
  resetLines: Set<number>,
  newToOld: Map<number, number> | null | undefined,
): CoverageLineDetail[] {
  if (!newToOld?.size) {
    return mergeParentLineDetails(fresh, parent, resetLines);
  }
  if (!parent?.length) {
    return fresh.map((f) => ({ ...f, carried: false }));
  }
  const parentByLine = new Map(parent.map((p) => [p.line, p]));

  return fresh.map((f) => {
    if (resetLines.has(f.line)) {
      return { ...f, carried: false };
    }
    if (f.instrument !== "ok") {
      return { ...f, carried: false };
    }
    if (f.covered === true) {
      return { ...f, carried: false };
    }
    const oldLine = newToOld.get(f.line);
    if (oldLine == null) {
      return { ...f, carried: false };
    }
    const p = parentByLine.get(oldLine);
    if (p?.instrument === "ok" && p.covered === true) {
      return { ...f, covered: true, carried: true };
    }
    return { ...f, carried: false };
  });
}

/** 从 line_details 推导兼容用的 covered / uncovered 行号（仅 instrument===ok） */
export function lineDetailsToHitArrays(details: CoverageLineDetail[]): {
  coveredLines: number[];
  uncoveredLines: number[];
} {
  const coveredLines: number[] = [];
  const uncoveredLines: number[] = [];
  for (const d of details) {
    if (d.instrument !== "ok") continue;
    if (d.covered === true) coveredLines.push(d.line);
    else if (d.covered === false) uncoveredLines.push(d.line);
  }
  coveredLines.sort((a, b) => a - b);
  uncoveredLines.sort((a, b) => a - b);
  return { coveredLines, uncoveredLines };
}
