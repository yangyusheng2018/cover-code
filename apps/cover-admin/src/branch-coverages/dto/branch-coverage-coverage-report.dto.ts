import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

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
}
