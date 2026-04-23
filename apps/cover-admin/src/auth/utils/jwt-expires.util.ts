/**
 * 将 JWT expires 字符串转为秒数，用于 Redis TTL
 * 支持 s/m/h/d，如 "15m" -> 900, "7d" -> 604800
 */
export function jwtExpiresToSeconds(expires: string): number {
  const match = expires.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
}
