import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { SKIP_API_PERMISSION_KEY } from '../decorators/skip-api-permission.decorator';
import { REQUIRE_API_PERMISSION_KEY } from '../decorators/require-api-permission.decorator';
import { UserPermissionsService } from '../services/user-permissions.service';

/**
 * 在 JwtAuthGuard 之后执行：校验当前用户是否具备路由声明的接口权限。
 * 未标注 @RequireApiPermissions 的路由仅校验登录（与旧行为兼容）。
 */
@Injectable()
export class ApiPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userPermissions: UserPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_API_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRE_API_PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: { sub: string } }>();
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new ForbiddenException('无接口访问权限');
    }

    const ok = await this.userPermissions.userHasAllApiCodes(userId, required);
    if (!ok) throw new ForbiddenException('无接口访问权限');
    return true;
  }
}
