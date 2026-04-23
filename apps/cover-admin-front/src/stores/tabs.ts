import { ref } from "vue";
import { defineStore } from "pinia";

export interface TabItem {
  fullPath: string;
  title: string;
  affix?: boolean;
}

/** 与页面组件 defineOptions({ name }) 一致，供 keep-alive include */
const KEEP_ALIVE_NAMES = [
  "WelcomeView",
  "UserManageView",
  "RoleManageView",
  "ApiPermissionManageView",
  "UiPermissionManageView",
  "ProjectManageView",
  "BranchCoverageManageView",
  "IncrementalCoverageManageView",
];

export const useTabsStore = defineStore("tabs", () => {
  const list = ref<TabItem[]>([]);

  function addTab(fullPath: string, title: string) {
    const fp = fullPath || "/";
    if (list.value.some((t) => t.fullPath === fp)) {
      return;
    }
    list.value.push({ fullPath: fp, title });
  }

  /** 关闭前取「关闭后应跳转」的路径 */
  function resolvePathAfterClose(closedFullPath: string) {
    const idx = list.value.findIndex((t) => t.fullPath === closedFullPath);
    if (idx === -1) {
      return "/";
    }
    const next = list.value[idx + 1] ?? list.value[idx - 1];
    return next?.fullPath ?? "/";
  }

  function removeTab(fullPath: string) {
    const i = list.value.findIndex((t) => t.fullPath === fullPath);
    if (i === -1 || list.value[i]!.affix) {
      return;
    }
    list.value.splice(i, 1);
  }

  function reset() {
    list.value = [];
  }

  return {
    list,
    addTab,
    removeTab,
    resolvePathAfterClose,
    reset,
    keepAliveIncludes: KEEP_ALIVE_NAMES,
  };
});
