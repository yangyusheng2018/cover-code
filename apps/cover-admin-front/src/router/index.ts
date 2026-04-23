import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { resolvePostLoginLanding } from "@/router/resolveLanding";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/auth/LoginView.vue"),
      meta: { title: "登录" },
    },
    {
      path: "/403",
      name: "forbidden",
      component: () => import("@/views/misc/ForbiddenView.vue"),
      meta: { title: "无权限", useUiPathGate: false, showInMenu: false },
    },
    {
      path: "/",
      component: () => import("@/layouts/MainLayout.vue"),
      children: [
        {
          path: "",
          name: "layout-root",
          meta: { showInMenu: false, hideTab: true, useUiPathGate: false },
          component: () => import("@/views/misc/RootPlaceholderView.vue"),
        },
        {
          path: "home",
          name: "home",
          component: () => import("@/views/welcome/WelcomeView.vue"),
          meta: {
            title: "欢迎",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
        {
          path: "users",
          redirect: "/",
          meta: { showInMenu: false, hideTab: true, useUiPathGate: false },
        },
        {
          path: "system/user",
          name: "users",
          component: () => import("@/views/users/UserManageView.vue"),
          meta: {
            title: "用户管理",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
        {
          path: "system/role",
          name: "system-role",
          component: () => import("@/views/permission/RoleManageView.vue"),
          meta: {
            title: "用户组管理",
            showInMenu: false,
            useUiPathGate: true,
          },
        },
        {
          path: "system/rbac",
          name: "system-rbac",
          redirect: "/",
          meta: {
            title: "用户与权限",
            showInMenu: false,
            useUiPathGate: false,
            hideTab: true,
          },
        },
        {
          path: "permission/roles",
          name: "permission-roles",
          component: () => import("@/views/permission/RoleManageView.vue"),
          meta: {
            title: "用户组管理",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
        {
          path: "system/api-permission",
          name: "permission-api",
          component: () =>
            import("@/views/permission/ApiPermissionManageView.vue"),
          meta: {
            title: "接口权限",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
        {
          path: "system/ui-permission",
          name: "permission-ui",
          component: () =>
            import("@/views/permission/UiPermissionManageView.vue"),
          meta: {
            title: "菜单与按钮",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
        {
          path: "report/project",
          name: "report-project",
          component: () => import("@/views/report/ProjectManageView.vue"),
          meta: {
            title: "项目管理",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
        {
          path: "report/branch-coverage",
          name: "report-branch-coverage",
          component: () =>
            import("@/views/report/BranchCoverageManageView.vue"),
          meta: {
            title: "全量覆盖率管理",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
        {
          path: "report/incremental-coverage",
          name: "report-incremental-coverage",
          component: () =>
            import("@/views/report/IncrementalCoverageManageView.vue"),
          meta: {
            title: "增量覆盖率",
            showInMenu: true,
            useUiPathGate: true,
          },
        },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.user) {
    await auth.loadSession();
  }

  const isLogin = to.name === "login";

  if (!auth.user && !isLogin) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (auth.user && isLogin) {
    const land = resolvePostLoginLanding(auth);
    if (land.kind === "forbidden") {
      return { name: "forbidden" };
    }
    return { path: land.path, replace: true };
  }

  if (auth.user && to.path === "/") {
    const land = resolvePostLoginLanding(auth);
    if (land.kind === "forbidden") {
      return { name: "forbidden" };
    }
    return { path: land.path, replace: true };
  }

  if (
    auth.user &&
    to.meta.useUiPathGate !== false &&
    to.meta.useUiPathGate &&
    auth.effectiveUiTree.length > 0 &&
    !auth.canSeeRoutePath(to.path)
  ) {
    return { name: "forbidden" };
  }

  return true;
});
