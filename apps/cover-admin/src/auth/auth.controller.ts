/**
 * 认证控制器：登录、刷新 token、登出、获取当前用户
 * RefreshToken 通过 HttpOnly Cookie 自动携带，不通过 body 返回/传递
 */
import { Body, Controller, Post, Get, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { jwtExpiresToSeconds } from './utils/jwt-expires.util';
import { SkipApiPermission } from '../permission/decorators/skip-api-permission.decorator';
import { UserPermissionsService } from '../permission/services/user-permissions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly userPermissions: UserPermissionsService,
  ) {}

  /** POST /api/auth/login 登录，RefreshToken 写入 HttpOnly Cookie，响应体只返回 accessToken、expiresIn、user */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.username, dto.password);
    const maxAgeMs = jwtExpiresToSeconds(this.config.get('JWT_REFRESH_EXPIRES', '7d')) * 1000;
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    });
    const { refreshToken: _, ...body } = result;
    return body;
  }

  /** POST /api/auth/refresh 从 Cookie 读取 RefreshToken 换取新的 accessToken，并写入新的 RefreshToken 到 Cookie */
  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('缺少 RefreshToken（请通过 Cookie 携带）');
    }
    const result = await this.authService.refreshTokens(refreshToken);
    const maxAgeMs = jwtExpiresToSeconds(this.config.get('JWT_REFRESH_EXPIRES', '7d')) * 1000;
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    });
    const { refreshToken: _, ...body } = result;
    return body;
  }

  /** POST /api/auth/logout 登出：清除 RefreshToken Cookie，可选 body 中 accessToken 使 access 立即失效 */
  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Body() dto: LogoutDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshToken) await this.authService.logout(refreshToken);
    if (dto.accessToken) await this.authService.logoutAccessToken(dto.accessToken);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax' });
    return { message: '已退出登录' };
  }

  /** GET /api/auth/profile 获取当前用户信息，需 Bearer accessToken */
  @SkipApiPermission()
  @Get('profile')
  async profile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  /**
   * GET /api/auth/my-permissions
   * 根据当前用户所属角色汇总：接口权限 code 列表、菜单/按钮树、统计信息
   */
  @SkipApiPermission()
  @Get('my-permissions')
  async myPermissions(@CurrentUser('sub') userId: string) {
    return this.userPermissions.getMyPermissionBundle(Number(userId));
  }

  /**
   * POST /api/auth/switch-role
   * 切换当前生效角色（存 Redis，按用户维度）；不传 body 或 body 无 roleId 表示恢复多角色合并。
   */
  @SkipApiPermission()
  @Post('switch-role')
  async switchRole(@CurrentUser('sub') userId: string, @Body() dto: SwitchRoleDto) {
    return this.userPermissions.switchActiveRole(Number(userId), dto.roleId);
  }
}
