import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";

const require = createRequire(import.meta.url);
const istanbul = require("istanbul-lib-coverage");
const { createSourceMapStore } = require("istanbul-lib-source-maps");

const port = Number(process.env.COVERAGE_RECEIVER_PORT || 9876);
const host = process.env.COVERAGE_RECEIVER_HOST || "127.0.0.1";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

/** 自本文件目录向上查找 monorepo 根（pnpm-workspace / .git），供相对路径键拼磁盘路径 */
function findMonorepoRoot(startDir) {
  const root = path.parse(startDir).root;
  let d = path.resolve(startDir);
  for (;;) {
    for (const marker of [
      "pnpm-workspace.yaml",
      "pnpm-workspace.yml",
      ".git",
    ]) {
      try {
        if (fs.existsSync(path.join(d, marker))) return d;
      } catch {
        /* ignore */
      }
    }
    const parent = path.dirname(d);
    if (parent === d || d === root) break;
    d = parent;
  }
  return null;
}

/**
 * 上报体里的文件键多为「相对仓库根」路径；磁盘校验需解析为绝对路径。
 * 可用环境变量 `COVERAGE_REPO_ROOT` 覆盖（未设置时自动向上查找 workspace）。
 */
const REPO_ROOT =
  (process.env.COVERAGE_REPO_ROOT && process.env.COVERAGE_REPO_ROOT.trim()) ||
  findMonorepoRoot(SERVER_DIR) ||
  process.cwd();

/** @param {string} fileKey */
function resolveUploadedFilePath(fileKey) {
  if (!fileKey || typeof fileKey !== "string") return fileKey;
  const n = fileKey.replace(/\\/g, "/");
  if (path.isAbsolute(fileKey)) return path.normalize(fileKey);
  return path.normalize(path.join(REPO_ROOT, n));
}

/** 会话内累计合并的覆盖率（与浏览器 __coverage__ 顶层结构一致） */
let coverageMap = istanbul.createCoverageMap();

/**
 * 收集 SFC 中每个 `<style>…</style>` 块占用的 1-based 行号区间（含 `<style>` 与 `</style>` 所在行）。
 * @param {string[]} lines
 * @returns {{ start: number, end: number }[]}
 */
function collectVueStyleLineRanges1Based(lines) {
  const ranges = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*<style\b/.test(lines[i])) continue;
    const start = i + 1;
    let j = i + 1;
    while (j < lines.length && !/^\s*<\/style>\s*$/i.test(lines[j])) j++;
    if (j >= lines.length) break;
    const end = j + 1;
    ranges.push({ start, end });
    i = j;
  }
  return ranges;
}

/**
 * 为 `.vue` 的 `<style>` 段生成「全已覆盖」的 istanbul 数据结构（独立 key `…?vue&type=style`），
 * 不参与浏览器真实插桩，也不改写 script/template 上报体。
 */
function buildSyntheticStyleFileCoverage(styleKey, ranges, lines) {
  let nid = 0;
  const statementMap = {};
  const s = {};
  for (const { start, end } of ranges) {
    for (let L = start; L <= end; L++) {
      const len = (lines[L - 1] ?? "").length;
      const id = String(nid++);
      statementMap[id] = {
        start: { line: L, column: 0 },
        end: { line: L, column: Math.max(0, len) },
      };
      s[id] = 1;
    }
  }
  if (nid === 0) return null;
  const hash = createHash("sha256")
    .update(`${styleKey}\0istanbul-live-style-stub-v1`)
    .digest("hex");
  return {
    path: styleKey,
    statementMap,
    s,
    fnMap: {},
    f: {},
    branchMap: {},
    b: {},
    hash,
  };
}

/**
 * 对上报 JSON 中每个「裸」`.vue` 键（无 `?vue&type=`）追加一条合成的 style 覆盖率；已存在则跳过。
 */
function augmentVueSyntheticStyleCoverage(payload) {
  if (!payload || typeof payload !== "object") return;
  for (const key of Object.keys(payload)) {
    if (!/\.vue$/i.test(key) || key.includes("?vue&type=")) continue;
    const styleKey = `${key}?vue&type=style`;
    if (Object.prototype.hasOwnProperty.call(payload, styleKey)) continue;
    const abs = resolveUploadedFilePath(key);
    let raw;
    try {
      raw = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = raw.split(/\r\n|\r|\n/);
    const ranges = collectVueStyleLineRanges1Based(lines);
    if (!ranges.length) continue;
    const fc = buildSyntheticStyleFileCoverage(styleKey, ranges, lines);
    if (fc) payload[styleKey] = fc;
  }
}

/** 去掉无效的 inputSourceMap（mappings 为空），避免 remap 丢整文件、行汇总只剩 1 */
function stripInvalidInputSourceMaps(payload) {
  for (const key of Object.keys(payload)) {
    const fc = payload[key];
    if (!fc || typeof fc !== "object") continue;
    const m = fc.inputSourceMap;
    if (
      m &&
      typeof m === "object" &&
      (m.mappings == null || String(m.mappings).trim() === "")
    ) {
      delete fc.inputSourceMap;
    }
  }
}

/**
 * 行数统计默认基于「映射到原始源」后的 CoverageMap（需前端上报里含 inputSourceMap，见 Vite 插件）。
 * 若无 source map，则与编译产物坐标一致，行数可能仍偏少。
 */
const SOURCE_LINE_NOTE =
  "行数：在存在 inputSourceMap 时，由 istanbul-lib-source-maps 映射到原始 .vue/.ts 等后再按物理行去重统计；无 map 时与编译产物一致。";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Project-Code, X-Git-Branch, X-Git-Commit",
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

function sendJson(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

/** CoverageSummary → 普通对象 */
function summaryToJson(summary) {
  return summary.toJSON();
}

/**
 * 行维度（对给定 summary，一般为已映射到原始源的 CoverageMap）。
 * @returns {{ instrumentedLineCount: number, coveredLineCount: number, lineCoveragePercent: number | null, lineCoveragePercentDisplay: string }}
 */
function getLineCoverageStats(summary) {
  const { total, covered, pct } = summary.toJSON().lines;
  if (total <= 0) {
    return {
      instrumentedLineCount: 0,
      coveredLineCount: 0,
      lineCoveragePercent: null,
      lineCoveragePercentDisplay: "—（暂无插桩行）",
    };
  }
  const pctNum = typeof pct === "number" ? pct : (covered / total) * 100;
  return {
    instrumentedLineCount: total,
    coveredLineCount: covered,
    lineCoveragePercent: Math.round(pctNum * 100) / 100,
    lineCoveragePercentDisplay: `${pctNum.toFixed(2)}%`,
  };
}

/** 语句维度（与 summary 同源，一般为映射后） */
function getStatementCoverageStats(summary) {
  const { total, covered, pct } = summary.toJSON().statements;
  if (total <= 0) {
    return {
      instrumentedStatementCount: 0,
      coveredStatementCount: 0,
      statementCoveragePercent: null,
      statementCoveragePercentDisplay: "—（暂无插桩语句）",
    };
  }
  const pctNum = typeof pct === "number" ? pct : (covered / total) * 100;
  return {
    instrumentedStatementCount: total,
    coveredStatementCount: covered,
    statementCoveragePercent: Math.round(pctNum * 100) / 100,
    statementCoveragePercentDisplay: `${pctNum.toFixed(2)}%`,
  };
}

/** 将计数合并结果映射回原始源（依赖各文件 coverage.data.inputSourceMap） */
async function remapCoverageToSource(map) {
  const store = createSourceMapStore();
  try {
    return await store.transformCoverage(map);
  } finally {
    store.dispose();
  }
}

/** 合并后优先做 source map 映射；失败则退回原始 CoverageMap */
async function getMappedCoverageOrFallback() {
  try {
    return await remapCoverageToSource(coverageMap);
  } catch (e) {
    console.warn(
      "[coverage] source map 映射失败，使用未映射数据",
      e?.message || e,
    );
    return coverageMap;
  }
}

/**
 * 各文件「至少有一条语句起始、但该行命中为 0」的行号（istanbul getLineCoverage 语义）。
 * @returns {Record<string, number[]>} 路径 -> 升序行号数组
 */
function collectUncoveredLinesByFile(map) {
  const out = {};
  for (const f of map.files()) {
    try {
      const fc = map.fileCoverageFor(f);
      if (typeof fc.getUncoveredLines !== "function") continue;
      const lines = fc.getUncoveredLines();
      if (!lines?.length) continue;
      out[f] = lines
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
    } catch {
      /* ignore */
    }
  }
  return out;
}

/** 磁盘上该文件的物理行数（与编辑器「总行数」一致）；读不到则 null */
function countPhysicalSourceLines(fileKey) {
  const absPath = resolveUploadedFilePath(fileKey);
  try {
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return null;
    }
    const text = fs.readFileSync(absPath, "utf8");
    if (text.length === 0) return 0;
    return text.split(/\r\n|\n|\r/).length;
  } catch {
    return null;
  }
}

/**
 * 过滤掉「行号 > 磁盘文件物理行数」的项（Vue SFC + source map 边界下偶发假行号）。
 * @returns {{ uncoveredLinesByFile: Record<string, number[]>, lineSanitization?: { note: string, droppedOutOfRangeByFile: Record<string, { physicalLineCount: number, droppedLines: number[] }> } }}
 */
function sanitizeUncoveredLinesAgainstDisk(uncoveredByFile) {
  /** @type {Record<string, { physicalLineCount: number, droppedLines: number[] }>} */
  const droppedOutOfRangeByFile = {};
  const out = { ...uncoveredByFile };

  for (const filePath of Object.keys(out)) {
    const maxLine = countPhysicalSourceLines(filePath);
    if (maxLine == null) continue;
    const arr = out[filePath];
    const dropped = arr.filter((ln) => ln < 1 || ln > maxLine);
    if (!dropped.length) continue;
    droppedOutOfRangeByFile[filePath] = {
      physicalLineCount: maxLine,
      droppedLines: dropped,
    };
    const kept = arr.filter((ln) => ln >= 1 && ln <= maxLine);
    if (kept.length) {
      out[filePath] = kept;
    } else {
      delete out[filePath];
    }
  }

  const keys = Object.keys(droppedOutOfRangeByFile);
  if (!keys.length) {
    return { uncoveredLinesByFile: out };
  }
  return {
    uncoveredLinesByFile: out,
    lineSanitization: {
      note: "已按接收端可读文件的物理行数剔除超界行号（常见于 .vue 经 source map 映射后的边界误差）；若仍不准请重新 build 插件并清浏览器缓存后上报。",
      droppedOutOfRangeByFile,
    },
  };
}

function summarizeUncovered(uncoveredByFile) {
  const files = Object.keys(uncoveredByFile);
  let totalLines = 0;
  for (const k of files) {
    totalLines += uncoveredByFile[k].length;
  }
  return {
    filesWithUncoveredLines: files.length,
    totalUncoveredLines: totalLines,
  };
}

function logSourceLineCoverage(summary) {
  const s = getLineCoverageStats(summary);
  console.log(
    `[源码行] 代码插桩行数：${s.instrumentedLineCount}，覆盖行数：${s.coveredLineCount}，行覆盖率：${s.lineCoveragePercentDisplay}`,
  );
}

function logStatementCoverage(summary) {
  const s = getStatementCoverageStats(summary);
  console.log(
    `[源码语句] 插桩语句数：${s.instrumentedStatementCount}，已覆盖语句数：${s.coveredStatementCount}，语句覆盖率：${s.statementCoveragePercentDisplay}`,
  );
}

async function logAfterMerge() {
  const mapped = await getMappedCoverageOrFallback();
  const summary = mapped.getCoverageSummary();
  logSourceLineCoverage(summary);
  logStatementCoverage(summary);
  const rawUncovered = collectUncoveredLinesByFile(mapped);
  const { uncoveredLinesByFile: uncovered, lineSanitization } =
    sanitizeUncoveredLinesAgainstDisk(rawUncovered);
  if (lineSanitization) {
    const n = Object.keys(lineSanitization.droppedOutOfRangeByFile).length;
    console.warn(
      `[uncovered] 已剔除 ${n} 个文件中超出行数的映射行号（见 GET /uncovered 的 lineSanitization）`,
    );
  }
  const ustat = summarizeUncovered(uncovered);
  console.log(
    `[uncovered] ${ustat.filesWithUncoveredLines} 个文件存在未覆盖行，共 ${ustat.totalUncoveredLines} 行；详情 GET /uncovered`,
  );
  console.log(`[hint] ${SOURCE_LINE_NOTE}`);
  console.log("[summary]", JSON.stringify(summaryToJson(summary)));
}

const server = http.createServer((req, res) => {
  const u = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`,
  );

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && u.pathname === "/") {
    cors(res);
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      [
        "coverage-server-demo",
        "",
        "POST /coverage  — 上报 window.__coverage__（JSON），合并后按 source map 映射到源码再统计行/语句",
        "合并前会为每个裸 .vue 键自动追加 ?vue&type=style 合成条目（style 行视为已覆盖，不参与浏览器插桩）。",
        `（磁盘路径解析根目录：${REPO_ROOT}，可用环境变量 COVERAGE_REPO_ROOT 覆盖）`,
        "GET  /summary   — JSON：含 sourceLineCoverage、statementCoverage、uncoveredLinesByFile、summary",
        "GET  /uncovered — 仅返回各文件未覆盖行号列表（与 /summary 中 uncoveredLinesByFile 相同）",
        "DELETE /coverage — 清空合并状态",
        "",
      ].join("\n"),
    );
    return;
  }

  if (req.method === "GET" && u.pathname === "/summary") {
    void (async () => {
      try {
        const mapped = await getMappedCoverageOrFallback();
        const summary = mapped.getCoverageSummary();
        const line = getLineCoverageStats(summary);
        const stmt = getStatementCoverageStats(summary);
        const rawUncovered = collectUncoveredLinesByFile(mapped);
        const { uncoveredLinesByFile, lineSanitization } =
          sanitizeUncoveredLinesAgainstDisk(rawUncovered);
        const uncoveredStats = summarizeUncovered(uncoveredLinesByFile);
        sendJson(res, 200, {
          ok: true,
          sourceLineCoverage: {
            ...line,
            note: SOURCE_LINE_NOTE,
          },
          statementCoverage: {
            instrumentedStatementCount: stmt.instrumentedStatementCount,
            coveredStatementCount: stmt.coveredStatementCount,
            statementCoveragePercent: stmt.statementCoveragePercent,
            statementCoveragePercentDisplay:
              stmt.statementCoveragePercentDisplay,
            note: "与 sourceLineCoverage 一致，均为映射到原始源后的语句级汇总（若存在 inputSourceMap）。",
          },
          uncoveredLinesByFile,
          ...(lineSanitization ? { lineSanitization } : {}),
          uncoveredStats: {
            ...uncoveredStats,
            note: "行号含义与 istanbul getLineCoverage 一致：至少有一条可统计语句从该行开始且该行命中为 0；若存在 lineSanitization 则表示已剔除超出行数的映射结果。",
          },
          summary: summaryToJson(summary),
        });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e) });
      }
    })();
    return;
  }

  if (req.method === "GET" && u.pathname === "/uncovered") {
    void (async () => {
      try {
        const mapped = await getMappedCoverageOrFallback();
        const rawUncovered = collectUncoveredLinesByFile(mapped);
        const { uncoveredLinesByFile, lineSanitization } =
          sanitizeUncoveredLinesAgainstDisk(rawUncovered);
        sendJson(res, 200, {
          ok: true,
          uncoveredLinesByFile,
          ...(lineSanitization ? { lineSanitization } : {}),
          uncoveredStats: {
            ...summarizeUncovered(uncoveredLinesByFile),
            note: "键为绝对路径；值为该文件未覆盖行号（升序）。与 GET /summary 字段 uncoveredLinesByFile 一致；若存在 lineSanitization 则为按磁盘文件行数剔除后的结果。",
          },
        });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e) });
      }
    })();
    return;
  }

  if (req.method === "DELETE" && u.pathname === "/coverage") {
    coverageMap = istanbul.createCoverageMap();
    sendJson(res, 200, { ok: true, cleared: true });
    return;
  }

  if (req.method === "POST" && u.pathname === "/coverage") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      void (async () => {
        const body = Buffer.concat(chunks).toString("utf8");
        let json;
        try {
          json = JSON.parse(body);
        } catch (e) {
          console.warn("[coverage] JSON 解析失败", e?.message || e);
          sendJson(res, 400, { ok: false, error: "invalid_json" });
          return;
        }

        if (!json || typeof json !== "object" || Array.isArray(json)) {
          sendJson(res, 400, { ok: false, error: "expected_object" });
          return;
        }

        stripInvalidInputSourceMaps(json);
        augmentVueSyntheticStyleCoverage(json);

        const fileKeys = Object.keys(json);
        try {
          coverageMap.merge(json);
        } catch (e) {
          console.warn("[coverage] merge 失败", e?.message || e);
          sendJson(res, 400, {
            ok: false,
            error: "merge_failed",
            detail: String(e),
          });
          return;
        }

        const stamp = new Date().toISOString();
        const projectCode = req.headers["x-project-code"];
        const gitBranch = req.headers["x-git-branch"];
        const gitCommit = req.headers["x-git-commit"];
        const projectLog =
          typeof projectCode === "string" && projectCode ? projectCode : "—";
        const branchLog =
          typeof gitBranch === "string" && gitBranch ? gitBranch : "—";
        const commitLog =
          typeof gitCommit === "string" && gitCommit
            ? gitCommit.length > 12
              ? `${gitCommit.slice(0, 12)}…`
              : gitCommit
            : "—";
        console.log(
          `[coverage] ${stamp} project=${projectLog} branch=${branchLog} commit=${commitLog} 文件数=${fileKeys.length} bodyBytes=${body.length}`,
        );

        try {
          await logAfterMerge();
        } catch (e) {
          console.warn("[coverage] 统计失败", e?.message || e);
        }

        cors(res);
        res.writeHead(204);
        res.end();
      })();
    });
    return;
  }

  cors(res);
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(port, host, () => {
  console.log(`coverage-server-demo 监听 http://${host}:${port}`);
  console.log(`  POST   http://${host}:${port}/coverage`);
  console.log(`  GET    http://${host}:${port}/summary`);
  console.log(`  GET    http://${host}:${port}/uncovered`);
  console.log(`  DELETE http://${host}:${port}/coverage`);
  console.log(
    `[paths] 相对路径文件键将相对以下目录解析到磁盘：${REPO_ROOT}（可设置 COVERAGE_REPO_ROOT）`,
  );
});
