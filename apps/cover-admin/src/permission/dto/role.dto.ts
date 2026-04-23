import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateRoleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}

export class DeleteRoleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class ListRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
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

export class AssignUsersToRoleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds: number[];
}

export class RemoveUsersFromRoleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds: number[];
}

export class SetRoleApiPermissionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  apiPermissionIds: number[];
}

export class SetRoleUiPermissionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  uiPermissionIds: number[];
}

export class RoleIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;
}

export class RoleDetailDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class ListUsersInRoleDto extends RoleIdDto {
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
