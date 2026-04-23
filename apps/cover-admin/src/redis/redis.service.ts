/**
 * Redis 服务：连接 Redis，对 access_token 做 setex/get/del，键前缀 access_token:
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

const ACCESS_TOKEN_PREFIX = 'access_token:';
const USER_ACTIVE_ROLE_PREFIX = 'user_active_role:';

function optionalEnvString(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const t = String(raw).trim();
  return t === '' ? undefined : t;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: IORedis;

  constructor(private readonly config: ConfigService) {
    const password = optionalEnvString(this.config.get<string>('REDIS_PASSWORD'));
    const username = optionalEnvString(this.config.get<string>('REDIS_USERNAME'));
    this.client = new IORedis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379) || 6379,
      username: username || undefined,
      password,
    });
    this.client.on('error', (err: Error) => {
      const msg = err.message || String(err);
      if (msg.includes('NOAUTH')) {
        this.logger.error(
          'Redis 需要密码认证：请在 .env 中设置与 redis.conf 中 requirepass 一致的 REDIS_PASSWORD（Redis 6+ ACL 可另设 REDIS_USERNAME）。',
        );
      } else {
        this.logger.error(`Redis 连接错误: ${msg}`);
      }
    });
  }

  /** 应用关闭时断开 Redis 连接 */
  async onModuleDestroy() {
    await this.client.quit();
  }

  /** 存储 access_token，TTL 秒后过期 */
  async setAccessToken(token: string, userId: string, ttlSeconds: number): Promise<void> {
    const key = ACCESS_TOKEN_PREFIX + token;
    await this.client.setex(key, ttlSeconds, userId);
  }

  /** 获取 access_token 对应用户 ID，不存在或已过期返回 null */
  async getAccessTokenUserId(token: string): Promise<string | null> {
    const key = ACCESS_TOKEN_PREFIX + token;
    return this.client.get(key);
  }

  /** 删除 access_token（登出时使 token 失效） */
  async delAccessToken(token: string): Promise<void> {
    const key = ACCESS_TOKEN_PREFIX + token;
    await this.client.del(key);
  }

  /** 当前会话生效角色（按用户 id）；TTL 默认 30 天，与 access 分离存储 */
  async setUserActiveRole(userId: number, roleId: number): Promise<void> {
    const ttl =
      this.config.get<number>('REDIS_ACTIVE_ROLE_TTL_SECONDS', 60 * 60 * 24 * 30) ||
      60 * 60 * 24 * 30;
    const key = USER_ACTIVE_ROLE_PREFIX + userId;
    await this.client.setex(key, ttl, String(roleId));
  }

  async getUserActiveRoleId(userId: number): Promise<string | null> {
    const key = USER_ACTIVE_ROLE_PREFIX + userId;
    return this.client.get(key);
  }

  async clearUserActiveRole(userId: number): Promise<void> {
    const key = USER_ACTIVE_ROLE_PREFIX + userId;
    await this.client.del(key);
  }
}
