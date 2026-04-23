/** 独立 .ts 模块，便于在 __coverage__ 中观察多文件键 */
export function describeScore(n: number): string {
  if (n > 10) {
    return "很高";
  }
  if (n > 5) {
    return "中等偏高";
  }
  if (n >= 0) {
    return "起步";
  }
  return "异常";
}
