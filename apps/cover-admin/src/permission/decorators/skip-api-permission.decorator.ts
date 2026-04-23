import { SetMetadata } from '@nestjs/common';

export const SKIP_API_PERMISSION_KEY = 'skipApiPermission';

/** 跳过接口权限校验（仍走 JWT）；用于登录态个人资料、当前用户权限树等 */
export const SkipApiPermission = () => SetMetadata(SKIP_API_PERMISSION_KEY, true);
