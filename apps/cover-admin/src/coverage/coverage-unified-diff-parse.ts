/**
 * 解析 unified diff 的 `patch` 文本，收集「新版本（+ 侧）」上行号与 diff 前缀（+ / 空格上下文）。
 */
export function parseUnifiedPatchToNewSideLineMarks(
  patch: string,
): Map<number, '+' | ' '> {
  const marks = new Map<number, '+' | ' '>();
  if (!patch || typeof patch !== 'string') {
    return marks;
  }
  const lines = patch.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const hm = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!hm) {
      i++;
      continue;
    }
    let curNew = parseInt(hm[3]!, 10);
    let curOld = parseInt(hm[1]!, 10);
    i++;
    while (i < lines.length) {
      const L = lines[i]!;
      if (/^@@ -/.test(L)) {
        break;
      }
      if (
        L.startsWith('diff --git') ||
        L.startsWith('index ') ||
        L.startsWith('new file mode') ||
        L.startsWith('deleted file mode') ||
        L.startsWith('similarity index') ||
        L.startsWith('rename from') ||
        L.startsWith('rename to') ||
        L.startsWith('Binary files ') ||
        L.startsWith('--- ') ||
        L.startsWith('+++ ')
      ) {
        i++;
        continue;
      }
      if (L.startsWith('\\')) {
        i++;
        continue;
      }
      if (!L.length) {
        i++;
        continue;
      }
      const prefix = L[0]!;
      if (prefix === '+') {
        marks.set(curNew, '+');
        curNew++;
        i++;
      } else if (prefix === ' ') {
        marks.set(curNew, ' ');
        curOld++;
        curNew++;
        i++;
      } else if (prefix === '-') {
        curOld++;
        i++;
      } else {
        i++;
      }
    }
  }
  return marks;
}
