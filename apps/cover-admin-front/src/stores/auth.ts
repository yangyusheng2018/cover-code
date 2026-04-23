import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import { getAccessToken, setAccessToken, tryRefreshSession } from '@/api/http'
import { isJwtExpiredOrSoon } from '@/utils/jwt'
import type { MyPermissions, RoleSummary, UiPermissionNode, UserProfile } from '@/types/permission'
import {
  collectMenuPaths,
  collectPathVariantsForUiGate,
  collectUiButtonCodes,
  hasUiButtonPermission,
} from '@/utils/permission'

const TOKEN_KEY = 'play_vue_bi_access_token'
const ACTIVE_ROLE_KEY = 'play_vue_bi_active_role_id'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const roles = ref<RoleSummary[]>([])
  const apiPermissionCodes = ref<string[]>([])
  const uiPermissionTree = ref<UiPermissionNode[]>([])
  const activeRoleId = ref<number | null>(null)

  const activeRole = computed(() => {
    if (activeRoleId.value == null) {
      return roles.value[0] ?? null
    }
    return roles.value.find((r) => r.id === activeRoleId.value) ?? roles.value[0] ?? null
  })

  /** 当前角色视角下的 UI 树：若角色对象携带独立树则用之，否则用登录汇总树 */
  const effectiveUiTree = computed<UiPermissionNode[]>(() => {
    const ar = activeRole.value
    if (ar?.uiPermissionTree?.length) {
      return ar.uiPermissionTree
    }
    return uiPermissionTree.value
  })

  const menuPaths = computed(() => collectMenuPaths(effectiveUiTree.value))
  const uiButtonCodes = computed(() => collectUiButtonCodes(effectiveUiTree.value))

  function canSeeRoutePath(path: string) {
    const p = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`
    if (p === '/') {
      return true
    }
    const tree = effectiveUiTree.value
    if (!tree.length) {
      return true
    }
    const allowed = menuPaths.value
    if (allowed.size === 0) {
      return true
    }
    return collectPathVariantsForUiGate(p).some((v) => allowed.has(v))
  }

  /** 按钮级 UI 权限：须在 `uiPermissionTree` 中存在对应 `code`；无 UI 树时不默认放行 */
  function hasUiCode(code: string) {
    const tree = effectiveUiTree.value
    if (!tree.length) {
      return false
    }
    return hasUiButtonPermission(code, tree)
  }

  function setActiveRoleId(id: number | null) {
    activeRoleId.value = id
    if (id == null) {
      sessionStorage.removeItem(ACTIVE_ROLE_KEY)
    } else {
      sessionStorage.setItem(ACTIVE_ROLE_KEY, String(id))
    }
  }

  function restoreActiveRole() {
    const raw = sessionStorage.getItem(ACTIVE_ROLE_KEY)
    if (!raw) {
      return
    }
    const id = Number(raw)
    if (!Number.isFinite(id)) {
      return
    }
    if (roles.value.some((r) => r.id === id)) {
      activeRoleId.value = id
    }
  }

  function applyMyPermissions(data: MyPermissions) {
    roles.value = data.roles ?? []
    apiPermissionCodes.value = data.apiPermissionCodes ?? []
    uiPermissionTree.value = data.uiPermissionTree ?? []
    restoreActiveRole()
    if (activeRoleId.value == null && roles.value.length) {
      setActiveRoleId(roles.value[0]!.id)
    }
  }

  async function loadSession() {
    let token = localStorage.getItem(TOKEN_KEY)

    if (token) {
      setAccessToken(token)
      // 避免「access 已过期 → 第一次 profile 必 401 → 再走拦截器 refresh」在 Network 里看到的首条 401
      if (isJwtExpiredOrSoon(token, 90)) {
        const next = await tryRefreshSession()
        if (next) {
          token = next
          localStorage.setItem(TOKEN_KEY, next)
          setAccessToken(next)
        } else {
          await clearSession()
          return false
        }
      }
    } else {
      // 无本地 access 时仍可能仅有 HttpOnly refresh Cookie，静默换票一次
      const next = await tryRefreshSession()
      if (next) {
        token = next
        localStorage.setItem(TOKEN_KEY, next)
        setAccessToken(next)
      }
    }

    if (!getAccessToken()) {
      return false
    }

    try {
      user.value = await authApi.fetchProfile()
      const perm = await authApi.fetchMyPermissions()
      applyMyPermissions(perm)
      return true
    } catch {
      await clearSession()
      return false
    }
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    setAccessToken(res.accessToken)
    user.value = res.user
    const perm = await authApi.fetchMyPermissions()
    applyMyPermissions(perm)
  }

  async function logout() {
    const token = localStorage.getItem(TOKEN_KEY)
    try {
      await authApi.logout(token)
    } catch {
      /* ignore */
    }
    await clearSession()
  }

  async function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    setAccessToken(null)
    user.value = null
    roles.value = []
    apiPermissionCodes.value = []
    uiPermissionTree.value = []
    activeRoleId.value = null
    sessionStorage.removeItem(ACTIVE_ROLE_KEY)
  }

  async function refreshPermissions() {
    const perm = await authApi.fetchMyPermissions()
    applyMyPermissions(perm)
  }

  /**
   * 调用后端切换当前会话角色，并更新 token（若有）与权限数据。
   */
  async function switchRole(roleId: number) {
    const res = await authApi.switchRole({ roleId })
    if (res.accessToken) {
      localStorage.setItem(TOKEN_KEY, res.accessToken)
      setAccessToken(res.accessToken)
    }
    if (res.user) {
      user.value = res.user
    }
    setActiveRoleId(roleId)
    const hasPermBundle =
      Array.isArray(res.roles) &&
      Array.isArray(res.apiPermissionCodes) &&
      Array.isArray(res.uiPermissionTree)
    if (hasPermBundle) {
      applyMyPermissions({
        roles: res.roles!,
        apiPermissionCodes: res.apiPermissionCodes!,
        uiPermissionTree: res.uiPermissionTree!,
      })
    } else {
      const perm = await authApi.fetchMyPermissions()
      applyMyPermissions(perm)
    }
  }

  return {
    user,
    roles,
    apiPermissionCodes,
    uiPermissionTree,
    activeRoleId,
    activeRole,
    effectiveUiTree,
    menuPaths,
    uiButtonCodes,
    canSeeRoutePath,
    hasUiCode,
    setActiveRoleId,
    loadSession,
    login,
    logout,
    refreshPermissions,
    switchRole,
  }
})
