import type { CoverageMode, CoverageUploadMeta } from './coverage-line-types';

function toNumArray(v: unknown): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: number[] = [];
  for (const x of v) {
    const n = Number(x);
    if (Number.isFinite(n) && n >= 1) out.push(Math.floor(n));
  }
  return out;
}

function normMode(v: unknown): CoverageMode {
  return v === 'incremental' ? 'incremental' : 'full';
}

/** 从 body.meta 与请求头合并出 meta（body 优先） */
export function normalizeUploadMeta(
  raw: unknown,
  headers: {
    parentCommit?: string;
    coverageMode?: string;
    diffBaseCommit?: string;
  },
): CoverageUploadMeta {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const parentCommit =
    (typeof o.parentCommit === 'string' ? o.parentCommit.trim().slice(0, 64) : null) ||
    headers.parentCommit?.trim().slice(0, 64) ||
    null;

  const mode: CoverageMode = normMode(o.mode ?? headers.coverageMode);

  const diffBaseCommit =
    (typeof o.diffBaseCommit === 'string' ? o.diffBaseCommit.trim().slice(0, 64) : null) ||
    headers.diffBaseCommit?.trim().slice(0, 64) ||
    null;

  const fileChanges = parseFileChanges(o.fileChanges);
  const incrementalScopes = parseLineMap(o.incrementalScopes);
  const instrumentFailures = parseLineMap(o.instrumentFailures);
  const maxSourceLines = parseNumRecord(o.maxSourceLines);

  return {
    parentCommit: parentCommit || null,
    mode,
    diffBaseCommit: diffBaseCommit || null,
    fileChanges,
    incrementalScopes,
    instrumentFailures,
    maxSourceLines,
  };
}

function parseFileChanges(v: unknown): Record<string, { resetLines?: number[] }> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, { resetLines?: number[] }> = {};
  for (const [path, val] of Object.entries(v)) {
    if (!val || typeof val !== 'object') continue;
    const rl = toNumArray((val as { resetLines?: unknown }).resetLines);
    if (rl?.length) out[path] = { resetLines: rl };
  }
  return Object.keys(out).length ? out : undefined;
}

function parseLineMap(v: unknown): Record<string, number[]> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, number[]> = {};
  for (const [path, arr] of Object.entries(v)) {
    const lines = toNumArray(arr);
    if (lines?.length) out[path] = lines;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseNumRecord(v: unknown): Record<string, number> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) {
    const n = Number(val);
    if (Number.isFinite(n) && n >= 1) out[k] = Math.floor(n);
  }
  return Object.keys(out).length ? out : undefined;
}

/** 是否为 { payload, meta } 包裹格式 */
export function isWrappedPayload(body: Record<string, unknown>): boolean {
  return (
    body.payload != null &&
    typeof body.payload === 'object' &&
    !Array.isArray(body.payload) &&
    body.meta != null &&
    typeof body.meta === 'object' &&
    !Array.isArray(body.meta)
  );
}
