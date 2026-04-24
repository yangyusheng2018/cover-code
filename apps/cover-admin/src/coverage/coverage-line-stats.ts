import type { CoverageLineDetail } from './coverage-line-types';

export interface FileLineStats {
  /** instrument === ok */
  instrumentOk: number;
  covered: number;
  uncovered: number;
  /** instrument === none */
  none: number;
  /** instrument === fail */
  fail: number;
}

/** 增量详情：仅「相对主分支为 diff + 侧」的行参与插桩/覆盖统计（空格上下文行排除）。 */
export function isIncrementalDiffCountedLine(d: CoverageLineDetail): boolean {
  if (d.diffMark === '+') {
    return true;
  }
  if (d.diffMark === ' ') {
    return false;
  }
  return d.inScope === true;
}

/**
 * 增量「分支 diff」视图：仅统计 unified diff **新侧 `+` 行**（相对主分支有变更/新增），
 * 不把空格上下文行（与主分支一致）计入覆盖/未覆盖分母。
 */
export function summarizeLineDetailsForDiffPlusOnly(
  details: CoverageLineDetail[],
): FileLineStats {
  return summarizeLineDetails(details.filter(isIncrementalDiffCountedLine));
}

export function summarizeLineDetails(details: CoverageLineDetail[]): FileLineStats {
  let instrumentOk = 0;
  let covered = 0;
  let uncovered = 0;
  let none = 0;
  let fail = 0;

  for (const d of details) {
    switch (d.instrument) {
      case 'ok':
        instrumentOk++;
        if (d.covered === true) covered++;
        else if (d.covered === false) uncovered++;
        break;
      case 'none':
        none++;
        break;
      case 'fail':
        fail++;
        break;
      default:
        none++;
    }
  }

  return { instrumentOk, covered, uncovered, none, fail };
}

export function mergeFileStats(stats: FileLineStats[]): FileLineStats {
  const out: FileLineStats = {
    instrumentOk: 0,
    covered: 0,
    uncovered: 0,
    none: 0,
    fail: 0,
  };
  for (const s of stats) {
    out.instrumentOk += s.instrumentOk;
    out.covered += s.covered;
    out.uncovered += s.uncovered;
    out.none += s.none;
    out.fail += s.fail;
  }
  return out;
}

/** 行覆盖率（仅统计 instrument ok 的可执行行）：covered / (covered + uncovered) */
export function lineCoverageRatePercent(stats: FileLineStats): number | null {
  const denom = stats.covered + stats.uncovered;
  if (denom === 0) return null;
  return Math.round((stats.covered / denom) * 10000) / 100;
}
