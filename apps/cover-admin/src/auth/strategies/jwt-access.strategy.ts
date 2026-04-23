/**
 * JWT Access 策略：从 Authorization Bearer 解析 access token，校验后写入 request.user
 * 并检查 Redis 中是否存在该 token（登出后即失效）
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, TokenPayload } from '../auth.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'access-secret-change-in-prod'),
      passReqToCallback: true,
    });
  }

  /** 校验 payload 为 access 类型，且 token 在 Redis 中未失效 */
  async validate(
    req: { headers?: { authorization?: string } },
    payload: TokenPayload,
  ): Promise<{ sub: string; username: string }> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('无效的 token 类型');
    }
    const authHeader = req?.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token && !(await this.authService.isAccessTokenValid(token))) {
      throw new UnauthorizedException('Token 已失效');
    }
    return { sub: payload.sub, username: payload.username };
  }
}
