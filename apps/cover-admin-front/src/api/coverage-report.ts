/**
 * 与 cover-admin 后端 `POST /api/branch-coverages/coverage-report` 响应对齐
 * （见 server `coverage-report-detail.service.ts`）
 */

import { unwrapApiEnvelope } from './envelope'

function pickStr(v: unknown): string {
  return v == null ? '' : String(v)
}

function pickNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** 后端 CoverageFileTreeNode */
export interface CoverageFileTreeNode {
  name: string
  path: string
  type: 'dir' | 'file'
  children?: CoverageFileTreeNode[]
}

/** 后端 CoverageLineDetail */
export interface CoverageLineDetailDto {
  line: number
  inScope: boolean
  instrument: 'none' | 'ok' | 'fail' | 'unknown'
  covered: boolean | null
  carried?: boolean
  /** 增量视图：unified diff 新侧 `+` 或上下文空格行 */
  diffMark?: '+' | ' '
}

export interface SourceHintDto {
  rawFileUrl?: string
  commit: string | null
  pathInRepo: string
  gitUrl: string
}

export interface CoverageReportFileVm {
  path: string
  stats: {
    instrumentOk: number
    covered: number
    uncovered: number
    none: number
    fail: number
  }
  lineDetails: CoverageLineDetailDto[]
  sourceHint: SourceHintDto
}

export interface CoverageReportSummaryVm {
  coverageRatePercent: number | null
  totalFiles: number
  linesInstrumentOk: number
  linesCovered: number
  linesUncovered: number
  linesNone: number
  linesFail: number
}

export interface CoverageReportBranchVm {
  id: number
  projectId: number
  testBranch: string
  projectCode: string
  projectName: string
  gitUrl: string
  mainBranch: string
  relativeDir: string
}

/** 后端 `view=incremental` 时附带：主分支 vs 测试分支 Git 对比元信息 */
export interface CoverageDiffContextVm {
  baseBranch: string
  headBranch: string
  provider?: string
  error?: string | null
}

/** 弹窗使用的统一视图模型 */
export interface CoverageReportDetailVm {
  empty: boolean
  message?: string
  branchCoverage: CoverageReportBranchVm | null
  summary: CoverageReportSummaryVm | null
  /** 后端构建的目录树根（path 为空、children 为顶层） */
  fileTreeRoot: CoverageFileTreeNode | null
  files: CoverageReportFileVm[]
  report?: Record<string, unknown> | null
  visualizationHint?: unknown
  diffContext?: CoverageDiffContextVm | null
}

/**
 * 行着色：与后端 instrument / covered 一致。
 * `diffContext`：增量详情里与主分支一致的 diff 上下文行（不计入增量分母），蓝色底。
 */
export type UiLineState = 'neutral' | 'covered' | 'missed' | 'fail' | 'diffContext'

export function mapBackendLineToUiState(
  d: CoverageLineDetailDto,
  incrementalDetail?: boolean,
): UiLineState {
  if (incrementalDetail && (d.diffMark === ' ' || d.inScope === false)) {
    return 'diffContext'
  }
  if (d.instrument === 'none' || d.instrument === 'unknown') {
    return 'neutral'
  }
  if (d.instrument === 'fail') {
    return 'fail'
  }
  if (d.instrument === 'ok') {
    if (d.covered === true) {
      return 'covered'
    }
    if (d.covered === false) {
      return 'missed'
    }
  }
  return 'neutral'
}

function normalizeSummary(raw: Record<string, unknown>): CoverageReportSummaryVm {
  let pct: number | null = null
  const rawPct = raw.coverageRatePercent ?? raw.coverage_rate_percent
  if (rawPct != null && rawPct !== '') {
    const n = pickNum(rawPct, NaN)
    pct = Number.isFinite(n) ? n : null
  }

  return {
    coverageRatePercent: pct,
    totalFiles: pickNum(raw.totalFiles ?? raw.total_files),
    linesInstrumentOk: pickNum(raw.linesInstrumentOk ?? raw.lines_instrument_ok),
    linesCovered: pickNum(raw.linesCovered ?? raw.lines_covered),
    linesUncovered: pickNum(raw.linesUncovered ?? raw.lines_uncovered),
    linesNone: pickNum(raw.linesNone ?? raw.lines_none),
    linesFail: pickNum(raw.linesFail ?? raw.lines_fail),
  }
}

function normalizeSourceHint(raw: Record<string, unknown> | undefined): SourceHintDto {
  if (!raw) {
    return { commit: null, pathInRepo: '', gitUrl: '' }
  }
  return {
    rawFileUrl: raw.rawFileUrl != null ? pickStr(raw.rawFileUrl) : undefined,
    commit: raw.commit != null ? pickStr(raw.commit) : null,
    pathInRepo: pickStr(raw.pathInRepo ?? raw.path_in_repo),
    gitUrl: pickStr(raw.gitUrl ?? raw.git_url),
  }
}

function normalizeLineDetail(raw: Record<string, unknown>): CoverageLineDetailDto {
  const dm = raw.diffMark ?? raw.diff_mark
  let diffMark: '+' | ' ' | undefined
  if (dm === '+' || dm === ' ') {
    diffMark = dm
  }
  return {
    line: pickNum(raw.line ?? raw.lineNumber ?? raw.line_number, 0),
    inScope: Boolean(raw.inScope ?? raw.in_scope ?? true),
    instrument: ((): CoverageLineDetailDto['instrument'] => {
      const i = raw.instrument
      if (i === 'none' || i === 'ok' || i === 'fail' || i === 'unknown') {
        return i
      }
      return 'unknown'
    })(),
    covered:
      raw.covered === null || raw.covered === undefined
        ? null
        : Boolean(raw.covered),
    carried: raw.carried != null ? Boolean(raw.carried) : undefined,
    diffMark,
  }
}

function normalizeReportFile(raw: Record<string, unknown>): CoverageReportFileVm {
  const statsRaw = (raw.stats ?? {}) as Record<string, unknown>
  const stats = {
    instrumentOk: pickNum(statsRaw.instrumentOk ?? statsRaw.instrument_ok),
    covered: pickNum(statsRaw.covered),
    uncovered: pickNum(statsRaw.uncovered),
    none: pickNum(statsRaw.none),
    fail: pickNum(statsRaw.fail),
  }

  const ld = raw.lineDetails ?? raw.line_details
  const lineDetails: CoverageLineDetailDto[] = Array.isArray(ld)
    ? ld.map((x) => normalizeLineDetail((x ?? {}) as Record<string, unknown>))
    : []

  return {
    path: pickStr(raw.path ?? raw.filePath ?? raw.file_path),
    stats,
    lineDetails,
    sourceHint: normalizeSourceHint((raw.sourceHint ?? raw.source_hint) as Record<string, unknown> | undefined),
  }
}

function normalizeBranchBlock(raw: Record<string, unknown>): CoverageReportBranchVm {
  return {
    id: pickNum(raw.id),
    projectId: pickNum(raw.projectId ?? raw.project_id),
    testBranch: pickStr(raw.testBranch ?? raw.test_branch),
    projectCode: pickStr(raw.projectCode ?? raw.project_code),
    projectName: pickStr(raw.projectName ?? raw.project_name),
    gitUrl: pickStr(raw.gitUrl ?? raw.git_url),
    mainBranch: pickStr(raw.mainBranch ?? raw.main_branch),
    relativeDir: pickStr(raw.relativeDir ?? raw.relative_dir ?? raw.relativePath ?? raw.relative_path),
  }
}

/** 将 axios 响应体转为弹窗视图模型 */
export function parseCoverageReportResponse(body: unknown): CoverageReportDetailVm {
  const unwrapped = unwrapApiEnvelope(body)
  const raw = unwrapped as Record<string, unknown>

  const empty = raw.empty === true
  const message = pickStr(raw.message) || undefined

  const bcRaw = raw.branchCoverage ?? raw.branch_coverage
  const branchCoverage =
    bcRaw && typeof bcRaw === 'object' && !Array.isArray(bcRaw)
      ? normalizeBranchBlock(bcRaw as Record<string, unknown>)
      : null

  const sumRaw = raw.summary
  const summary =
    sumRaw && typeof sumRaw === 'object' && !Array.isArray(sumRaw)
      ? normalizeSummary(sumRaw as Record<string, unknown>)
      : null

  const ft = raw.fileTree ?? raw.file_tree
  const fileTreeRoot =
    ft && typeof ft === 'object' && !Array.isArray(ft)
      ? (ft as CoverageFileTreeNode)
      : null

  const filesRaw = raw.files
  const files: CoverageReportFileVm[] = Array.isArray(filesRaw)
    ? filesRaw.map((f) => normalizeReportFile((f ?? {}) as Record<string, unknown>))
    : []

  const dcRaw = raw.diffContext ?? raw.diff_context
  let diffContext: CoverageDiffContextVm | null = null
  if (dcRaw && typeof dcRaw === 'object' && !Array.isArray(dcRaw)) {
    const o = dcRaw as Record<string, unknown>
    const er = o.error
    const errorNorm =
      er === undefined ? undefined : er === null ? null : pickStr(er) || null
    diffContext = {
      baseBranch: pickStr(o.baseBranch ?? o.base_branch),
      headBranch: pickStr(o.headBranch ?? o.head_branch),
      provider: pickStr(o.provider) || undefined,
      error: errorNorm,
    }
  }

  return {
    empty,
    message,
    branchCoverage,
    summary,
    fileTreeRoot,
    files,
    report: (raw.report ?? null) as Record<string, unknown> | null,
    visualizationHint: raw.visualizationHint ?? raw.visualization_hint,
    diffContext,
  }
}
