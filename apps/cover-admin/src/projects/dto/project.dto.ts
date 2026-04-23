import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const CODE_RE = /^[a-zA-Z0-9._-]+$/;

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(CODE_RE, { message: 'code 仅允许字母数字及 . _ -' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  gitUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mainBranch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  relativeDir?: string | null;

  /** 与 `relativeDir` 同义（便于前端命名）；若两者均传，以 `relativeDir` 为准 */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  relativePath?: string | null;

  /** 仓库访问令牌（私有仓库拉取源码），仅写入；响应中不返回明文 */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  repoToken?: string | null;
}

export class UpdateProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(CODE_RE, { message: 'code 仅允许字母数字及 . _ -' })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  gitUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mainBranch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  relativeDir?: string | null;

  /** 与 `relativeDir` 同义；若两者均传，以 `relativeDir` 为准 */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  relativePath?: string | null;

  /**
   * 仓库访问令牌。不传则不修改；传空字符串可清空已保存的令牌
   */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  repoToken?: string | null;
}

export class DeleteProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class ProjectDetailDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class ListProjectDto {
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
