import { http } from './http'

export interface ApiPermissionRow {
  id: number
  code: string
  name: string
  httpMethod?: string | null
  routePath?: string | null
  description?: string | null
}

export interface ApiPermissionListBody {
  keyword?: string
  page?: number
  pageSize?: number
}

export interface ApiPermissionListResult {
  list: ApiPermissionRow[]
  total: number
  page: number
  pageSize: number
}

export async function listApiPermissions(body: ApiPermissionListBody) {
  const { data } = await http.post<ApiPermissionListResult>(
    '/api/api-permissions/list',
    body,
  )
  return data
}

export async function createApiPermission(body: {
  code: string
  name: string
  httpMethod?: string
  routePath?: string
  description?: string
}) {
  await http.post('/api/api-permissions/create', body)
}

export async function updateApiPermission(body: {
  id: number
  code?: string
  name?: string
  httpMethod?: string
  routePath?: string
  description?: string
}) {
  await http.post('/api/api-permissions/update', body)
}

export async function deleteApiPermission(id: number) {
  await http.post('/api/api-permissions/delete', { id })
}
