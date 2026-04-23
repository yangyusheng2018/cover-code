<script setup lang="ts">
defineOptions({ name: 'UserManageView' })
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as usersApi from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import type { UserProfile } from '@/types/permission'

const auth = useAuthStore()

const loading = ref(false)
const tableData = ref<UserProfile[]>([])
const total = ref(0)

const query = reactive({
  username: '',
  page: 1,
  pageSize: 10,
})

const createVisible = ref(false)
const createSaving = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
})

const createRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, val: string, cb) => {
        if (val !== createForm.password) {
          cb(new Error('两次输入的密码不一致'))
        } else {
          cb()
        }
      },
      trigger: 'blur',
    },
  ],
  email: [
    {
      validator: (_rule, val: string, cb) => {
        const s = String(val || '').trim()
        if (!s) {
          cb()
          return
        }
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
        if (ok) {
          cb()
        } else {
          cb(new Error('邮箱格式不正确'))
        }
      },
      trigger: 'blur',
    },
  ],
}

function openCreate() {
  createForm.username = ''
  createForm.password = ''
  createForm.confirmPassword = ''
  createForm.email = ''
  createVisible.value = true
}

async function submitCreate() {
  await createFormRef.value?.validate()
  createSaving.value = true
  try {
    await usersApi.registerUser({
      username: createForm.username.trim(),
      password: createForm.password,
      email: createForm.email.trim() || undefined,
    })
    ElMessage.success('用户已创建')
    createVisible.value = false
    query.page = 1
    await load()
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    ElMessage.error(Array.isArray(msg) ? msg.join('；') : msg || '创建失败')
  } finally {
    createSaving.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const res = await usersApi.listUsers({
      username: query.username || undefined,
      page: query.page,
      pageSize: query.pageSize,
    })
    tableData.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function onDelete(row: UserProfile) {
  await ElMessageBox.confirm(`确定删除用户「${row.username}」？`, '提示', {
    type: 'warning',
  })
  await usersApi.deleteUser(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="toolbar">
        <span>用户管理</span>
        <div class="toolbar__actions">
          <el-button
            v-if="auth.hasUiCode('btn.user.add')"
            type="success"
            @click="openCreate"
          >
            添加用户
          </el-button>
          <el-input
            v-model="query.username"
            clearable
            placeholder="用户名模糊查询"
            style="width: 220px"
            @keyup.enter="load"
          />
          <el-button v-ui-code="'btn.user.query'" type="primary" @click="((query.page = 1), load())">
            查询
          </el-button>
        </div>
      </div>
    </template>

    <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" min-width="140" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button v-ui-code="'btn.user.delete'" type="danger" link @click="onDelete(row)">
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
    v-model="createVisible"
    title="添加用户"
    width="480px"
    destroy-on-close
    @closed="() => createFormRef?.resetFields()"
  >
    <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="88px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="createForm.username" autocomplete="off" maxlength="64" show-word-limit />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="createForm.password" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="createForm.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="createForm.email" placeholder="可选" autocomplete="email" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createVisible = false">取消</el-button>
      <el-button type="primary" :loading="createSaving" @click="submitCreate">确定</el-button>
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
