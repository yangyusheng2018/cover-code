/** 解析 JWT payload 中的 exp（秒），失败返回 null */
export function getJwtExpSeconds(accessToken: string): number | null {
  try {
    const parts = accessToken.split('.')
    if (parts.length < 2) {
      return null
    }
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/** 已过期或剩余不足 skewSeconds 秒则视为需要刷新 */
export function isJwtExpiredOrSoon(accessToken: string, skewSeconds: number) {
  const exp = getJwtExpSeconds(accessToken)
  if (exp == null) {
    return true
  }
  return exp <= Math.floor(Date.now() / 1000) + skewSeconds
}
