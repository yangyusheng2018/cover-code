/**
 * Redis 模块（全局）：提供 RedisService，用于存取 access_token，支持登出即失效
 */
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
