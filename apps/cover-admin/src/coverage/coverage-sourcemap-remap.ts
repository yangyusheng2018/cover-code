import * as path from 'path';
import { createCoverageMap, createFileCoverage } from 'istanbul-lib-coverage';
import { createSourceMapStore } from 'istanbul-lib-source-maps';

function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^[A-Za-z]:\//, '/');
}

function stripQueryAndHash(p: string): string {
  return p.replace(/[?#].*$/, '');
}

function canonicalPath(p: string): string {
  return stripQueryAndHash(normPath(p)).replace(/^\/+/, '');
}

/**
 * 将 remap 后的绝对路径 / 磁盘路径对齐到上报 payload 中的路径键，便于 meta、父提交合并一致。
 */
function stableReportPath(
  mappedPath: string,
  originalPayloadKeys: string[],
): string {
  const m = canonicalPath(mappedPath);
  const sorted = [...originalPayloadKeys].sort(
    (a, b) => canonicalPath(b).length - canonicalPath(a).length,
  );
  for (const k of sorted) {
    const nk = canonicalPath(k);
    if (m === nk || m.endsWith('/' + nk) || m.endsWith(nk)) {
      return nk;
    }
  }
  const base = path.posix.basename(m);
  const byBase = originalPayloadKeys.find(
    (k) => path.posix.basename(canonicalPath(k)) === base,
  );
  if (byBase) {
    return canonicalPath(byBase);
  }
  return m || mappedPath.replace(/\\/g, '/');
}

/** 确保每条 file coverage 带合法 path，避免与 payload 键不一致 */
function normalizePayloadPaths(
  istanbulPayload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [pathKey, raw] of Object.entries(istanbulPayload)) {
    if (!raw || typeof raw !== 'object') continue;
    const fc = raw as Record<string, unknown>;
    const p =
      typeof fc.path === 'string' && fc.path.trim()
        ? String(fc.path).trim()
        : pathKey;
    out[pathKey] = { ...fc, path: p };
  }
  return out;
}

/**
 * 使用 istanbul-lib-coverage + istanbul-lib-source-maps，将编译产物上的覆盖率映射回原始源，
 * 再供 parseIstanbulFileToLineDetails 统计行号。
 *
 * 无 `inputSourceMap` 且未注册外链 sourcemap 时，transform 为恒等，结果与入参等价。
 */
export async function remapIstanbulPayloadToOriginalSources(
  istanbulPayload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const normalized = normalizePayloadPaths(istanbulPayload);
  const originalKeys = Object.keys(normalized);
  if (originalKeys.length === 0) {
    return istanbulPayload;
  }

  const store = createSourceMapStore();
  try {
    const map = createCoverageMap(normalized);
    const transformed = await store.transformCoverage(map);

    const out: Record<string, unknown> = {};
    for (const filePath of transformed.files()) {
      const fc = transformed.fileCoverageFor(filePath);
      const data = fc.toJSON() as Record<string, unknown> & { path?: string };
      const rawPath = (typeof data.path === 'string' && data.path) || filePath;
      const reportPath = stableReportPath(rawPath, originalKeys);
      const next = { ...data, path: reportPath };
      if (out[reportPath]) {
        const merged = createFileCoverage(out[reportPath]);
        merged.merge(createFileCoverage(next));
        out[reportPath] = merged.toJSON();
      } else {
        out[reportPath] = next;
      }
    }
    return out;
  } finally {
    store.dispose();
  }
}
