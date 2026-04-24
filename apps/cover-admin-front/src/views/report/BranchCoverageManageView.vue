<script setup lang="ts">
defineOptions({ name: 'BranchCoverageManageView' })
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as api from '@/api/branchCoverages'
import type { BranchCoverageRow } from '@/api/branchCoverages'
import * as projectsApi from '@/api/projects'
import type { ProjectOption } from '@/api/projects'
import BranchCoverageDetailDialog from '@/components/report/BranchCoverageDetailDialog.vue'

const loading = ref(false)
const rows = ref<BranchCoverageRow[]>([])
const total = ref(0)
const query = reactive({
  keyword: '',
  projectId: undefined as number | undefined,
  page: 1,
  pageSize: 10,
})

const projectOptions = ref<ProjectOption[]>([])
const projectsLoading = ref(false)

const dialogVisible = ref(false)
const detailVisible = ref(false)
const detailBranchCoverageId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<{
  id?: number
  projectId: number | undefined
  testBranch: string
}>({
  projectId: undefined,
  testBranch: '',
})

const rules: FormRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  testBranch: [{ required: true, message: '必填', trigger: 'blur' }],
}

const selectedProject = computed(() => {
  const id = form.projectId
  if (id == null) {
    return null
  }
  return projectOptions.value.find((p) => p.id === id) ?? null
})

async function loadProjectOptions() {
  projectsLoading.value = true
  try {
    projectOptions.value = await projectsApi.fetchProjectOptions()
  } finally {
    projectsLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const res = await api.listBranchCoverages({
      keyword: query.keyword || undefined,
      projectId: query.projectId,
      page: query.page,
      pageSize: query.pageSize,
      taskScope: 'full',
    })
    rows.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.id = undefined
  form.projectId = undefined
  form.testBranch = ''
  dialogVisible.value = true
}

function openEdit(row: BranchCoverageRow) {
  form.id = row.id
  form.projectId = row.projectId
  form.testBranch = row.testBranch
  dialogVisible.value = true
}

function openDetail(row: BranchCoverageRow) {
  detailBranchCoverageId.value = row.id
  detailVisible.value = true
}

async function save() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (form.id == null) {
      await api.createBranchCoverage({
        projectId: form.projectId!,
        testBranch: form.testBranch.trim(),
        taskScope: 'full',
      })
      ElMessage.success('已创建')
    } else {
      await api.updateBranchCoverage({
        id: form.id,
        projectId: form.projectId,
        testBranch: form.testBranch.trim(),
      })
      ElMessage.success('已保存')
    }
    dialogVisible.value = false
    await load()
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    ElMessage.error(Array.isArray(msg) ? msg.join('；') : msg || '保存失败')
  } finally {
    saving.value = false
  }
}

/** 删除本条任务配置，并级联删除其下全部覆盖率上报数据 */
async function onDelete(row: BranchCoverageRow) {
  await ElMessageBox.confirm(
    `将删除项目「${row.projectName}」、测试分支「${row.testBranch}」的本条任务，并删除其下全部覆盖率上报数据。此操作不可恢复。是否继续？`,
    '删除',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
  await api.deleteBranchCoverage(row.id)
  ElMessage.success('已删除本条任务及关联上报数据')
  await load()
}

async function onResetCoverage(row: BranchCoverageRow) {
  await ElMessageBox.confirm(
    `将清空项目「${row.projectName}」下测试分支「${row.testBranch}」的全部覆盖率上报数据（分支覆盖率配置保留，可重新上报）。是否继续？`,
    '重置覆盖率',
    { type: 'warning', confirmButtonText: '清空数据', cancelButtonText: '取消' },
  )
  try {
    const res = await api.resetBranchCoverageCoverage(row.id)
    const extra =
      typeof res.deletedReportCount === 'number' ? `（已移除 ${res.deletedReportCount} 条上报）` : ''
    ElMessage.success(`${res.message ?? '已重置'}${extra}`)
    await load()
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    ElMessage.error(Array.isArray(msg) ? msg.join('；') : msg || '重置失败')
  }
}

onMounted(async () => {
  await loadProjectOptions()
  await load()
})
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="toolbar">
        <span>全量覆盖率管理</span>
        <div class="toolbar__actions">
          <el-select
            v-model="query.projectId"
            clearable
            placeholder="全部项目"
            filterable
            style="width: 200px"
            :loading="projectsLoading"
          >
            <el-option
              v-for="p in projectOptions"
              :key="p.id"
              :label="`${p.name} (${p.code})`"
              :value="p.id"
            />
          </el-select>
          <el-input
            v-model="query.keyword"
            clearable
            placeholder="项目名称 / code / 分支"
            style="width: 200px"
            @keyup.enter="load"
          />
          <el-button
            v-ui-code="'btn.branch_coverage.query'"
            type="primary"
            @click="((query.page = 1), load())"
          >
            查询
          </el-button>
          <el-button v-ui-code="'btn.branch_coverage.add'" type="success" @click="openCreate">
            新建
          </el-button>
        </div>
      </div>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="projectId" label="项目 ID" width="90" />
      <el-table-column prop="projectCode" label="项目 code" min-width="120" />
      <el-table-column prop="projectName" label="项目名称" min-width="140" />
      <el-table-column prop="testBranch" label="测试分支" min-width="140" />
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button v-ui-code="'btn.branch_coverage.detail'" type="primary" link @click="openDetail(row)">
            查看详情
          </el-button>
          <el-button
            v-ui-code="'btn.branch_coverage.reset'"
            type="warning"
            link
            @click="onResetCoverage(row)"
          >
            重置覆盖率
          </el-button>
          <el-button v-ui-code="'btn.branch_coverage.edit'" type="primary" link @click="openEdit(row)">
            编辑
          </el-button>
          <el-button
            v-ui-code="'btn.branch_coverage.remove'"
            type="danger"
            link
            @click="onDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        background
        @current-change="load"
        @size-change="((query.page = 1), load())"
      />
    </div>
  </el-card>

  <el-dialog
    v-model="dialogVisible"
    :title="form.id ? '编辑分支覆盖率' : '新建分支覆盖率'"
    width="520px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
      <el-form-item label="项目" prop="projectId">
        <el-select
          v-model="form.projectId"
          filterable
          placeholder="选择项目"
          style="width: 100%"
          :loading="projectsLoading"
        >
          <el-option
            v-for="p in projectOptions"
            :key="p.id"
            :label="`${p.name} (${p.code})`"
            :value="p.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="selectedProject" label="项目 code">
        <el-input :model-value="selectedProject.code" disabled />
      </el-form-item>
      <el-form-item v-if="selectedProject" label="项目名称">
        <el-input :model-value="selectedProject.name" disabled />
      </el-form-item>
      <el-form-item label="测试分支" prop="testBranch">
        <el-input v-model="form.testBranch" placeholder="如 develop、release/x" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>

  <BranchCoverageDetailDialog v-model="detailVisible" :branch-coverage-id="detailBranchCoverageId" />
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
