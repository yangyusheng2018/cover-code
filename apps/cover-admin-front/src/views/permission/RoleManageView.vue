<script setup lang="ts">
defineOptions({ name: 'RoleManageView' })
import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as rolesApi from '@/api/roles'
import type { RoleRow } from '@/api/roles'
import * as usersApi from '@/api/users'
import * as apiPermApi from '@/api/apiPermissions'
import * as uiPermApi from '@/api/uiPermissions'
import type { UserProfile } from '@/types/permission'
import type { ApiPermissionRow } from '@/api/apiPermissions'
import type { UiPermissionNode } from '@/types/permission'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const loading = ref(false)
const rows = ref<RoleRow[]>([])
const total = ref(0)
const query = reactive({ keyword: '', page: 1, pageSize: 10 })

const editVisible = ref(false)
const editSaving = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive<{ id?: number; name: string; code: string; description: string }>({
  name: '',
  code: '',
  description: '',
})
const editRules: FormRules = {
  name: [{ required: true, message: '必填', trigger: 'blur' }],
  code: [{ required: true, message: '必填', trigger: 'blur' }],
}

const manageVisible = ref(false)
const currentRole = ref<RoleRow | null>(null)
const manageTab = ref<'users' | 'api' | 'ui'>('users')

const roleUsersLoading = ref(false)
const roleUsers = ref<UserProfile[]>([])
const roleUserTotal = ref(0)
const roleUserQuery = reactive({ page: 1, pageSize: 10 })

const allUsersLoading = ref(false)
const allUsers = ref<UserProfile[]>([])
const pickedUserIds = ref<number[]>([])

const apiTreeLoading = ref(false)
const allApiPerms = ref<ApiPermissionRow[]>([])
const checkedApiIds = ref<number[]>([])

const uiTreeLoading = ref(false)
const fullUiTree = ref<UiPermissionNode[]>([])
const uiTreeRef = ref()
const checkedUiKeys = ref<number[]>([])
const uiDefaultExpandedKeys = ref<Array<string | number>>([])

/** 与 el-tree node-key 一致，避免 string/number 混用导致勾选状态错乱 */
function coerceNodeId(id: string | number): string | number {
  if (typeof id === 'number' && Number.isFinite(id)) {
    return id
  }
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    return Number(id)
  }
  return id
}

function normalizeUiTreeIds(nodes: UiPermissionNode[]): UiPermissionNode[] {
  return (nodes ?? []).map((n) => ({
    ...n,
    id: coerceNodeId(n.id),
    parentId: n.parentId == null ? null : coerceNodeId(n.parentId),
    children: n.children?.length ? normalizeUiTreeIds(n.children) : [],
  }))
}

/**
 * 恢复勾选时只用「叶子 id」调用 el-tree#setCheckedKeys。
 * 保存时合并了 getHalfCheckedKeys（半选祖先 id），若恢复时把非叶子 id 一并传入，
 * Element Plus 会对非叶子执行 setChecked(true, true)，整棵子树会被打成全选。
 */
function leafUiKeysFromSavedIds(savedIds: number[], nodes: UiPermissionNode[]): number[] {
  const saved = new Set(savedIds.map((id) => Number(id)))
  const out: number[] = []
  const walk = (list: UiPermissionNode[]) => {
    for (const n of list) {
      const id = Number(coerceNodeId(n.id))
      const kids = n.children?.length ? n.children : []
      if (kids.length) {
        walk(kids)
      } else if (saved.has(id)) {
        out.push(id)
      }
    }
  }
  walk(nodes)
  return out
}

/** 默认只展开到菜单层：展开目录节点，菜单节点保持折叠（按钮默认不展示） */
function collectUiDefaultExpandedKeys(nodes: UiPermissionNode[]): Array<string | number> {
  const out: Array<string | number> = []
  const stack = [...(nodes ?? [])]
  while (stack.length) {
    const n = stack.pop()!
    if (n.type === 'directory') {
      out.push(n.id)
    }
    if (n.children?.length) {
      stack.push(...n.children)
    }
  }
  return out
}

async function syncUiTreeCheckedKeys() {
  if (!manageVisible.value || manageTab.value !== 'ui' || !fullUiTree.value.length) {
    return
  }
  await nextTick()
  const leafKeys = leafUiKeysFromSavedIds(checkedUiKeys.value, fullUiTree.value)
  uiTreeRef.value?.setCheckedKeys?.(leafKeys, false)
}

watch(
  [manageVisible, manageTab, fullUiTree, checkedUiKeys, () => currentRole.value?.id ?? 0],
  async () => {
    await syncUiTreeCheckedKeys()
  },
  { flush: 'post' },
)

async function loadRoles() {
  loading.value = true
  try {
    const res = await rolesApi.listRoles({
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
  editForm.id = undefined
  editForm.name = ''
  editForm.code = ''
  editForm.description = ''
  editVisible.value = true
}

function openEdit(row: RoleRow) {
  editForm.id = row.id
  editForm.name = row.name
  editForm.code = row.code
  editForm.description = row.description ?? ''
  editVisible.value = true
}

async function saveRole() {
  await editFormRef.value?.validate()
  editSaving.value = true
  try {
    if (editForm.id == null) {
      await rolesApi.createRole({
        name: editForm.name,
        code: editForm.code,
        description: editForm.description || undefined,
      })
      ElMessage.success('已创建')
    } else {
      await rolesApi.updateRole({
        id: editForm.id,
        name: editForm.name,
        code: editForm.code,
        description: editForm.description || undefined,
      })
      ElMessage.success('已保存')
    }
    editVisible.value = false
    await loadRoles()
  } finally {
    editSaving.value = false
  }
}

async function onDelete(row: RoleRow) {
  await ElMessageBox.confirm(`删除角色「${row.name}」？`, '提示', { type: 'warning' })
  await rolesApi.deleteRole(row.id)
  ElMessage.success('已删除')
  await loadRoles()
}

async function openManage(row: RoleRow) {
  currentRole.value = row
  manageTab.value = 'users'
  manageVisible.value = true
  await refreshRoleDetail()
  await loadAllUsers()
}

async function refreshRoleDetail() {
  if (!currentRole.value) {
    return
  }
  const detail = await rolesApi.getRoleDetail(currentRole.value.id)
  currentRole.value = detail.role
  checkedApiIds.value = [...detail.apiPermissionIds]
  checkedUiKeys.value = detail.uiPermissionIds.map((id) => Number(id))
  await loadRoleUsers()
}

async function loadRoleUsers() {
  if (!currentRole.value) {
    return
  }
  roleUsersLoading.value = true
  try {
    const res = await rolesApi.listRoleUsers({
      roleId: currentRole.value.id,
      page: roleUserQuery.page,
      pageSize: roleUserQuery.pageSize,
    })
    roleUsers.value = res.list
    roleUserTotal.value = res.total
  } finally {
    roleUsersLoading.value = false
  }
}

async function loadAllUsers() {
  allUsersLoading.value = true
  try {
    const res = await usersApi.listUsers({
      page: 1,
      pageSize: 100,
    })
    allUsers.value = res.list
  } finally {
    allUsersLoading.value = false
  }
}

async function assignPickedUsers() {
  if (!currentRole.value || !pickedUserIds.value.length) {
    return
  }
  await rolesApi.assignUsers(currentRole.value.id, pickedUserIds.value)
  ElMessage.success('已添加用户')
  pickedUserIds.value = []
  await loadRoleUsers()
}

async function removeUser(u: UserProfile) {
  if (!currentRole.value) {
    return
  }
  await rolesApi.removeUsers(currentRole.value.id, [u.id])
  ElMessage.success('已移除')
  await loadRoleUsers()
}

async function loadAllApi() {
  apiTreeLoading.value = true
  try {
    const res = await apiPermApi.listApiPermissions({ page: 1, pageSize: 500 })
    allApiPerms.value = res.list
  } finally {
    apiTreeLoading.value = false
  }
}

async function saveApiBindings() {
  if (!currentRole.value) {
    return
  }
  await rolesApi.setRoleApiPermissions(currentRole.value.id, checkedApiIds.value)
  ElMessage.success('接口权限已更新')
  await auth.refreshPermissions()
}

async function loadFullUiTree() {
  uiTreeLoading.value = true
  try {
    const raw = await uiPermApi.fetchUiPermissionTree()
    fullUiTree.value = normalizeUiTreeIds(raw)
    uiDefaultExpandedKeys.value = collectUiDefaultExpandedKeys(fullUiTree.value)
    await syncUiTreeCheckedKeys()
  } finally {
    uiTreeLoading.value = false
  }
}

async function saveUiBindings() {
  if (!currentRole.value) {
    return
  }
  const tree = uiTreeRef.value
  const checked: number[] = tree?.getCheckedKeys?.() ?? checkedUiKeys.value
  const half: number[] = tree?.getHalfCheckedKeys?.() ?? []
  const merged = Array.from(new Set<number>([...checked, ...half]))
  await rolesApi.setRoleUiPermissions(currentRole.value.id, merged)
  ElMessage.success('菜单/按钮权限已更新')
  await auth.refreshPermissions()
}

watch(
  () => manageTab.value,
  async (tab) => {
    if (!manageVisible.value) {
      return
    }
    if (tab === 'users') {
      await loadAllUsers()
    }
    if (tab === 'api') {
      await loadAllApi()
    }
    if (tab === 'ui') {
      await loadFullUiTree()
    }
  },
)

onMounted(loadRoles)
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="toolbar">
        <span>用户角色</span>
        <div class="toolbar__actions">
          <el-input
            v-model="query.keyword"
            clearable
            placeholder="关键字"
            style="width: 200px"
            @keyup.enter="loadRoles"
          />
          <el-button v-ui-code="'btn.role.query'" type="primary" @click="((query.page = 1), loadRoles())">
            查询
          </el-button>
          <el-button v-ui-code="'btn.role.create'" type="success" @click="openCreate">新建角色</el-button>
        </div>
      </div>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column prop="code" label="编码" min-width="140" />
      <el-table-column prop="description" label="说明" min-width="200" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-ui-code="'btn.role.manage'" type="primary" link @click="openManage(row)">
            权限与用户
          </el-button>
          <el-button v-ui-code="'btn.role.edit'" type="primary" link @click="openEdit(row)">
            编辑
          </el-button>
          <el-button v-ui-code="'btn.role.delete'" type="danger" link @click="onDelete(row)">
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
        @current-change="loadRoles"
        @size-change="((query.page = 1), loadRoles())"
      />
    </div>
  </el-card>

  <el-dialog v-model="editVisible" :title="editForm.id ? '编辑角色' : '新建角色'" width="520px">
    <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="88px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="editForm.name" />
      </el-form-item>
      <el-form-item label="编码" prop="code">
        <el-input v-model="editForm.code" :disabled="editForm.id != null" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="editForm.description" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" :loading="editSaving" @click="saveRole">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="manageVisible" :title="`角色：${currentRole?.name ?? ''}`" width="900px" destroy-on-close>
    <el-tabs v-model="manageTab">
      <el-tab-pane label="角色成员" name="users">
        <div class="pane">
          <div class="pane__row">
            <el-select
              v-model="pickedUserIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="选择要加入角色的用户"
              style="width: 100%"
              :loading="allUsersLoading"
            >
              <el-option
                v-for="u in allUsers"
                :key="u.id"
                :label="u.username"
                :value="u.id"
              />
            </el-select>
            <el-button v-ui-code="'btn.role.assign_users'" type="primary" @click="assignPickedUsers">
              添加选中用户
            </el-button>
          </div>
          <el-table v-loading="roleUsersLoading" :data="roleUsers" border size="small" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button v-ui-code="'btn.role.remove_user'" type="danger" link @click="removeUser(row)">
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pager pager--mini">
            <el-pagination
              v-model:current-page="roleUserQuery.page"
              v-model:page-size="roleUserQuery.pageSize"
              :total="roleUserTotal"
              size="small"
              layout="total, prev, pager, next"
              @current-change="loadRoleUsers"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="接口权限" name="api">
        <div v-loading="apiTreeLoading" class="pane">
          <el-alert
            title="保存后将整表替换该角色的接口权限绑定（与后端约定一致）。"
            type="info"
            :closable="false"
            show-icon
            class="mb"
          />
          <el-checkbox-group v-model="checkedApiIds">
            <el-scrollbar max-height="360px">
              <div class="api-grid">
                <el-checkbox v-for="a in allApiPerms" :key="a.id" :value="a.id">
                  {{ a.code }} — {{ a.name }}
                </el-checkbox>
              </div>
            </el-scrollbar>
          </el-checkbox-group>
          <el-button v-ui-code="'btn.role.save_api'" type="primary" @click="saveApiBindings">
            保存接口权限
          </el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="菜单 / 按钮" name="ui">
        <div v-loading="uiTreeLoading" class="pane">
          <el-alert
            title="勾选节点保存后整表替换该角色的 UI 权限；父子联动会包含半选祖先节点。"
            type="info"
            :closable="false"
            show-icon
            class="mb"
          />
          <el-tree
            v-if="fullUiTree.length"
            :key="`role-ui-${currentRole?.id ?? 0}`"
            ref="uiTreeRef"
            :data="fullUiTree"
            node-key="id"
            show-checkbox
            :default-expanded-keys="uiDefaultExpandedKeys"
            :props="{ label: 'name', children: 'children' }"
          />
          <el-empty v-else description="暂无 UI 权限树" />
          <el-button v-ui-code="'btn.role.save_ui'" type="primary" class="mt" @click="saveUiBindings">
            保存菜单与按钮
          </el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
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

.pager--mini {
  margin-top: 8px;
}

.pane__row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.api-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 8px;
}

.mb {
  margin-bottom: 12px;
}

.mt {
  margin-top: 12px;
}
</style>
