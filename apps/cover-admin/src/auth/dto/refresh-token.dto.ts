/**
 * 刷新 token DTO：refreshToken 字符串，用于 POST /auth/refresh
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'refreshToken 不能为空' })
  @IsString()
  refreshToken: string;
}
