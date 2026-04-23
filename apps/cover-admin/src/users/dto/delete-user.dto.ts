import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/** 删除用户 DTO：id 必填 */
export class DeleteUserDto {
  @IsNotEmpty({ message: '用户 id 不能为空' })
  @IsInt({ message: '用户 id 必须为整数' })
  @Type(() => Number)
  id: number;
}
