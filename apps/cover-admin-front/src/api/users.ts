import { http } from './http'
import type { UserProfile } from '@/types/permission'

export interface UserListBody {
  username?: string
  page?: number
  pageSize?: number
}

export interface UserListResult {
  list: UserProfile[]
  total: number
  page: number
  pageSize: number
}

export async function listUsers(body: UserListBody) {
  const { data } = await http.post<UserListResult>('/api/users/list', body)
  return data
}

export async function deleteUser(id: number) {
  await http.post('/api/users/delete', { id })
}

/** 与后端 `POST /api/users/register` 一致（公开接口，管理端用于代建用户） */
export async function registerUser(body: {
  username: string
  password: string
  email?: string
}) {
  const { data } = await http.post<UserProfile>('/api/users/register', body)
  return data
}

/** 当前登录用户修改自己的密码：`POST /api/users/change-password` */
export async function changeOwnPassword(body: { oldPassword: string; newPassword: string }) {
  const { data } = await http.post<{ message: string }>('/api/users/change-password', body)
  return data
}
