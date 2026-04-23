<script setup lang="ts">
defineOptions({ name: 'ProjectManageView' })
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as api from '@/api/projects'
import type { ProjectRow } from '@/api/projects'

const loading = ref(false)
const rows = ref<ProjectRow[]>([])
const total = ref(0)
const query = reactive({ keyword: '', page: 1, pageSize: 10 })

const dialogVisible = ref(false)
const saving = ref(false)
/** 编辑弹窗拉取 `/api/projects/detail` 时 */
const detailLoading = ref(false)
const formRef = ref<FormInstance>()
/** 编辑打开时「仓库 Token」输入框初值（trim）；保存时未改动则不传 repoToken，避免把脱敏占位当新 Token 提交 */
const editRepoTokenBaseline = ref('')
const form = reactive<{
  id?: number
  name: string
  code: string
  gitUrl: string
  mainBranch: string
  relativePath: string
  /** 新建必填时可填；编辑时空表示不修改后端已存 Token */
  repoToken: string
}>({
  name: '',
  code: '',
  gitUrl: '',
  mainBranch: 'master',
  relativePath: '',
  repoToken: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '必填', trigger: 'blur' }],
  code: [{ required: true, message: '必填', trigger: 'blur' }],
  gitUrl: [{ required: true, message: '必填', trigger: 'blur' }],
  mainBranch: [{ required: true, message: '必填', trigger: 'blur' }],
  relativePath: [{ required: true, message: '必填', trigger: 'blur' }],
}

async function load() {
  loading.value = true
  try {
    const res = await api.listProjects({
      keyword: query.keyword || undefined,
      page: query.page,
      pageSize: query.pageSize,
    })
    rows.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  detailLoading.value = false
  form.id = undefined
  form.name = ''
  form.code = ''
  form.gitUrl = ''
  form.mainBranch = 'master'
  form.relativePath = ''
  form.repoToken = ''
  editRepoTokenBaseline.value = ''
  dialogVisible.value = true
}

function applyProjectToForm(d: ProjectRow) {
  form.id = d.id
  form.name = d.name
  form.code = d.code
  form.gitUrl = d.gitUrl
  form.mainBranch = d.mainBranch || 'master'
  form.relativePath = d.relativePath
  const tokenForForm = d.repoToken ?? ''
  form.repoToken = tokenForForm
  editRepoTokenBaseline.value = tokenForForm.trim()
}

async function openEdit(row: ProjectRow) {
  dialogVisible.value = true
  detailLoading.value = true
  applyProjectToForm(row)
  try {
    const d = await api.fetchProjectDetail(row.id)
    applyProjectToForm(d)
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    ElMessage.error(Array.isArray(msg) ? msg.join('；') : msg || '加载项目详情失败')
    dialogVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

async function save() {
  await formRef.value?.validate()
  saving.value = true
  try {
    const token = form.repoToken.trim()
    if (form.id == null) {
      await api.createProject({
        name: form.name.trim(),
        code: form.code.trim(),
        gitUrl: form.gitUrl.trim(),
        mainBranch: form.mainBranch.trim() || 'master',
        relativePath: form.relativePath.trim(),
        ...(token ? { repoToken: token } : {}),
      })
      ElMessage.success('已创建')
    } else {
      const tokenChanged = token !== editRepoTokenBaseline.value
      const tokenToSend = tokenChanged && token ? token : undefined
      await api.updateProject({
        id: form.id,
        name: form.name.trim(),
        code: form.code.trim(),
        gitUrl: form.gitUrl.trim(),
        mainBranch: form.mainBranch.trim() || 'master',
        relativePath: form.relativePath.trim(),
        ...(tokenToSend ? { repoToken: tokenToSend } : {}),
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

async function onDelete(row: ProjectRow) {
  await ElMessageBox.confirm(`删除项目「${row.name}」？`, '提示', { type: 'warning' })
  await api.deleteProject(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="toolbar">
        <span>项目管理</span>
        <div class="toolbar__actions">
          <el-input
            v-model="query.keyword"
            clearable
            placeholder="名称 / code"
            style="width: 200px"
            @keyup.enter="load"
          />
          <el-button v-ui-code="'btn.project.query'" type="primary" @click="((query.page = 1), load())">
            查询
          </el-button>
          <el-button v-ui-code="'btn.project.add'" type="success" @click="openCreate">新建</el-button>
        </div>
      </div>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="项目名称" min-width="140" />
      <el-table-column prop="code" label="项目 code" min-width="120" />
      <el-table-column prop="gitUrl" label="Git 地址" min-width="220" show-overflow-tooltip />
      <el-table-column label="仓库 Token" width="100" align="center">
        <template #default="{ row }">
          {{ row.hasRepoToken ? '已配置' : '未配置' }}
        </template>
      </el-table-column>
      <el-table-column prop="mainBranch" label="主分支" width="120" />
      <el-table-column prop="relativePath" label="相对目录" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button v-ui-code="'btn.project.edit'" type="primary" link @click="openEdit(row)">
            编辑
          </el-button>
          <el-button v-ui-code="'btn.project.remove'" type="danger" link @click="onDelete(row)">
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

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑项目' : '新建项目'" width="600px" destroy-on-close>
    <div v-loading="detailLoading" class="project-dialog-form">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="form.name" maxlength="128" show-word-limit />
      </el-form-item>
      <el-form-item label="项目 code" prop="code">
        <el-input v-model="form.code" :disabled="form.id != null" maxlength="64" show-word-limit />
      </el-form-item>
      <el-form-item label="Git 地址" prop="gitUrl">
        <el-input v-model="form.gitUrl" placeholder="https://..." />
      </el-form-item>
      <el-form-item label="主分支" prop="mainBranch">
        <el-input v-model="form.mainBranch" placeholder="默认 master" />
      </el-form-item>
      <el-form-item label="相对目录" prop="relativePath">
        <el-input v-model="form.relativePath" placeholder="仓库内相对路径，如 packages/app" />
      </el-form-item>
      <el-form-item label="仓库 Token" prop="repoToken">
        <el-input
          v-model="form.repoToken"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="私有仓库拉取源码；编辑时回显脱敏/预览，仅当内容相对打开时有变化才更新 Token"
        />
      </el-form-item>
    </el-form>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="form.id != null && detailLoading"
        @click="save"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
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
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.project-dialog-form {
  min-height: 120px;
}
</style>
