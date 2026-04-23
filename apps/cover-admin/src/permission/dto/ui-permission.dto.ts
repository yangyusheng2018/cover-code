import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { UiPermissionType } from '../entities/ui-permission-type.enum';

export class CreateUiPermissionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;

  @IsEnum(UiPermissionType)
  type: UiPermissionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  code?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  showInMenu?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string | null;
}

export class UpdateUiPermissionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;

  @IsOptional()
  @IsEnum(UiPermissionType)
  type?: UiPermissionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  code?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  showInMenu?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string | null;
}

export class DeleteUiPermissionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class ListUiPermissionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}

/** 移动节点：parentId 必填语义由服务校验——传 `null` 为根目录，传正整数为目标父节点 id */
export class MoveUiPermissionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === 'null') return null;
    if (value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? n : undefined;
  })
  @ValidateIf((o) => typeof o.parentId === 'number')
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
