import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';

/** 分支覆盖率「查看覆盖率详情」：汇总 + 文件树 + 行级数据 */
export class BranchCoverageCoverageReportDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchCoverageId: number;

  /** 指定某次上报；不传则取该分支覆盖率下最新一条 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportId?: number;

  /**
   * 是否返回每行 `lineDetails`（体积大时可传 false，仅要汇总与树）
   * @default true
   */
  @IsOptional()
  @IsBoolean()
  includeLineDetails?: boolean;

  /**
   * `incremental`：相对项目主分支与目标测试分支的 GitHub compare，仅在 diff 涉及行上汇总/展示；
   * 文件列表仅含对比中有 patch 且与覆盖率路径能对齐的文件。
   */
  @IsOptional()
  @IsIn(['full', 'incremental'])
  view?: 'full' | 'incremental';
}
