import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** 列出某分支覆盖率下所有上报记录（按最近更新时间排序，便于切换查看历史 commit） */
export class BranchCoverageCoverageReportsListDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchCoverageId: number;
}
