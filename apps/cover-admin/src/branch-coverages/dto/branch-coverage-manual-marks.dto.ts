import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class CoverageManualMarksItemDto {
  @IsString()
  path!: string;

  @IsOptional()
  fileMark?: string | null;

  @IsOptional()
  @IsObject()
  lineMarks?: Record<string, string | null>;
}

export class BranchCoverageManualMarksDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchCoverageId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverageManualMarksItemDto)
  items!: CoverageManualMarksItemDto[];
}
