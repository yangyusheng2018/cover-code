import { http } from './http'
import { unwrapApiEnvelope } from './envelope'

/** 与后端 `POST /api/projects/*` 对齐；若字段为 snake_case，见下方 normalize */
export interface ProjectRow {
  id: number
  name: string
  code: string
  gitUrl: string
  mainBranch: string
  relativePath: string
  /** 私有仓库访问 Token；列表多为脱敏或不返回，仅用于 hasRepoToken / 编辑回显 */
  repoToken?: string
  /** 是否已配置仓库 Token（后端可单独返回，或与 repoToken 非空推导） */
  hasRepoToken?: boolean
}

function pickStr(v: unknown): string {
  return v == null ? '' : String(v)
}

/** 详情接口在 `data` 解包后可能仍为 `{ project: {...} }` */
function unwrapProjectDetailRecord(body: unknown): Record<string, unknown> {
  const o = unwrapApiEnvelope(body)
  if (!o || typeof o !== 'object' || Array.isArray(o)) {
    return {}
  }
  const rec = o as Record<string, unknown>
  const nested = rec.project ?? rec.entity
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return rec
}

function normalizeProject(raw: Record<string, unknown>): ProjectRow {
  const explicitToken = pickStr(raw.repoToken ?? raw.repo_token)
  const maskToken = pickStr(
    raw.repoTokenMask ??
      raw.repo_token_mask ??
      raw.repoTokenPreview ??
      raw.repo_token_preview,
  )
  const altToken = pickStr(raw.gitToken ?? raw.git_token ?? raw.accessToken ?? raw.access_token)
  /** 列表/详情用于表单回显：优先明文字段，否则脱敏串，再兼容其它命名 */
  const repoTokenStr = explicitToken || maskToken || altToken
  const hasRepoToken =
    raw.hasRepoToken === true ||
    raw.has_repo_token === true ||
    explicitToken.length > 0 ||
    maskToken.length > 0 ||
    altToken.length > 0
  return {
    id: Number(raw.id),
    name: pickStr(raw.name),
    code: pickStr(raw.code),
    gitUrl: pickStr(raw.gitUrl ?? raw.git_url),
    mainBranch: pickStr(raw.mainBranch ?? raw.main_branch) || 'master',
    /** 与分支覆盖率等项目侧命名对齐：部分接口返回 relativeDir */
    relativePath: pickStr(
      raw.relativePath ??
        raw.relative_path ??
        raw.relativeDir ??
        raw.relative_dir ??
        raw.relativeDirectory ??
        raw.relative_directory,
    ),
    ...(repoTokenStr ? { repoToken: repoTokenStr } : {}),
    ...(hasRepoToken ? { hasRepoToken: true } : {}),
  }
}

export interface ProjectListBody {
  keyword?: string
  page?: number
  pageSize?: number
}

export interface ProjectListResult {
  list: ProjectRow[]
  total: number
  page: number
  pageSize: number
}

function pickNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export async function listProjects(body: ProjectListBody) {
  const { data } = await http.post<unknown>('/api/projects/list', body)
  const d = unwrapApiEnvelope(data)
  return {
    list: (Array.isArray(d.list) ? d.list : []).map((r) =>
      normalizeProject((r ?? {}) as Record<string, unknown>),
    ),
    total: pickNum(d.total, 0),
    page: pickNum(d.page, 1),
    pageSize: pickNum(d.pageSize ?? d.page_size, 10),
  } satisfies ProjectListResult
}

/** 下拉/选择器用：仅含必要字段；响应为 `{ list }` 或顶层数组均可 */
export interface ProjectOption {
  id: number
  name: string
  code: string
}

function normalizeProjectOption(raw: Record<string, unknown>): ProjectOption {
  return {
    id: Number(raw.id),
    name: pickStr(raw.name),
    code: pickStr(raw.code),
  }
}

/** `POST /api/projects/detail` Body: `{ id }`（项目主键） */
export async function fetchProjectDetail(id: number): Promise<ProjectRow> {
  const rid = Math.trunc(Number(id))
  const { data } = await http.post<unknown>('/api/projects/detail', { id: rid })
  const raw = unwrapProjectDetailRecord(data)
  return normalizeProject(raw)
}

export async function fetchProjectOptions(): Promise<ProjectOption[]> {
  const { data } = await http.post<unknown>('/api/projects/options', {})
  if (Array.isArray(data)) {
    return data.map((r) => normalizeProjectOption(r as Record<string, unknown>))
  }
  const d = unwrapApiEnvelope(data)
  const rawList = Array.isArray(d.list)
    ? d.list
    : Array.isArray(d.options)
      ? d.options
      : Array.isArray((d as { data?: unknown }).data)
        ? (d as { data: unknown[] }).data
        : []
  return rawList.map((r) => normalizeProjectOption((r ?? {}) as Record<string, unknown>))
}

export async function createProject(body: {
  name: string
  code: string
  gitUrl: string
  mainBranch?: string
  relativePath?: string
  /** 私有仓库拉取代码用，可选 */
  repoToken?: string
}) {
  await http.post('/api/projects/create', body)
}

export async function updateProject(body: {
  id: number
  name?: string
  code?: string
  gitUrl?: string
  mainBranch?: string
  relativePath?: string
  /** 传入新值则更新；不传或 undefined 由后端决定是否保持原 Token */
  repoToken?: string
}) {
  await http.post('/api/projects/update', body)
}

export async function deleteProject(id: number) {
  await http.post('/api/projects/delete', { id })
}
