<script setup lang="ts">
defineOptions({ name: 'ApiPermissionManageView' })
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as api from '@/api/apiPermissions'
import type { ApiPermissionRow } from '@/api/apiPermissions'

const loading = ref(false)
const rows = ref<ApiPermissionRow[]>([])
const total = ref(0)
const query = reactive({ keyword: '', page: 1, pageSize: 10 })

const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<{
  id?: number
  code: string
  name: string
  httpMethod: string
  routePath: string
  description: string
}>({
  code: '',
  name: '',
  httpMethod: '',
  routePath: '',
  description: '',
})

const rules: FormRules = {
  code: [{ required: true, message: '必填', trigger: 'blur' }],
  name: [{ required: true, message: '必填', trigger: 'blur' }],
}

async function load() {
  loading.value = true
  try {
    const res = await api.listApiPermissions({
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
  form.id = undefined
  form.code = ''
  form.name = ''
  form.httpMethod = ''
  form.routePath = ''
  form.description = ''
  dialogVisible.value = true
}

function openEdit(row: ApiPermissionRow) {
  form.id = row.id
  form.code = row.code
  form.name = row.name
  form.httpMethod = row.httpMethod ?? ''
  form.routePath = row.routePath ?? ''
  form.description = row.description ?? ''
  dialogVisible.value = true
}

async function save() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (form.id == null) {
      await api.createApiPermission({
        code: form.code,
        name: form.name,
        httpMethod: form.httpMethod || undefined,
        routePath: form.routePath || undefined,
        description: form.description || undefined,
      })
      ElMessage.success('已创建')
    } else {
      await api.updateApiPermission({
        id: form.id,
        code: form.code,
        name: form.name,
        httpMethod: form.httpMethod || undefined,
        routePath: form.routePath || undefined,
        description: form.description || undefined,
      })
      ElMessage.success('已保存')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: ApiPermissionRow) {
  await ElMessageBox.confirm(`删除接口权限「${row.code}」？`, '提示', { type: 'warning' })
  await api.deleteApiPermission(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="toolbar">
        <span>接口权限</span>
        <div class="toolbar__actions">
          <el-input
            v-model="query.keyword"
            clearable
            placeholder="关键字"
            style="width: 200px"
            @keyup.enter="load"
          />
          <el-button v-ui-code="'btn.api_perm.query'" type="primary" @click="((query.page = 1), load())">
            查询
          </el-button>
          <el-button v-ui-code="'btn.api_perm.add'" type="success" @click="openCreate">新建</el-button>
        </div>
      </div>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="code" label="code" min-width="160" />
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column prop="httpMethod" label="方法" width="100" />
      <el-table-column prop="routePath" label="路由" min-width="200" />
      <el-table-column prop="description" label="说明" min-width="200" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button v-ui-code="'btn.api_perm.edit'" type="primary" link @click="openEdit(row)">
            编辑
          </el-button>
          <el-button v-ui-code="'btn.api_perm.remove'" type="danger" link @click="onDelete(row)">
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

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑接口权限' : '新建接口权限'" width="520px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="code" prop="code">
        <el-input v-model="form.code" :disabled="form.id != null" />
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="HTTP 方法">
        <el-input v-model="form.httpMethod" placeholder="如 POST" />
      </el-form-item>
      <el-form-item label="路由">
        <el-input v-model="form.routePath" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="form.description" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
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
</style>
