import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateApiPermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  httpMethod?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  routePath?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}

export class UpdateApiPermissionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  httpMethod?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  routePath?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}

export class DeleteApiPermissionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class ListApiPermissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
