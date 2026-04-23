import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/** 用户列表分页查询请求体（POST /list） */
export class ListUserQueryDto {
  @IsOptional()
  username?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '页码至少为 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '每页条数至少为 1' })
  @Max(100, { message: '每页最多 100 条' })
  pageSize?: number = 10;
}
