import { IsNotEmpty, MinLength } from 'class-validator';

/** 当前登录用户修改自己的密码 */
export class ChangeOwnPasswordDto {
  @IsNotEmpty({ message: '原密码不能为空' })
  oldPassword: string;

  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(6, { message: '新密码至少6个字符' })
  newPassword: string;
}
