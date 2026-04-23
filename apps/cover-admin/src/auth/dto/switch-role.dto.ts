import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * POST /api/auth/switch-role
 * 不传或 `roleId` 为 null：恢复为「多角色权限合并」
 * 传合法 `roleId`：仅按该角色计算接口/菜单权限（须属于当前用户）
 */
export class SwitchRoleDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  })
  @IsInt()
  @Min(1)
  roleId?: number;
}
