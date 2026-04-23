import type { UiPermissionNode } from '@/types/permission'

function walkUiCodes(nodes: UiPermissionNode[] | undefined, out: Set<string>) {
  if (!nodes?.length) {
    return
  }
  for (const n of nodes) {
    if (n.type === 'button' && n.code) {
      out.add(n.code)
    }
    walkUiCodes(n.children, out)
  }
}

export function collectUiButtonCodes(tree: UiPermissionNode[]) {
  const set = new Set<string>()
  walkUiCodes(tree, set)
  return set
}

export function hasUiButtonPermission(code: string, tree: UiPermissionNode[]) {
  return collectUiButtonCodes(tree).has(code)
}

/**
 * 将 UI 树中所有带 `path` 的 `menu` 节点纳入路由门禁（与 `showInMenu` 无关）；
 * 侧栏展示过滤见 `isUiShownInSidebarMenu` / `LayoutAsideMenu`。
 */
export function collectMenuPaths(tree: UiPermissionNode[]) {
  const paths = new Set<string>()
  const walk = (nodes: UiPermissionNode[] | undefined) => {
    if (!nodes?.length) {
      return
    }
    for (const n of nodes) {
      if (n.type === 'menu' && n.path) {
        paths.add(normalizePath(n.path))
      }
      walk(n.children)
    }
  }
  walk(tree)
  return paths
}

export function normalizePath(p: string) {
  if (!p) {
    return '/'
  }
  return p.startsWith('/') ? p : `/${p}`
}

/**
 * 侧栏菜单栏是否展示该节点（与后端 `showInMenu` 一致：仅 `false` 为隐藏；缺省为 true）。
 * 按钮不在侧栏以菜单项展示。
 */
export function isUiShownInSidebarMenu(n: UiPermissionNode): boolean {
  if (n.type === 'button') {
    return false
  }
  return n.showInMenu !== false
}

/**
 * 同一功能在前端注册了多条路由 path 时，与后端 UI 菜单里其中任一条对齐即可放行。
 * （常见：菜单为 /system/user，前端短链为 /users）
 */
const UI_GATE_PATH_GROUPS: readonly (readonly string[])[] = [
  ['/users', '/system/user'],
  ['/permission/roles', '/system/role'],
  ['/report/project', '/system/project'],
  ['/report/branch-coverage', '/system/branch-coverage'],
  ['/report/incremental-coverage', '/system/incremental-coverage'],
]

/** 供 UI 路径门禁：返回与当前 path 等价的一组 path（已 normalize） */
export function collectPathVariantsForUiGate(path: string): string[] {
  const p = normalizePath(path)
  if (p === '/') {
    return ['/']
  }
  for (const group of UI_GATE_PATH_GROUPS) {
    const normalized = group.map((x) => normalizePath(x))
    if (normalized.includes(p)) {
      return [...new Set(normalized)]
    }
  }
  return [p]
}
