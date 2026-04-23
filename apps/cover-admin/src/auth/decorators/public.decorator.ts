/**
 * Public 装饰器：标记无需校验 accessToken 的接口（如登录、注册等）
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

