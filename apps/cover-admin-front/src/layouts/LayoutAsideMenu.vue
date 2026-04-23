<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteRecordNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UiPermissionNode } from '@/types/permission'
import { isUiShownInSidebarMenu, normalizePath } from '@/utils/permission'
import UiMenuNodes from '@/layouts/UiMenuNodes.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const layoutChildren = computed(() => {
  const layout = router.getRoutes().find((r) => r.path === '/')
  return (layout?.children ?? []) as RouteRecordNormalized[]
})

const staticMenuRoutes = computed(() =>
  layoutChildren.value.filter((r) => r.meta?.showInMenu !== false),
)

function menuPathAllowed(path: string, useUiGate: boolean) {
  if (!useUiGate) {
    return true
  }
  if (!auth.effectiveUiTree.length) {
    return true
  }
  return auth.menuPaths.has(normalizePath(path))
}

function routeAllowed(r: RouteRecordNormalized) {
  const full = r.path === '' ? '/' : `/${r.path}`
  const useUi = r.meta.useUiPathGate === true
  return menuPathAllowed(full, useUi)
}

/** 无后端 UI 树时的侧边栏：用户 / 用户组 / 权限 */
const staticMenuGroups = computed(() => {
  const routes = staticMenuRoutes.value

  function pick(matcher: (r: RouteRecordNormalized) => boolean) {
    return routes.filter(matcher).filter(routeAllowed)
  }

  const groups: { title: string; routes: RouteRecordNormalized[] }[] = [
    { title: '欢迎', routes: pick((r) => r.path === 'home') },
    { title: '用户', routes: pick((r) => r.path === 'system/user') },
    {
      title: '用户组',
      routes: pick((r) => r.path === 'permission/roles'),
    },
    {
      title: '权限',
      routes: pick(
        (r) =>
          r.path === 'system/api-permission' || r.path === 'system/ui-permission',
      ),
    },
    {
      title: '上报',
      routes: pick(
        (r) =>
          r.path === 'report/project' ||
          r.path === 'report/branch-coverage' ||
          r.path === 'report/incremental-coverage',
      ),
    },
  ]

  return groups.filter((g) => g.routes.length > 0)
})

/** 侧栏用树：去掉按钮；`showInMenu === false` 的菜单不展示；无子级的目录去掉；目录自身不展示时将其子级上提一层 */
function filterSidebarTree(nodes: UiPermissionNode[]): UiPermissionNode[] {
  const out: UiPermissionNode[] = []
  for (const n of nodes) {
    if (n.type === 'button') {
      continue
    }
    const rawChildren = n.children?.length ? filterSidebarTree(n.children) : []
    if (n.type === 'directory') {
      if (!rawChildren.length) {
        continue
      }
      if (isUiShownInSidebarMenu(n)) {
        out.push({ ...n, children: rawChildren })
      } else {
        out.push(...rawChildren)
      }
      continue
    }
    if (n.type === 'menu') {
      if (!isUiShownInSidebarMenu(n)) {
        continue
      }
      out.push({ ...n, children: rawChildren })
    }
  }
  return out
}

const uiMenuTree = computed(() => filterSidebarTree(auth.effectiveUiTree))

const activeMenu = computed(() => route.path)

function routeIndex(r: RouteRecordNormalized) {
  return r.path === '' ? '/' : `/${r.path}`
}
</script>

<template>
  <el-scrollbar class="menu-scroll">
    <el-menu
      :default-active="activeMenu"
      class="aside-menu"
      background-color="#1f2d3d"
      text-color="#cfd8dc"
      active-text-color="#409eff"
      router
    >
      <template v-if="uiMenuTree.length">
        <UiMenuNodes :nodes="uiMenuTree" />
      </template>
      <template v-else>
        <template v-for="group in staticMenuGroups" :key="group.title">
          <el-sub-menu :index="`static-${group.title}`">
            <template #title>{{ group.title }}</template>
            <el-menu-item v-for="r in group.routes" :key="r.path" :index="routeIndex(r)">
              {{ r.meta.title ?? r.name }}
            </el-menu-item>
          </el-sub-menu>
        </template>
      </template>
    </el-menu>
  </el-scrollbar>
</template>

<style scoped lang="scss">
.menu-scroll {
  height: calc(100vh - 56px);
}

.aside-menu {
  border-right: none;
}
</style>
