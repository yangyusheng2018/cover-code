/**
 * 当前用户装饰器：从 request.user（由 JWT 策略注入）中取字段
 * @CurrentUser() 取整对象，@CurrentUser('sub') 取 userId
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
