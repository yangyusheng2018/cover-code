/**
 * 登出 DTO：RefreshToken 从 Cookie 读取并清除；可选传 accessToken 使 access 立即从 Redis 失效
 */
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  accessToken?: string;
}
