/**
 * 认证服务：登录/刷新/登出逻辑；access_token 存 Redis，refresh_token 存 MySQL
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { jwtExpiresToSeconds } from './utils/jwt-expires.util';

/** JWT 载荷：sub 用户ID、username、type 区分 access/refresh */
export interface TokenPayload {
  sub: string;
  username: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  /** 校验用户名密码，通过则返回用户信息（不含密码） */
  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;
    const ok = await this.usersService.validatePassword(password, user.passwordHash);
    if (!ok) return null;
    const { passwordHash: _, ...result } = user;
    return result;
  }

  /** 登录：校验用户后签发 accessToken（写入 Redis）、refreshToken（写入 MySQL），返回双 token 与用户信息 */
  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    await this.redis.clearUserActiveRole(user.id);
    const accessToken = this.signAccessToken(user.id, user.username);
    const refreshToken = await this.issueRefreshToken(user.id);
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES', '5m');
    const ttlSeconds = jwtExpiresToSeconds(accessExpires);
    await this.redis.setAccessToken(accessToken, String(user.id), ttlSeconds);
    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpires,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  /** 签发 access token（JWT），过期时间由配置决定，sub 存用户 id 字符串 */
  signAccessToken(userId: number, username: string): string {
    return this.jwtService.sign(
      { sub: String(userId), username, type: 'access' } as TokenPayload,
      { expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '5m') },
    );
  }

  /** 签发 refresh token（JWT）并写入 refresh_token 表，id 自增 */
  private async issueRefreshToken(userId: number): Promise<string> {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-change-in-prod');
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');
    const expiresAt = new Date();
    const days = expiresIn.endsWith('d') ? parseInt(expiresIn, 10) || 7 : 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    const payload: TokenPayload = { sub: String(userId), username: '', type: 'refresh' };
    const signed = this.jwtService.sign(payload, { secret, expiresIn });

    const rt = this.refreshTokenRepo.create({
      userId,
      token: signed,
      expiresAt,
    });
    await this.refreshTokenRepo.save(rt);
    return signed;
  }

  /** 用 refreshToken 换新的一对 token，旧 refresh 记录删除并写入新记录，access 写入 Redis */
  async refreshTokens(refreshToken: string) {
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.refreshTokenRepo.remove(stored);
      throw new UnauthorizedException('Refresh token 无效或已过期');
    }
    const secret = this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-change-in-prod');
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify<TokenPayload>(refreshToken, { secret });
    } catch {
      await this.refreshTokenRepo.remove(stored);
      throw new UnauthorizedException('Refresh token 无效1');
    }
    if (payload.type !== 'refresh' || Number(payload.sub) !== Number(stored.userId)) {
      throw new UnauthorizedException('Refresh token 无效2');
    }
    await this.refreshTokenRepo.remove(stored);
    const user = await this.usersService.findById(Number(payload.sub));
    if (!user) throw new UnauthorizedException('用户不存在');
    const newAccess = this.signAccessToken(user.id, user.username);
    const newRefresh = await this.issueRefreshToken(user.id);
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES', '5m');
    await this.redis.setAccessToken(newAccess, String(user.id), jwtExpiresToSeconds(accessExpires));
    return {
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresIn: accessExpires,
    };
  }

  /** 登出：从 MySQL 删除该 refresh_token 记录 */
  async logout(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
    });
    if (stored) {
      await this.redis.clearUserActiveRole(stored.userId);
      await this.refreshTokenRepo.remove(stored);
    }
  }

  /** 使当前 access_token 失效（登出时由客户端传 accessToken 调用） */
  async logoutAccessToken(accessToken: string): Promise<void> {
    await this.redis.delAccessToken(accessToken);
  }

  /** 校验 access_token 是否在 Redis 中（未失效） */
  async isAccessTokenValid(token: string): Promise<boolean> {
    const userId = await this.redis.getAccessTokenUserId(token);
    return userId !== null;
  }

  /** 根据用户 ID 获取用户信息（不含密码），userId 来自 JWT sub 为字符串 */
  async getProfile(userId: string) {
    const user = await this.usersService.findById(Number(userId));
    if (!user) return null;
    const { passwordHash: _, ...result } = user;
    return result;
  }
}
