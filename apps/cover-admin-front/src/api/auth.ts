import { http } from './http'
import type { MyPermissions, UiPermissionNode, UserProfile } from '@/types/permission'

export interface LoginBody {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  expiresIn?: number
  user: UserProfile
}

export async function login(body: LoginBody) {
  const { data } = await http.post<LoginResult>('/api/auth/login', body)
  return data
}

export async function logout(accessToken?: string | null) {
  await http.post('/api/auth/logout', accessToken ? { accessToken } : {})
}

export async function fetchProfile() {
  const { data } = await http.get<UserProfile>('/api/auth/profile')
  return data
}

export async function fetchMyPermissions() {
  const { data } = await http.get<MyPermissions>('/api/auth/my-permissions')
  return data
}

/** 切换当前会话角色（后端可能下发新 accessToken 与权限汇总） */
export interface SwitchRoleBody {
  roleId: number
}

export interface SwitchRoleResult {
  accessToken?: string
  expiresIn?: number
  user?: UserProfile
  /** 若与 my-permissions 结构一致则一次写回，否则由前端再拉 GET my-permissions */
  roles?: MyPermissions['roles']
  apiPermissionCodes?: string[]
  uiPermissionTree?: UiPermissionNode[]
}

export async function switchRole(body: SwitchRoleBody) {
  const { data } = await http.post<SwitchRoleResult>('/api/auth/switch-role', body)
  return data
}
