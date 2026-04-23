<script setup lang="ts">
import type { UiPermissionNode } from '@/types/permission'
import { isUiShownInSidebarMenu, normalizePath } from '@/utils/permission'
import UiMenuNodes from './UiMenuNodes.vue'

defineProps<{
  nodes: UiPermissionNode[]
}>()

/** 作为分组、需要展开子级的中间「菜单」节点（后端 type 仍为 menu） */
function navigableChildren(n: UiPermissionNode): UiPermissionNode[] {
  return (n.children ?? []).filter(
    (c) => (c.type === 'directory' || c.type === 'menu') && isUiShownInSidebarMenu(c),
  )
}

function isBranchMenu(n: UiPermissionNode) {
  return n.type === 'menu' && navigableChildren(n).length > 0
}

function menuIndex(n: UiPermissionNode) {
  if (n.type === 'menu' && n.path) {
    return normalizePath(n.path)
  }
  return `dir-${n.id}`
}

function branchIndex(n: UiPermissionNode) {
  return `menu-branch-${n.id}`
}
</script>

<template>
  <template v-for="node in nodes" :key="`${node.type}-${node.id}`">
    <el-sub-menu v-if="node.type === 'directory'" :index="`dir-${node.id}`">
      <template #title>{{ node.name }}</template>
      <UiMenuNodes :nodes="node.children ?? []" />
    </el-sub-menu>
    <el-sub-menu v-else-if="isBranchMenu(node)" :index="branchIndex(node)">
      <template #title>{{ node.name }}</template>
      <UiMenuNodes :nodes="navigableChildren(node)" />
    </el-sub-menu>
    <el-menu-item v-else-if="node.type === 'menu'" :index="menuIndex(node)">
      {{ node.name }}
    </el-menu-item>
  </template>
</template>
