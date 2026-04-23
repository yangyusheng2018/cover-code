import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/** 按某次覆盖率上报从远程 Git 托管拉取单文件源码 */
export class BranchCoverageSourceFileDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchCoverageId: number;

  /** 与 `coverage_file.path` 一致（与文件树中选中路径相同） */
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  path: string;

  /** 指定某次上报；不传则取该分支覆盖率下最新一条 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportId?: number;
}
