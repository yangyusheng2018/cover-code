import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateBranchCoverageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  testBranch: string;
}

export class UpdateBranchCoverageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  testBranch?: string;
}

export class DeleteBranchCoverageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class BranchCoverageDetailDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

/** 清空某条分支覆盖率配置下的全部覆盖率上报（不删除分支覆盖率记录本身） */
export class ResetBranchCoverageCoverageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchCoverageId: number;
}

export class ListBranchCoverageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
