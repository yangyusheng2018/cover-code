import { http } from './http'
import type { UserProfile } from '@/types/permission'

export interface RoleRow {
  id: number
  name: string
  code: string
  description?: string | null
}

export interface RoleListBody {
  keyword?: string
  page?: number
  pageSize?: number
}

export interface RoleListResult {
  list: RoleRow[]
  total: number
  page: number
  pageSize: number
}

export async function listRoles(body: RoleListBody) {
  const { data } = await http.post<RoleListResult>('/api/roles/list', body)
  return data
}

export async function getRoleDetail(id: number) {
  const { data } = await http.post<{
    role: RoleRow
    apiPermissionIds: number[]
    uiPermissionIds: number[]
  }>('/api/roles/detail', { id })
  return data
}

export async function createRole(body: {
  name: string
  code: string
  description?: string
}) {
  await http.post('/api/roles/create', body)
}

export async function updateRole(body: {
  id: number
  name?: string
  code?: string
  description?: string
}) {
  await http.post('/api/roles/update', body)
}

export async function deleteRole(id: number) {
  await http.post('/api/roles/delete', { id })
}

export async function assignUsers(roleId: number, userIds: number[]) {
  await http.post('/api/roles/assign-users', { roleId, userIds })
}

export async function removeUsers(roleId: number, userIds: number[]) {
  await http.post('/api/roles/remove-users', { roleId, userIds })
}

export async function setRoleApiPermissions(roleId: number, apiPermissionIds: number[]) {
  await http.post('/api/roles/set-api-permissions', { roleId, apiPermissionIds })
}

export async function setRoleUiPermissions(roleId: number, uiPermissionIds: number[]) {
  await http.post('/api/roles/set-ui-permissions', { roleId, uiPermissionIds })
}

export async function listRoleUsers(body: {
  roleId: number
  page?: number
  pageSize?: number
}) {
  const { data } = await http.post<{
    list: UserProfile[]
    total: number
    page: number
    pageSize: number
  }>('/api/roles/list-users', body)
  return data
}
