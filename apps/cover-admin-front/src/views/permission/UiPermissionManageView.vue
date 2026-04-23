<script setup lang="ts">
defineOptions({ name: 'UiPermissionManageView' })
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as api from '@/api/uiPermissions'
import type { UiPermissionNode, UiPermissionType } from '@/types/permission'

const loading = ref(false)
const tree = ref<UiPermissionNode[]>([])
/** 默认只展开目录层，菜单可见、按钮默认折叠 */
const defaultExpandedKeys = ref<Array<string | number>>([])

const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
/** 新建时的父节点；编辑时为当前节点在树中的父节点（根节点则为 null） */
const dialogAnchorParent = ref<UiPermissionNode | null>(null)
const isDialogEdit = ref(false)

const form = reactive<{
  id?: string | number
  type: UiPermissionType
  name: string
  parentId: string | number | null
  code: string
  path: string
  sortOrder: number | null
  showInMenu: boolean
  remark: string
}>({
  type: 'menu',
  name: '',
  parentId: null,
  code: '',
  path: '',
  sortOrder: 0,
  showInMenu: true,
  remark: '',
})

/** 目录下只能建目录/菜单；菜单下只能建按钮；根下只能建目录/菜单 */
function allowedTypesForParent(parent: UiPermissionNode | null): UiPermissionType[] {
  if (parent == null) {
    return ['directory', 'menu']
  }
  if (parent.type === 'directory') {
    return ['directory', 'menu']
  }
  if (parent.type === 'menu') {
    return ['button']
  }
  return ['directory', 'menu']
}

const allowedTypes = computed(() => allowedTypesForParent(dialogAnchorParent.value))

watch(
  () => form.type,
  (t) => {
    if (t === 'button') {
      form.showInMenu = false
    }
  },
)

const rules: FormRules = {
  type: [{ required: true, message: '必填', trigger: 'change' }],
  name: [{ required: true, message: '必填', trigger: 'blur' }],
  code: [
    {
      validator: (_rule, value: string, cb) => {
        if (form.type === 'button' && !String(value || '').trim()) {
          cb(new Error('按钮须填写 code'))
        } else {
          cb()
        }
      },
      trigger: 'blur',
    },
  ],
}

function findParent(nodes: UiPermissionNode[], targetId: string | number): UiPermissionNode | null {
  for (const n of nodes) {
    for (const c of n.children ?? []) {
      if (String(c.id) === String(targetId)) {
        return n
      }
      const hit = findParent([c], targetId)
      if (hit) {
        return hit
      }
    }
  }
  return null
}

function syncFormTypeToAllowed(showHint: boolean) {
  const list = allowedTypes.value
  if (!list.includes(form.type)) {
    if (showHint) {
      ElMessage.warning('当前节点类型与父级约定不一致，已调整为允许的类型')
    }
    form.type = list[0]!
  }
}

const propsTree = {
  label: 'name',
  children: 'children',
}

function collectDirectoryIds(nodes: UiPermissionNode[]): Array<string | number> {
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

async function load() {
  loading.value = true
  try {
    tree.value = await api.fetchUiPermissionTree()
    defaultExpandedKeys.value = collectDirectoryIds(tree.value)
  } finally {
    loading.value = false
  }
}

function typeLabel(t: UiPermissionType) {
  if (t === 'directory') {
    return '目录'
  }
  if (t === 'menu') {
    return '菜单'
  }
  return '按钮'
}

function openCreate(parent?: UiPermissionNode | null) {
  isDialogEdit.value = false
  dialogAnchorParent.value = parent ?? null
  form.id = undefined
  form.name = ''
  form.parentId = parent?.id ?? null
  form.code = ''
  form.path = ''
  form.sortOrder = 0
  form.showInMenu = true
  form.remark = ''
  if (parent == null) {
    form.type = 'directory'
  } else if (parent.type === 'directory') {
    form.type = 'menu'
  } else if (parent.type === 'menu') {
    form.type = 'button'
  } else {
    form.type = 'menu'
  }
  if (form.type === 'button') {
    form.showInMenu = false
  }
  syncFormTypeToAllowed(false)
  dialogVisible.value = true
}

function openEdit(row: UiPermissionNode) {
  isDialogEdit.value = true
  dialogAnchorParent.value = findParent(tree.value, row.id)
  form.id = row.id
  form.type = row.type
  form.name = row.name
  form.parentId = row.parentId ?? null
  form.code = row.code ?? ''
  form.path = row.path ?? ''
  form.sortOrder = row.sortOrder ?? 0
  form.showInMenu = row.type === 'button' ? false : row.showInMenu !== false
  form.remark = row.remark ?? ''
  syncFormTypeToAllowed(true)
  dialogVisible.value = true
}

async function save() {
  await formRef.value?.validate()
  const p = dialogAnchorParent.value
  const allowed = allowedTypesForParent(p)
  if (!allowed.includes(form.type)) {
    ElMessage.error('当前父节点下不允许该类型，请重新选择')
    return
  }
  saving.value = true
  try {
    if (form.id == null) {
      await api.createUiPermission({
        type: form.type,
        name: form.name,
        parentId: form.parentId == null ? undefined : Number(form.parentId),
        code: form.code || undefined,
        path: form.type === 'menu' ? form.path || undefined : undefined,
        sortOrder: form.sortOrder ?? undefined,
        showInMenu: form.type === 'button' ? false : form.showInMenu,
        remark: form.remark || undefined,
      })
      ElMessage.success('已创建')
    } else {
      await api.updateUiPermission({
        id: Number(form.id),
        type: form.type,
        name: form.name,
        parentId: form.parentId == null ? undefined : Number(form.parentId),
        code: form.code || undefined,
        path: form.type === 'menu' ? form.path || undefined : undefined,
        sortOrder: form.sortOrder ?? undefined,
        showInMenu: form.type === 'button' ? false : form.showInMenu,
        remark: form.remark || undefined,
      })
      ElMessage.success('已保存')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete(row: UiPermissionNode) {
  await ElMessageBox.confirm(`删除节点「${row.name}」？子节点将级联删除。`, '提示', {
    type: 'warning',
  })
  await api.deleteUiPermission(Number(row.id))
  ElMessage.success('已删除')
  await load()
}

const moveDialog = ref(false)
const moveLoading = ref(false)
const moveSource = ref<UiPermissionNode | null>(null)
/** 目标父节点：`null` = 根目录；按钮只能选菜单为父 */
const moveParentId = ref<number | null>(null)

function collectDescendantIds(root: UiPermissionNode): Set<string> {
  const s = new Set<string>()
  const walk = (n: UiPermissionNode) => {
    s.add(String(n.id))
    ;(n.children ?? []).forEach(walk)
  }
  walk(root)
  return s
}

/** 可选父级：目录/菜单可移到根或任意「非自身及子孙」的目录下；按钮仅可选菜单 */
const moveTargetOptions = computed(() => {
  const src = moveSource.value
  if (!src) {
    return [] as { value: number; label: string }[]
  }
  const blocked = collectDescendantIds(src)
  const out: { value: number; label: string }[] = []

  const visit = (nodes: UiPermissionNode[], path: string) => {
    for (const n of nodes) {
      if (blocked.has(String(n.id))) {
        continue
      }
      const label = path ? `${path} / ${n.name}` : n.name
      if (src.type === 'button') {
        if (n.type === 'menu') {
          out.push({ value: Number(n.id), label })
        }
      } else if (n.type === 'directory') {
        out.push({ value: Number(n.id), label })
      }
      visit(n.children ?? [], label)
    }
  }
  visit(tree.value, '')
  return out
})

function openMove(row: UiPermissionNode) {
  moveSource.value = row
  const parent = findParent(tree.value, row.id)
  moveParentId.value = parent ? Number(parent.id) : null
  moveDialog.value = true
}

function onMoveDialogClosed() {
  moveSource.value = null
}

async function confirmMove() {
  const src = moveSource.value
  if (!src) {
    return
  }
  const parent = findParent(tree.value, src.id)
  const curPid = parent ? Number(parent.id) : null
  if (curPid === moveParentId.value) {
    ElMessage.info('目标与当前父级相同')
    return
  }
  if (src.type === 'button' && moveParentId.value == null) {
    ElMessage.warning('按钮须移动到某个菜单下')
    return
  }
  moveLoading.value = true
  try {
    await api.moveUiPermission({
      id: Number(src.id),
      parentId: moveParentId.value,
    })
    ElMessage.success('已移动')
    moveDialog.value = false
    await load()
  } finally {
    moveLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <el-card v-loading="loading" shadow="never">
    <template #header>
      <div class="toolbar">
        <span>菜单与按钮权限树</span>
        <el-button v-ui-code="'btn.ui_perm.add'" type="primary" @click="openCreate(null)">
          新建根节点
        </el-button>
      </div>
    </template>

    <el-tree :data="tree" node-key="id" :props="propsTree" :default-expanded-keys="defaultExpandedKeys">
      <template #default="{ data }">
        <div class="tree-node">
          <span class="tree-node__name">{{ data.name }}</span>
          <el-tag size="small" type="info">{{ typeLabel(data.type) }}</el-tag>
          <el-tag
            v-if="(data.type === 'menu' || data.type === 'directory') && data.showInMenu === false"
            size="small"
            type="warning"
          >
            侧栏隐藏
          </el-tag>
          <span v-if="data.code" class="tree-node__code">{{ data.code }}</span>
          <span v-if="data.path" class="tree-node__path">{{ data.path }}</span>
          <span class="tree-node__spacer" />
          <el-button
            v-if="data.type === 'directory' || data.type === 'menu'"
            v-ui-code="'btn.ui_perm.add'"
            link
            type="primary"
            @click.stop="openCreate(data)"
          >
            添加子级
          </el-button>
          <el-button v-ui-code="'btn.ui_perm.move'" link type="warning" @click.stop="openMove(data)">
            移动
          </el-button>
          <el-button v-ui-code="'btn.ui_perm.edit'" link type="primary" @click.stop="openEdit(data)">
            编辑
          </el-button>
          <el-button v-ui-code="'btn.ui_perm.remove'" link type="danger" @click.stop="onDelete(data)">
            删除
          </el-button>
        </div>
      </template>
    </el-tree>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑节点' : '新建节点'" width="560px">
    <el-alert
      v-if="!isDialogEdit && dialogAnchorParent"
      type="info"
      :closable="false"
      show-icon
      class="dialog-hint"
    >
      <template v-if="dialogAnchorParent.type === 'directory'">在目录下：仅可添加「目录」或「菜单」。</template>
      <template v-else-if="dialogAnchorParent.type === 'menu'">在菜单下：仅可添加「按钮」。</template>
    </el-alert>
    <el-alert v-else-if="!isDialogEdit && !dialogAnchorParent" type="info" :closable="false" show-icon class="dialog-hint">
      根级：仅可添加「目录」或「菜单」。
    </el-alert>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="dialog-form">
      <el-form-item label="类型" prop="type">
        <el-select v-model="form.type" :disabled="allowedTypes.length === 1">
          <el-option
            v-for="t in allowedTypes"
            :key="t"
            :label="typeLabel(t)"
            :value="t"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="code" prop="code">
        <el-input
          v-model="form.code"
          :placeholder="form.type === 'button' ? '按钮必填，建议全局唯一' : '可选（目录/菜单）'"
        />
      </el-form-item>
      <el-form-item v-if="form.type === 'menu'" label="path">
        <el-input v-model="form.path" placeholder="菜单路由，如 /system/user" />
      </el-form-item>
      <el-form-item v-if="form.type === 'directory' || form.type === 'menu'" label="侧栏显示">
        <el-switch v-model="form.showInMenu" active-text="显示" inactive-text="隐藏" />
        <span class="form-hint">与后端字段 showInMenu 一致；隐藏后仍参与权限校验，仅不在侧栏展示。</span>
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sortOrder" :min="0" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="moveDialog" title="移动节点" width="520px" destroy-on-close @closed="onMoveDialogClosed">
    <template v-if="moveSource">
      <p class="move-line">
        将「<strong>{{ moveSource.name }}</strong>」（{{ typeLabel(moveSource.type) }}）移动到：
      </p>
      <el-form label-width="100px">
        <el-form-item label="目标位置">
          <el-select v-model="moveParentId" filterable placeholder="选择父节点" style="width: 100%">
            <el-option
              v-if="moveSource.type !== 'button'"
              label="根目录（与一级节点并列）"
              :value="null"
            />
            <el-option
              v-for="o in moveTargetOptions"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <el-alert
        v-if="moveSource.type === 'button'"
        type="info"
        :closable="false"
        show-icon
        class="dialog-hint"
        title="按钮只能移动到「菜单」节点下。"
      />
      <el-alert
        v-else
        type="info"
        :closable="false"
        show-icon
        class="dialog-hint"
        title="目录/菜单可移动到根目录，或移动到任意「目录」下（不可移到自身及其子孙下，由后端校验）。"
      />
    </template>
    <template #footer>
      <el-button @click="moveDialog = false">取消</el-button>
      <el-button type="primary" :loading="moveLoading" @click="confirmMove">确定移动</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding-right: 8px;
}

.tree-node__name {
  font-weight: 500;
}

.tree-node__code,
.tree-node__path {
  font-size: 12px;
  color: #909399;
}

.tree-node__spacer {
  flex: 1;
}

.dialog-hint {
  margin-bottom: 12px;
}

.dialog-form {
  margin-top: 4px;
}

.move-line {
  margin: 0 0 12px;
  font-size: 14px;
  color: #606266;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
</style>
