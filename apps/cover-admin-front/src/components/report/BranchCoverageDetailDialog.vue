<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as api from '@/api/branchCoverages'
import type { CoverageReportDetailVm } from '@/api/branchCoverages'
import {
  mapBackendLineToUiState,
  type CoverageFileTreeNode,
  type UiLineState,
} from '@/api/coverage-report'
import { buildCoverageFileTree, type CoverageTreeItem } from '@/utils/buildCoverageFileTree'

const props = defineProps<{
  modelValue: boolean
  branchCoverageId: number | null
  /** 为 true 时请求 `view=incremental`：按主分支 vs 测试分支 GitHub diff 过滤行与文件 */
  incrementalView?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const detail = ref<CoverageReportDetailVm | null>(null)
const treeRef = ref()
const selectedFilePath = ref<string | null>(null)

/** 按后端 fileTree 转 el-tree；无树时按 path 列表生成 */
const treeData = computed((): CoverageTreeItem[] => {
  const d = detail.value
  if (!d) {
    return []
  }
  const root = d.fileTreeRoot
  if (root?.children?.length) {
    return mapServerTreeChildren(root.children)
  }
  const paths = d.files.map((f) => f.path)
  return buildCoverageFileTree(paths)
})

function mapServerTreeChildren(nodes: CoverageFileTreeNode[]): CoverageTreeItem[] {
  return nodes.map(mapServerNode)
}

function mapServerNode(n: CoverageFileTreeNode): CoverageTreeItem {
  if (n.type === 'file') {
    return { id: n.path, label: n.name, isFile: true, filePath: n.path }
  }
  const kids = n.children?.length ? mapServerTreeChildren(n.children) : []
  return {
    id: n.path || `dir:${n.name}`,
    label: n.name || n.path || '—',
    isFile: false,
    children: kids,
  }
}

const summaryTotals = computed(() => {
  const s = detail.value?.summary
  if (!s) {
    return null
  }
  return {
    pct: s.coverageRatePercent,
    instrumented: s.linesInstrumentOk,
    covered: s.linesCovered,
    uncovered: s.linesUncovered,
    none: s.linesNone,
    fail: s.linesFail,
  }
})

const currentFile = computed(() => {
  const p = selectedFilePath.value
  if (!p || !detail.value) {
    return null
  }
  return detail.value.files.find((f) => f.path === p) ?? null
})

/** 服务端 `source-file` 拉取结果缓存 */
const sourceLinesCache = ref<Record<string, string[]>>({})
/** 与缓存行对应的 Git 元信息（按 path） */
const sourceMetaCache = ref<
  Record<string, { commit: string; urlUsed: string; pathInRepo: string }>
>({})
const sourceLoading = ref(false)
const sourceError = ref('')

function resolveReportIdFromDetail(d: CoverageReportDetailVm | null): number | undefined {
  const r = d?.report
  if (!r || typeof r !== 'object') {
    return undefined
  }
  const id = (r as { id?: unknown }).id
  if (id == null) {
    return undefined
  }
  const n = Math.trunc(Number(id))
  return Number.isFinite(n) && n >= 1 ? n : undefined
}

const currentSourceMeta = computed(() => {
  const p = selectedFilePath.value
  if (!p) {
    return null
  }
  return sourceMetaCache.value[p] ?? null
})

watch(
  () => [selectedFilePath.value, detail.value, props.branchCoverageId] as const,
  async ([path, det, bcId]) => {
    sourceError.value = ''
    if (!path || !det || det.empty || bcId == null) {
      return
    }
    if (!det.files.some((f) => f.path === path)) {
      return
    }
    if (sourceLinesCache.value[path]) {
      return
    }
    const reportId = resolveReportIdFromDetail(det)
    sourceLoading.value = true
    try {
      const res = await api.fetchBranchCoverageSourceFile({
        branchCoverageId: bcId,
        path,
        ...(reportId != null ? { reportId } : {}),
      })
      sourceLinesCache.value = {
        ...sourceLinesCache.value,
        [path]: res.content.split(/\r?\n/),
      }
      sourceMetaCache.value = {
        ...sourceMetaCache.value,
        [path]: {
          commit: res.commit,
          urlUsed: res.urlUsed,
          pathInRepo: res.pathInRepo,
        },
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      sourceError.value = Array.isArray(msg)
        ? msg.join('；')
        : msg || '无法从服务端拉取源码，请稍后重试或对照本地仓库。'
    } finally {
      sourceLoading.value = false
    }
  },
)

const displayLines = computed(() => {
  const path = selectedFilePath.value
  const f = currentFile.value
  if (!f || !path) {
    return [] as { lineNumber: number; text: string; state: UiLineState; diffMark?: '+' | ' ' }[]
  }
  const src = sourceLinesCache.value[path] ?? []
  if (props.incrementalView && f.lineDetails?.length) {
    return [...f.lineDetails]
      .slice()
      .sort((a, b) => a.line - b.line)
      .map((d) => ({
        lineNumber: d.line,
        text: src[d.line - 1] ?? '',
        state: mapBackendLineToUiState(d),
        diffMark: d.diffMark,
      }))
  }
  const map = new Map(f.lineDetails.map((d) => [d.line, d]))
  let maxLine = src.length
  for (const d of f.lineDetails) {
    if (d.line > maxLine) {
      maxLine = d.line
    }
  }
  if (maxLine === 0 && f.lineDetails.length) {
    maxLine = Math.max(...f.lineDetails.map((d) => d.line))
  }
  const out: { lineNumber: number; text: string; state: UiLineState; diffMark?: '+' | ' ' }[] = []
  for (let i = 1; i <= maxLine; i++) {
    const d = map.get(i)
    const text = src[i - 1] ?? (d ? '\u2003' : '')
    const state: UiLineState = d ? mapBackendLineToUiState(d) : 'neutral'
    out.push({ lineNumber: i, text, state })
  }
  return out
})

async function loadDetail() {
  const id = props.branchCoverageId
  if (id == null) {
    detail.value = null
    return
  }
  loading.value = true
  try {
    detail.value = await api.fetchBranchCoverageDetail(id, {
      view: props.incrementalView ? 'incremental' : undefined,
    })
    const first = detail.value.files[0]?.path ?? null
    selectedFilePath.value = first
    await nextTickSelectTree()
  } catch (e: unknown) {
    detail.value = null
    const msg =
      (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    ElMessage.error(Array.isArray(msg) ? msg.join('；') : msg || '加载详情失败')
  } finally {
    loading.value = false
  }
}

async function nextTickSelectTree() {
  const path = selectedFilePath.value
  if (!path) {
    return
  }
  await nextTick()
  treeRef.value?.setCurrentKey?.(path)
}

function onTreeNodeClick(data: CoverageTreeItem) {
  if (!data.isFile || !data.filePath) {
    return
  }
  selectedFilePath.value = data.filePath
}

watch(
  () => [props.modelValue, props.branchCoverageId, props.incrementalView] as const,
  ([open, id]) => {
    if (open && id != null) {
      void loadDetail()
    }
    if (!open) {
      detail.value = null
      selectedFilePath.value = null
      sourceLinesCache.value = {}
      sourceMetaCache.value = {}
      sourceError.value = ''
    }
  },
)

const dialogTitle = computed(() => {
  const bc = detail.value?.branchCoverage
  const prefix = props.incrementalView ? '增量覆盖率详情' : '覆盖率详情'
  if (!bc) {
    return prefix
  }
  return `${prefix} · ${bc.projectName || '—'} / ${bc.testBranch || '—'}`
})

function lineClass(state: UiLineState) {
  if (state === 'covered') {
    return 'cov-line cov-line--covered'
  }
  if (state === 'missed') {
    return 'cov-line cov-line--missed'
  }
  if (state === 'fail') {
    return 'cov-line cov-line--fail'
  }
  return 'cov-line cov-line--neutral'
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="92%"
    top="3vh"
    destroy-on-close
    class="branch-cov-detail-dialog"
  >
    <div v-loading="loading" class="detail-wrap">
      <template v-if="detail && detail.empty">
        <el-alert type="info" :title="detail.message || '暂无覆盖率上报数据'" show-icon :closable="false" />
        <p v-if="detail.branchCoverage" class="bc-meta">
          {{ detail.branchCoverage.projectName }} · {{ detail.branchCoverage.testBranch }}
        </p>
      </template>

      <template v-else-if="detail && summaryTotals">
        <el-alert
          v-if="incrementalView && detail.diffContext?.error"
          type="error"
          show-icon
          :closable="false"
          class="mb"
          :title="`无法完成分支对比：${detail.diffContext.error}`"
        />
        <p v-else-if="incrementalView && detail.diffContext" class="diff-range-hint">
          对比范围：<strong>{{ detail.diffContext.baseBranch }}</strong>（主分支）→
          <strong>{{ detail.diffContext.headBranch }}</strong>（测试分支）· GitHub
        </p>
        <el-alert
          v-if="incrementalView && !detail.diffContext?.error && !detail.files.length && !detail.empty"
          type="warning"
          show-icon
          :closable="false"
          class="mb"
          title="对比范围内没有与覆盖率路径对齐的文件（请检查 relativeDir 与 GitHub 路径是否一致，或该次对比是否无 patch）。"
        />
        <div class="detail-summary">
          <div class="detail-summary__item">
            <span class="detail-summary__label">{{
              incrementalView ? '行覆盖率（diff 内）' : '行覆盖率'
            }}</span>
            <strong class="detail-summary__value">{{
              summaryTotals.pct != null ? `${summaryTotals.pct.toFixed(2)}%` : '—'
            }}</strong>
          </div>
          <div class="detail-summary__item">
            <span class="detail-summary__label">文件数</span>
            <strong>{{ detail.summary?.totalFiles ?? '—' }}</strong>
          </div>
          <div class="detail-summary__item">
            <span class="detail-summary__label">插桩成功行</span>
            <strong>{{ summaryTotals.instrumented }}</strong>
          </div>
          <div class="detail-summary__item">
            <span class="detail-summary__label">覆盖行</span>
            <strong class="text-covered">{{ summaryTotals.covered }}</strong>
          </div>
          <div class="detail-summary__item">
            <span class="detail-summary__label">未覆盖行</span>
            <strong class="text-missed">{{ summaryTotals.uncovered }}</strong>
          </div>
          <div v-if="summaryTotals.none > 0" class="detail-summary__item">
            <span class="detail-summary__label">未插桩行</span>
            <strong>{{ summaryTotals.none }}</strong>
          </div>
          <div v-if="summaryTotals.fail > 0" class="detail-summary__item">
            <span class="detail-summary__label">插桩失败行</span>
            <strong class="text-fail">{{ summaryTotals.fail }}</strong>
          </div>
        </div>

        <div class="detail-legend">
          <span class="legend-i legend-i--neutral">未插桩</span>
          <span class="legend-i legend-i--covered">已覆盖</span>
          <span class="legend-i legend-i--missed">未覆盖</span>
          <span class="legend-i legend-i--fail">插桩失败</span>
          <template v-if="incrementalView">
            <span class="legend-i legend-i--diffadd">diff + 新增行</span>
            <span class="legend-i legend-i--diffctx">diff 上下文行</span>
          </template>
        </div>

        <el-table
          :data="detail.files"
          border
          size="small"
          class="detail-file-table"
          max-height="220"
          style="width: 100%"
        >
          <el-table-column prop="path" label="文件" min-width="220" show-overflow-tooltip />
          <el-table-column label="插桩成功" width="92" align="right">
            <template #default="{ row }">{{ row.stats.instrumentOk }}</template>
          </el-table-column>
          <el-table-column label="覆盖" width="72" align="right">
            <template #default="{ row }">
              <span class="text-covered">{{ row.stats.covered }}</span>
            </template>
          </el-table-column>
          <el-table-column label="未覆盖" width="80" align="right">
            <template #default="{ row }">
              <span class="text-missed">{{ row.stats.uncovered }}</span>
            </template>
          </el-table-column>
          <el-table-column label="未插桩" width="80" align="right">
            <template #default="{ row }">{{ row.stats.none }}</template>
          </el-table-column>
          <el-table-column label="插桩失败" width="88" align="right">
            <template #default="{ row }">
              <span class="text-fail">{{ row.stats.fail }}</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="detail-split">
          <div class="detail-tree">
            <div class="detail-tree__caption">文件树</div>
            <el-scrollbar max-height="min(52vh, 560px)">
              <el-tree
                v-if="treeData.length"
                ref="treeRef"
                :data="treeData"
                node-key="id"
                highlight-current
                :props="{ label: 'label', children: 'children' }"
                default-expand-all
                @node-click="onTreeNodeClick"
              />
              <el-empty v-else description="无文件" :image-size="64" />
            </el-scrollbar>
          </div>
          <div class="detail-source">
            <div class="detail-source__caption">
              {{ incrementalView ? '源码与 diff（仅对比涉及行）' : '源码（与行级数据对齐）' }}
              <span v-if="currentFile" class="detail-source__path">{{ currentFile.path }}</span>
            </div>
            <p v-if="currentSourceMeta?.commit" class="detail-source__hint">
              Git：{{ currentSourceMeta.commit }}
              <template v-if="currentSourceMeta.pathInRepo">
                · {{ currentSourceMeta.pathInRepo }}
              </template>
            </p>
            <el-alert
              v-if="sourceError"
              :title="sourceError"
              type="warning"
              show-icon
              :closable="false"
              class="mb"
            />
            <div v-loading="sourceLoading" class="source-panel-inner">
              <el-scrollbar v-if="currentFile && displayLines.length" max-height="min(52vh, 560px)">
                <div class="source-code">
                  <div
                    v-for="ln in displayLines"
                    :key="`${currentFile.path}:${ln.lineNumber}`"
                    :class="lineClass(ln.state)"
                  >
                    <span v-if="incrementalView" class="source-code__diff" aria-hidden="true">{{
                      ln.diffMark === '+' ? '+' : ' '
                    }}</span>
                    <span class="source-code__no">{{ ln.lineNumber }}</span>
                    <span class="source-code__text">{{ ln.text }}</span>
                  </div>
                </div>
              </el-scrollbar>
              <el-empty
                v-else-if="currentFile && !displayLines.length"
                description="无行级数据"
                :image-size="80"
              />
              <el-empty v-else description="请从左侧选择文件" :image-size="80" />
            </div>
          </div>
        </div>
      </template>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.detail-wrap {
  min-height: 120px;
}

.bc-meta {
  margin-top: 12px;
  color: #606266;
  font-size: 13px;
}

.mb {
  margin-bottom: 8px;
}

.source-panel-inner {
  min-height: 120px;
}

.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 12px;
  padding: 8px 0;
}

.detail-summary__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.detail-summary__label {
  color: #909399;
  font-size: 13px;
}

.detail-summary__value {
  font-size: 18px;
  color: #409eff;
}

.text-covered {
  color: #67c23a;
}

.text-missed {
  color: #f56c6c;
}

.text-fail {
  color: #e6a23c;
}

.detail-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 10px;
  font-size: 12px;
}

.legend-i {
  padding: 2px 10px;
  border-radius: 4px;
}

.legend-i--neutral {
  background: #f4f4f5;
  color: #606266;
}

.legend-i--covered {
  background: #e7f5e9;
  color: #2d6a32;
}

.legend-i--missed {
  background: #fde8e8;
  color: #b83232;
}

.legend-i--fail {
  background: #fdf6ec;
  color: #b88230;
}

.legend-i--diffadd {
  background: #e3f2fd;
  color: #1565c0;
}

.legend-i--diffctx {
  background: #eceff1;
  color: #546e7a;
}

.diff-range-hint {
  margin: 0 0 10px;
  font-size: 13px;
  color: #606266;
}

.detail-file-table {
  margin-bottom: 12px;
}

.detail-split {
  display: grid;
  grid-template-columns: minmax(200px, 280px) 1fr;
  gap: 12px;
  min-height: 320px;
}

.detail-tree__caption,
.detail-source__caption {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.detail-source__path {
  font-weight: 400;
  color: #909399;
  margin-left: 8px;
  font-size: 12px;
  word-break: break-all;
}

.detail-source__hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.detail-tree {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
  background: #fafafa;
}

.detail-source {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
  min-width: 0;
  background: #fff;
}

.source-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre;
}

.cov-line {
  display: flex;
  gap: 8px;
  padding: 0 4px;
  border-left: 3px solid transparent;
}

.source-code__diff {
  flex: 0 0 1.25em;
  text-align: center;
  color: #607d8b;
  font-weight: 600;
  user-select: none;
}

.source-code__no {
  flex: 0 0 44px;
  text-align: right;
  color: #909399;
  user-select: none;
}

.source-code__text {
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.cov-line--neutral {
  background: #fafafa;
  border-left-color: #dcdfe6;
}

.cov-line--covered {
  background: #e8f5e9;
  border-left-color: #67c23a;
}

.cov-line--missed {
  background: #ffebee;
  border-left-color: #f56c6c;
}

.cov-line--fail {
  background: #fdf6ec;
  border-left-color: #e6a23c;
}

:deep(.el-tree-node__content) {
  height: 26px;
}
</style>

<style lang="scss">
.branch-cov-detail-dialog .el-dialog__body {
  padding-top: 8px;
}
</style>
