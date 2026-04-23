import { SetMetadata } from '@nestjs/common';

export const REQUIRE_API_PERMISSION_KEY = 'requireApiPermissions';

/** 声明访问该接口所需的接口权限 code（须全部满足）；配合全局 ApiPermissionGuard */
export const RequireApiPermissions = (...codes: string[]) =>
  SetMetadata(REQUIRE_API_PERMISSION_KEY, codes);
