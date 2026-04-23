/**
 * Istanbul 单文件 coverage → 行维度明细（插桩/覆盖），供全量与增量可视化。
 */
import type { CoverageLineDetail, LineInstrument } from './coverage-line-types';

export interface ParseLineDetailsOpts {
  mode: 'full' | 'incremental';
  incrementalLineSet?: Set<number> | null;
  instrumentFailLines?: Set<number> | null;
  maxSourceLine?: number;
}

/** @deprecated 使用 parseIstanbulFileToLineDetails + lineDetailsToHitArrays */
export interface LineStats {
  coveredLines: number[];
  uncoveredLines: number[];
}

export function parseIstanbulFileToLineDetails(
  fileCov: unknown,
  opts: ParseLineDetailsOpts,
): CoverageLineDetail[] | null {
  if (!fileCov || typeof fileCov !== 'object') return null;
  const o = fileCov as Record<string, unknown>;
  const sm = o.statementMap;
  const sHits = o.s;
  if (!sm || typeof sm !== 'object' || !sHits || typeof sHits !== 'object') {
    return null;
  }

  const stmtMap = sm as Record<string, unknown>;
  const hits = sHits as Record<string, unknown>;
  /**
   * 每行上可能有多条 statement 经过；仅当「覆盖该行的所有 statement 计数均 >0」时该行才算已覆盖，
   * 避免「任一条命中即整行绿」导致覆盖率虚高。
   */
  const lineAgg = new Map<number, { total: number; hitCount: number }>();

  for (const id of Object.keys(stmtMap)) {
    const range = stmtMap[id];
    if (!range || typeof range !== 'object') continue;
    const r = range as {
      start?: { line?: number };
      end?: { line?: number };
    };
    const sl = r.start?.line;
    const el = r.end?.line;
    if (typeof sl !== 'number' || typeof el !== 'number') continue;
    const stmtHit = Number(hits[id] ?? 0) > 0;
    const from = Math.min(sl, el);
    const to = Math.max(sl, el);
    for (let L = from; L <= to; L++) {
      if (!lineAgg.has(L)) lineAgg.set(L, { total: 0, hitCount: 0 });
      const a = lineAgg.get(L)!;
      a.total += 1;
      if (stmtHit) a.hitCount += 1;
    }
  }

  /** Istanbul 行号来自编译后源码（Vue SFC 等往往远大于 .vue 文件行数）；此处仅统计仪器映射范围 */
  let istanbulMax = 0;
  for (const id of Object.keys(stmtMap)) {
    const range = stmtMap[id];
    if (!range || typeof range !== 'object') continue;
    const r = range as { start?: { line?: number }; end?: { line?: number } };
    const sl = r.start?.line;
    const el = r.end?.line;
    if (typeof sl === 'number' && typeof el === 'number') {
      istanbulMax = Math.max(istanbulMax, sl, el);
    }
  }
  for (const L of lineAgg.keys()) {
    istanbulMax = Math.max(istanbulMax, L);
  }

  let maxL = istanbulMax;
  const cap = opts.maxSourceLine;
  if (cap != null && cap > 0) {
    /** 上报方提供的真实源文件行数（如 .vue 行数），用于裁掉编译映射多出来的「空行」尾部 */
    maxL = Math.min(istanbulMax, cap);
  }
  if (maxL < 1) return [];

  const fail = opts.instrumentFailLines ?? null;

  const details: CoverageLineDetail[] = [];
  for (let L = 1; L <= maxL; L++) {
    const inScope = computeInScope(L, opts);

    if (fail?.has(L)) {
      details.push({
        line: L,
        inScope,
        instrument: 'fail',
        covered: null,
      });
      continue;
    }

    const agg = lineAgg.get(L);
    if (agg && agg.total > 0) {
      details.push({
        line: L,
        inScope,
        instrument: 'ok' as LineInstrument,
        covered: agg.hitCount === agg.total,
      });
      continue;
    }

    details.push({
      line: L,
      inScope,
      instrument: 'none',
      covered: null,
    });
  }

  return details;
}

function computeInScope(L: number, opts: ParseLineDetailsOpts): boolean {
  if (opts.mode === 'full') return true;
  const set = opts.incrementalLineSet;
  if (!set || set.size === 0) return true;
  return set.has(L);
}

/** 兼容旧逻辑 */
export function parseIstanbulFileToLineStats(fileCov: unknown): LineStats | null {
  const details = parseIstanbulFileToLineDetails(fileCov, { mode: 'full' });
  if (!details) return null;
  const covered: number[] = [];
  const uncovered: number[] = [];
  for (const d of details) {
    if (d.instrument !== 'ok') continue;
    if (d.covered === true) covered.push(d.line);
    else if (d.covered === false) uncovered.push(d.line);
  }
  return { coveredLines: covered, uncoveredLines: uncovered };
}
