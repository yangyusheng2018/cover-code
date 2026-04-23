export type UiPermissionType = 'directory' | 'menu' | 'button'

export interface UiPermissionNode {
  /** 后端可能用字符串数字 */
  id: string | number
  parentId: string | number | null
  type: UiPermissionType
  name: string
  code?: string | null
  path?: string | null
  sortOrder?: number | null
  /** 是否出现在侧栏菜单；缺省同后端为 `true`；按钮种子多为 `false` */
  showInMenu?: boolean | null
  remark?: string | null
  children?: UiPermissionNode[]
}

export interface RoleSummary {
  id: number
  name: string
  code: string
  description?: string | null
  /** 若后端按角色下发权限，可携带；否则使用 my-permissions 顶层汇总 */
  apiPermissionCodes?: string[]
  uiPermissionTree?: UiPermissionNode[]
}

export interface MyPermissions {
  roles: RoleSummary[]
  apiPermissionCodes: string[]
  uiPermissionTree: UiPermissionNode[]
  summary?: {
    roleCount: number
    apiPermissionCount: number
    uiTreeNodeCount: number
  }
}

export interface UserProfile {
  id: number
  username: string
  email?: string | null
}
