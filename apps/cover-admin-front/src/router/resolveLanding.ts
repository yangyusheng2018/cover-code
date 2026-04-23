import { useAuthStore } from "@/stores/auth";

export type LandingResult =
  | { kind: "path"; path: string }
  | { kind: "forbidden" };

/**
 * 登录后 / 根路径落地顺序。仅依据 **UI 菜单 path**（与后端 `ui_permission` 菜单节点一致），
 * 不使用接口权限码（接口权限仅后端校验）。
 */
const LANDING_CANDIDATES: { path: string; useUiGate: boolean }[] = [
  { path: "/home", useUiGate: true },
  { path: "/system/user", useUiGate: true },
  { path: "/permission/roles", useUiGate: true },
  { path: "/system/api-permission", useUiGate: true },
  { path: "/system/ui-permission", useUiGate: true },
  { path: "/report/project", useUiGate: true },
  { path: "/report/branch-coverage", useUiGate: true },
];

function canAccessLanding(
  auth: ReturnType<typeof useAuthStore>,
  entry: (typeof LANDING_CANDIDATES)[number],
): boolean {
  if (
    entry.useUiGate &&
    auth.effectiveUiTree.length > 0 &&
    !auth.canSeeRoutePath(entry.path)
  ) {
    return false;
  }
  return true;
}

export function resolvePostLoginLanding(
  auth: ReturnType<typeof useAuthStore>,
): LandingResult {
  for (const c of LANDING_CANDIDATES) {
    if (canAccessLanding(auth, c)) {
      return { kind: "path", path: c.path };
    }
  }
  return { kind: "forbidden" };
}
