import { http } from './http'
import { unwrapApiEnvelope } from './envelope'
import { parseCoverageReportResponse, type CoverageReportDetailVm } from './coverage-report'

export type {
  CoverageReportDetailVm,
  CoverageReportFileVm,
  CoverageLineDetailDto,
  CoverageFileTreeNode,
} from './coverage-report'
export { parseCoverageReportResponse } from './coverage-report'

/** 与后端 `POST /api/branch-coverages/*` 对齐 */
export interface BranchCoverageRow {
  id: number
  projectId: number
  projectCode: string
  projectName: string
  testBranch: string
  /** full=全量页任务 incremental=增量页任务 */
  taskScope: 'full' | 'incremental'
}

function pickStr(v: unknown): string {
  return v == null ? '' : String(v)
}

function normalizeRow(raw: Record<string, unknown>): BranchCoverageRow {
  const tsRaw = String(raw.taskScope ?? raw.task_scope ?? 'full').toLowerCase()
  const taskScope: 'full' | 'incremental' = tsRaw === 'incremental' ? 'incremental' : 'full'
  return {
    id: Number(raw.id),
    projectId: Number(raw.projectId ?? raw.project_id),
    projectCode: pickStr(raw.projectCode ?? raw.project_code),
    projectName: pickStr(raw.projectName ?? raw.project_name),
    testBranch: pickStr(raw.testBranch ?? raw.test_branch),
    taskScope,
  }
}

export interface BranchCoverageListBody {
  keyword?: string
  projectId?: number
  page?: number
  pageSize?: number
  /** 默认 full；与对应管理页一致 */
  taskScope?: 'full' | 'incremental'
}

export interface BranchCoverageListResult {
  list: BranchCoverageRow[]
  total: number
  page: number
  pageSize: number
}

export async function listBranchCoverages(body: BranchCoverageListBody) {
  const payload = {
    ...body,
    taskScope: body.taskScope === 'incremental' ? 'incremental' : 'full',
  }
  const { data } = await http.post<unknown>('/api/branch-coverages/list', payload)
  const d = unwrapApiEnvelope(data)
  return {
    list: (Array.isArray(d.list) ? d.list : []).map((r) =>
      normalizeRow((r ?? {}) as Record<string, unknown>),
    ),
    total: pickNum(d.total, 0),
    page: pickNum(d.page, 1),
    pageSize: pickNum(d.pageSize ?? d.page_size, 10),
  } satisfies BranchCoverageListResult
}

export async function createBranchCoverage(body: {
  projectId: number
  testBranch: string
  taskScope?: 'full' | 'incremental'
}) {
  await http.post('/api/branch-coverages/create', {
    ...body,
    taskScope: body.taskScope === 'incremental' ? 'incremental' : 'full',
  })
}

export async function updateBranchCoverage(body: {
  id: number
  projectId?: number
  testBranch?: string
}) {
  await http.post('/api/branch-coverages/update', body)
}

export async function deleteBranchCoverage(id: number) {
  await http.post('/api/branch-coverages/delete', { id })
}

/** 清空该分支覆盖率下的全部上报（不删除 branch_coverage 配置） */
export interface ResetBranchCoverageResult {
  message: string
  branchCoverageId: number
  deletedReportCount: number
}

export async function resetBranchCoverageCoverage(branchCoverageId: number) {
  const id = Math.trunc(Number(branchCoverageId))
  const { data } = await http.post<ResetBranchCoverageResult>(
    '/api/branch-coverages/reset-coverage',
    { branchCoverageId: id },
  )
  return data
}

/** 行级：`neutral` 未插桩，`covered` 已覆盖，`missed` 插桩未覆盖 */
export type CoverageLineState = 'neutral' | 'covered' | 'missed'

export interface CoverageSourceLine {
  lineNumber: number
  text: string
  state: CoverageLineState
}

export interface BranchCoverageFileDetail {
  path: string
  instrumentedLineCount: number
  coveredLineCount: number
  uncoveredLineCount: number
  lines: CoverageSourceLine[]
}

export interface BranchCoverageDetail {
  branchCoverageId: number
  projectName?: string
  testBranch?: string
  /** 0–100 */
  totalCoveragePct: number
  totalInstrumentedLines: number
  totalCoveredLines: number
  totalUncoveredLines: number
  files: BranchCoverageFileDetail[]
}

function pickNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function normalizeLineState(v: unknown): CoverageLineState {
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v === 0) {
      return 'neutral'
    }
    if (v === 1) {
      return 'covered'
    }
    if (v === 2) {
      return 'missed'
    }
  }
  const s = String(v ?? '').toLowerCase()
  if (s === 'covered' || s === 'hit' || s === 'yes' || s === 'true') {
    return 'covered'
  }
  if (s === 'missed' || s === 'uncovered' || s === 'no') {
    return 'missed'
  }
  if (
    s === 'neutral' ||
    s === 'none' ||
    s === 'outside' ||
    s === 'noinstrument' ||
    s === 'no_instrument' ||
    s === 'notinstrumented'
  ) {
    return 'neutral'
  }
  return 'neutral'
}

/** lineCoverage 单元：null/缺省=未插桩；0=未覆盖；>0=已覆盖；-1 等=未插桩 */
function mapCoverageMetricToState(v: unknown): CoverageLineState {
  if (v === null || v === undefined) {
    return 'neutral'
  }
  if (typeof v === 'string' && (v === '' || v === '-')) {
    return 'neutral'
  }
  if (v === -1 || v === '-1') {
    return 'neutral'
  }
  const n = Number(v)
  if (!Number.isFinite(n)) {
    return normalizeLineState(v)
  }
  if (n === 0) {
    return 'missed'
  }
  return 'covered'
}

function mapLineHitsArrayItem(v: unknown): CoverageLineState {
  if (v === null || v === undefined) {
    return 'neutral'
  }
  if (v === -1) {
    return 'neutral'
  }
  if (typeof v === 'boolean') {
    return v ? 'covered' : 'missed'
  }
  const n = Number(v)
  if (!Number.isFinite(n)) {
    return normalizeLineState(v)
  }
  if (n === 0) {
    return 'missed'
  }
  return 'covered'
}

function tryLinesFromSourceAndCoverageMaps(raw: Record<string, unknown>): CoverageSourceLine[] | null {
  const source = pickStr(
    raw.source ??
      raw.content ??
      raw.sourceCode ??
      raw.source_code ??
      raw.textContent ??
      raw.fileContent ??
      raw.file_content,
  )
  if (!source) {
    return null
  }
  const textLines = source.split(/\r?\n/)

  const lineCoverage = raw.lineCoverage ?? raw.line_coverage
  if (lineCoverage && typeof lineCoverage === 'object' && !Array.isArray(lineCoverage)) {
    const lc = lineCoverage as Record<string, unknown>
    return textLines.map((text, i) => {
      const lineNo = i + 1
      const v = lc[String(lineNo)] ?? lc[lineNo]
      return {
        lineNumber: lineNo,
        text,
        state: mapCoverageMetricToState(v),
      }
    })
  }

  const hits = raw.lineHits ?? raw.line_hits ?? raw.lineHitCounts ?? raw.line_hit_counts
  if (Array.isArray(hits)) {
    return textLines.map((text, i) => ({
      lineNumber: i + 1,
      text,
      state: mapLineHitsArrayItem(hits[i]),
    }))
  }

  return null
}

function inferLineState(raw: Record<string, unknown>): CoverageLineState {
  if (raw.state != null || raw.kind != null) {
    return normalizeLineState(raw.state ?? raw.kind)
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'hit')) {
    const h = raw.hit
    if (h === null || h === undefined) {
      return 'neutral'
    }
    const n = Number(h)
    if (!Number.isFinite(n)) {
      return 'neutral'
    }
    return n > 0 ? 'covered' : 'missed'
  }
  return 'neutral'
}

function normalizeSourceLine(raw: Record<string, unknown>, fallbackLineNo: number): CoverageSourceLine {
  return {
    lineNumber: pickNum(raw.lineNumber ?? raw.line_number, fallbackLineNo),
    text: pickStr(raw.text ?? raw.content ?? ''),
    state: inferLineState(raw),
  }
}

function normalizeFileDetail(raw: Record<string, unknown>): BranchCoverageFileDetail {
  const path = pickStr(
    raw.path ?? raw.filePath ?? raw.file_path ?? raw.relativePath ?? raw.relative_path ?? raw.file,
  )
  let lines: CoverageSourceLine[] = []

  const rawLines = raw.lines
  if (Array.isArray(rawLines) && rawLines.length > 0) {
    lines = rawLines.map((r, i) => normalizeSourceLine((r ?? {}) as Record<string, unknown>, i + 1))
  } else {
    const fromMaps = tryLinesFromSourceAndCoverageMaps(raw)
    if (fromMaps?.length) {
      lines = fromMaps
    } else if (typeof raw.source === 'string' && Array.isArray(raw.lineStates ?? raw.line_states)) {
      const text = raw.source as string
      const states = (raw.lineStates ?? raw.line_states) as unknown[]
      const parts = text.split(/\r?\n/)
      lines = parts.map((lineText, i) => ({
        lineNumber: i + 1,
        text: lineText,
        state: normalizeLineState(states[i]),
      }))
    }
  }

  let ins = pickNum(
    raw.instrumentedLineCount ?? raw.instrumented_line_count ?? raw.instrumentedLines,
  )
  let cov = pickNum(raw.coveredLineCount ?? raw.covered_line_count ?? raw.coveredLines)
  let unc = pickNum(raw.uncoveredLineCount ?? raw.uncovered_line_count ?? raw.uncoveredLines)
  if (lines.length && !ins && !cov && !unc) {
    for (const ln of lines) {
      if (ln.state === 'neutral') {
        continue
      }
      ins += 1
      if (ln.state === 'covered') {
        cov += 1
      } else {
        unc += 1
      }
    }
  }

  return {
    path,
    instrumentedLineCount: ins,
    coveredLineCount: cov,
    uncoveredLineCount: unc,
    lines,
  }
}

/**
 * 解包常见响应：`{ code, data: {...} }`、`{ success, result }` 等；
 * 若顶层没有 `files` / `fileList` 等业务字段，则向内层剥开。
 */
function unwrapDetailPayload(body: unknown): Record<string, unknown> {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }
  let o = body as Record<string, unknown>
  for (let i = 0; i < 8; i++) {
    // 空数组不能当作「已拿到 files」，否则 `{ files: [], data: { files: [...] } }` 会误判
    const hasFileArray =
      (Array.isArray(o.files) && o.files.length > 0) ||
      (Array.isArray(o.fileList) && o.fileList.length > 0) ||
      (Array.isArray(o.file_list) && o.file_list.length > 0) ||
      (Array.isArray(o.coverageFiles) && o.coverageFiles.length > 0) ||
      (Array.isArray(o.coverage_files) && o.coverage_files.length > 0)
    const list = o.list
    const hasListAsFiles =
      Array.isArray(list) &&
      list.length > 0 &&
      typeof list[0] === 'object' &&
      list[0] !== null &&
      ('path' in (list[0] as object) ||
        'filePath' in (list[0] as object) ||
        'file_path' in (list[0] as object))
    if (
      hasFileArray ||
      hasListAsFiles ||
      o.branchCoverageId != null ||
      o.branch_coverage_id != null ||
      o.totalCoveragePct != null ||
      o.total_coverage_pct != null
    ) {
      break
    }
    const next = o.data ?? o.result ?? o.payload ?? o.body ?? o.detail
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      break
    }
    o = next as Record<string, unknown>
  }
  return mergeCoverageDetailAliases(o)
}

/** 与后端 `coverageDetail` / `branchCoverage` 等嵌套字段合并 */
function mergeCoverageDetailAliases(o: Record<string, unknown>): Record<string, unknown> {
  const nestedKeys = [
    'coverageDetail',
    'coverage_detail',
    'branchCoverage',
    'branch_coverage',
    'coverage',
    'report',
  ]
  for (const k of nestedKeys) {
    const inner = o[k]
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) {
      continue
    }
    const ir = inner as Record<string, unknown>
    if (
      extractFilesArray(ir).length > 0 ||
      ir.branchCoverageId != null ||
      ir.branch_coverage_id != null ||
      ir.totalCoveragePct != null ||
      ir.total_coverage_pct != null
    ) {
      return { ...o, ...ir }
    }
  }
  return o
}

function extractFilesArray(raw: Record<string, unknown>): unknown[] {
  if (Array.isArray(raw.files)) {
    return raw.files
  }
  if (Array.isArray(raw.fileList)) {
    return raw.fileList
  }
  if (Array.isArray(raw.file_list)) {
    return raw.file_list
  }
  if (Array.isArray(raw.coverageFiles)) {
    return raw.coverageFiles
  }
  if (Array.isArray(raw.coverage_files)) {
    return raw.coverage_files
  }
  if (Array.isArray(raw.items)) {
    return raw.items
  }
  if (Array.isArray(raw.fileDetails)) {
    return raw.fileDetails
  }
  if (Array.isArray(raw.file_details)) {
    return raw.file_details
  }
  const list = raw.list
  if (
    Array.isArray(list) &&
    list.length > 0 &&
    typeof list[0] === 'object' &&
    list[0] !== null &&
    ('path' in (list[0] as object) ||
      'filePath' in (list[0] as object) ||
      'file_path' in (list[0] as object))
  ) {
    return list
  }
  return []
}

function normalizeDetail(raw: Record<string, unknown>): BranchCoverageDetail {
  const list = extractFilesArray(raw)
  return {
    branchCoverageId: pickNum(raw.branchCoverageId ?? raw.branch_coverage_id ?? raw.id),
    projectName: pickStr(raw.projectName ?? raw.project_name) || undefined,
    testBranch: pickStr(raw.testBranch ?? raw.test_branch) || undefined,
    totalCoveragePct: pickNum(raw.totalCoveragePct ?? raw.total_coverage_pct ?? raw.totalCoverage),
    totalInstrumentedLines: pickNum(
      raw.totalInstrumentedLines ?? raw.total_instrumented_lines,
    ),
    totalCoveredLines: pickNum(raw.totalCoveredLines ?? raw.total_covered_lines),
    totalUncoveredLines: pickNum(raw.totalUncoveredLines ?? raw.total_uncovered_lines),
    files: list.map((f) => normalizeFileDetail((f ?? {}) as Record<string, unknown>)),
  }
}

/** `POST /api/branch-coverages/coverage-reports`：该分支下全部上报摘要（多 commit） */
export interface CoverageReportSummaryRow {
  id: number
  gitCommit: string | null
  fileCount: number
  coverageMode: string
  createdAt?: string
  updatedAt?: string
}

export async function fetchBranchCoverageReportSummaries(
  branchCoverageId: number,
): Promise<{ list: CoverageReportSummaryRow[] }> {
  const id = Math.trunc(Number(branchCoverageId))
  const { data } = await http.post<unknown>('/api/branch-coverages/coverage-reports', {
    branchCoverageId: id,
  })
  const d = unwrapApiEnvelope(data) as Record<string, unknown>
  const rawList = Array.isArray(d.list) ? d.list : []
  const list = rawList.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>
    return {
      id: pickNum(o.id, 0),
      gitCommit: o.gitCommit == null || o.gitCommit === '' ? null : String(o.gitCommit),
      fileCount: pickNum(o.fileCount ?? o.file_count, 0),
      coverageMode: pickStr(o.coverageMode ?? o.coverage_mode) || 'full',
      createdAt: o.createdAt != null ? String(o.createdAt) : o.created_at != null ? String(o.created_at) : undefined,
      updatedAt: o.updatedAt != null ? String(o.updatedAt) : o.updated_at != null ? String(o.updated_at) : undefined,
    } satisfies CoverageReportSummaryRow
  })
  return { list }
}

/** `POST /api/branch-coverages/coverage-report` Body: `{ branchCoverageId }`（整数 ≥1，勿传 `id`） */
export async function fetchBranchCoverageDetail(
  branchCoverageId: number,
  opts?: { view?: 'full' | 'incremental'; reportId?: number },
): Promise<CoverageReportDetailVm> {
  const id = Math.trunc(Number(branchCoverageId))
  const body: Record<string, unknown> = { branchCoverageId: id }
  if (opts?.view) {
    body.view = opts.view
  }
  if (opts?.reportId != null) {
    const rid = Math.trunc(Number(opts.reportId))
    if (Number.isFinite(rid) && rid >= 1) {
      body.reportId = rid
    }
  }
  const { data } = await http.post<unknown>('/api/branch-coverages/coverage-report', body)
  return parseCoverageReportResponse(data)
}

/** `POST /api/branch-coverages/source-file`：服务端从 Git 拉取源码 */
export interface BranchCoverageSourceFileResult {
  content: string
  urlUsed: string
  pathInRepo: string
  commit: string
  reportId: number
}

function normalizeSourceFileResult(raw: Record<string, unknown>): BranchCoverageSourceFileResult {
  return {
    content: pickStr(raw.content),
    urlUsed: pickStr(raw.urlUsed ?? raw.url_used),
    pathInRepo: pickStr(raw.pathInRepo ?? raw.path_in_repo),
    commit: pickStr(raw.commit),
    reportId: pickNum(raw.reportId ?? raw.report_id, 0),
  }
}

export async function fetchBranchCoverageSourceFile(params: {
  branchCoverageId: number
  path: string
  reportId?: number
}): Promise<BranchCoverageSourceFileResult> {
  const payload: Record<string, unknown> = {
    branchCoverageId: Math.trunc(Number(params.branchCoverageId)),
    path: String(params.path).trim(),
  }
  if (params.reportId != null) {
    const rid = Math.trunc(Number(params.reportId))
    if (Number.isFinite(rid) && rid >= 1) {
      payload.reportId = rid
    }
  }
  const { data } = await http.post<unknown>('/api/branch-coverages/source-file', payload)
  const unwrapped = unwrapApiEnvelope(data) as Record<string, unknown>
  return normalizeSourceFileResult(unwrapped)
}
