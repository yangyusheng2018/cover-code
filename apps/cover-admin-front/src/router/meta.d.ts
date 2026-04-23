import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** 侧边栏标题（静态兜底路由用） */
    title?: string;
    /** 是否在侧边栏展示（默认 true） */
    showInMenu?: boolean;
    /** 为 true 时不加入顶部多标签（如纯重定向路由） */
    hideTab?: boolean;
    /**
     * 是否用 UI 权限树中的菜单 `path` 控制可访问性（与后端 `ui_permission` 一致）。
     * 为 false 时仅校验已登录（如 layout-root）。
     */
    useUiPathGate?: boolean;
  }
}
