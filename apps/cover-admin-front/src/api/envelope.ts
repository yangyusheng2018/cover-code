/** 与后端统一包装 `{ code, data }`、`{ success, result }` 等对齐 */

export function unwrapApiEnvelope(body: unknown): Record<string, unknown> {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }
  let o = body as Record<string, unknown>
  for (let i = 0; i < 8; i++) {
    if (Array.isArray(o.list)) {
      break
    }
    const next = o.data ?? o.result ?? o.payload ?? o.body ?? o.detail
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      break
    }
    o = next as Record<string, unknown>
  }
  return o
}
