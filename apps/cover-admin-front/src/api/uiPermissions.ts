/**
 * UI 权限接口；请求/响应字段与后端文档一致：
 * `cover-admin/docs/API.md` →「六、菜单与按钮权限树」
 */
import { http } from './http'
import type { UiPermissionNode, UiPermissionType } from '@/types/permission'

export async function listUiPermissions(parentId?: number | null) {
  const { data } = await http.post<UiPermissionNode[]>('/api/ui-permissions/list', {
    parentId,
  })
  return data
}

export async function fetchUiPermissionTree() {
  const { data } = await http.get<UiPermissionNode[]>('/api/ui-permissions/tree')
  return data
}

export async function createUiPermission(body: {
  type: UiPermissionType
  name: string
  parentId?: number | null
  code?: string
  path?: string
  sortOrder?: number
  showInMenu?: boolean
  remark?: string
}) {
  await http.post('/api/ui-permissions/create', body)
}

export async function updateUiPermission(body: {
  id: number
  type?: UiPermissionType
  name?: string
  parentId?: number | null
  code?: string
  path?: string
  sortOrder?: number
  showInMenu?: boolean
  remark?: string
}) {
  await http.post('/api/ui-permissions/update', body)
}

export async function deleteUiPermission(id: number) {
  await http.post('/api/ui-permissions/delete', { id })
}

/** 移动节点：`parentId` 为 `null` 表示根下，否则为目标父节点 id（服务端校验环路） */
export async function moveUiPermission(body: { id: number; parentId: number | null }) {
  await http.post('/api/ui-permissions/move', body)
}
