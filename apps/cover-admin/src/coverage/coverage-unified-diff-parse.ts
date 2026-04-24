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

/**
 * 从 unified diff 的 `patch` 文本解析「新文件行号 → 旧文件行号」映射，
 * 仅对 **未改动的上下文行**（前缀空格）建立对应关系；`+` / `-` 行不写入映射。
 * 用于跨 commit 继承覆盖率时按 diff 对齐行号（插入/删除/偏移由 diff 自然体现）。
 */
export function parseUnifiedPatchToNewToOldLineMap(patch: string): Map<number, number> {
  const map = new Map<number, number>();
  if (!patch || typeof patch !== "string") {
    return map;
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
        L.startsWith("diff --git") ||
        L.startsWith("index ") ||
        L.startsWith("new file mode") ||
        L.startsWith("deleted file mode") ||
        L.startsWith("similarity index") ||
        L.startsWith("rename from") ||
        L.startsWith("rename to") ||
        L.startsWith("Binary files ") ||
        L.startsWith("--- ") ||
        L.startsWith("+++ ")
      ) {
        i++;
        continue;
      }
      if (L.startsWith("\\")) {
        i++;
        continue;
      }
      if (!L.length) {
        i++;
        continue;
      }
      const prefix = L[0]!;
      if (prefix === "+") {
        curNew++;
        i++;
      } else if (prefix === " ") {
        map.set(curNew, curOld);
        curOld++;
        curNew++;
        i++;
      } else if (prefix === "-") {
        curOld++;
        i++;
      } else {
        i++;
      }
    }
  }
  return map;
}

/**
 * 新提交侧 patch 中行前缀为 `+` 的行号（新增或替换后的新行），即「变动行」。
 * 跨提交继承覆盖率时这些行 **不** 查父快照；仅空格上下文行可映射到父提交行号。
 */
export function parseUnifiedPatchToNewSideDiffPlusLineNumbers(
  patch: string,
): Set<number> {
  const marks = parseUnifiedPatchToNewSideLineMarks(patch);
  const plus = new Set<number>();
  for (const [newLine, mark] of marks) {
    if (mark === "+") {
      plus.add(newLine);
    }
  }
  return plus;
}
