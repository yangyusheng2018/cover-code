import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { RoleApiPermission } from '../entities/role-api-permission.entity';
import { RoleUiPermission } from '../entities/role-ui-permission.entity';
import { UiPermission } from '../entities/ui-permission.entity';
import { buildUiTree, countTreeNodes, UiPermissionTreeNode } from '../utils/ui-tree.util';

@Injectable()
export class UserPermissionsService {
  constructor(
    private readonly redis: RedisService,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RoleApiPermission)
    private readonly roleApiRepo: Repository<RoleApiPermission>,
    @InjectRepository(RoleUiPermission)
    private readonly roleUiRepo: Repository<RoleUiPermission>,
    @InjectRepository(UiPermission)
    private readonly uiPermRepo: Repository<UiPermission>,
  ) {}

  /**
   * 切换当前生效角色：仅传用户已拥有的 roleId；不传或清空表示合并全部角色权限。
   */
  async switchActiveRole(userId: number, roleId?: number): Promise<{ activeRoleId: number | null }> {
    if (roleId == null || !Number.isFinite(roleId) || roleId < 1) {
      await this.redis.clearUserActiveRole(userId);
      return { activeRoleId: null };
    }
    const member = await this.userRoleRepo.findOne({ where: { userId, roleId } });
    if (!member) {
      throw new ForbiddenException('未拥有该角色，无法切换');
    }
    await this.redis.setUserActiveRole(userId, roleId);
    return { activeRoleId: roleId };
  }

  /** Redis 中已选角色，且仍在 user_role 中；无效则清除并返回 null */
  private async resolveValidActiveRoleId(userId: number): Promise<number | null> {
    const raw = await this.redis.getUserActiveRoleId(userId);
    if (raw == null) return null;
    const roleId = Number(raw);
    if (!Number.isFinite(roleId) || roleId < 1) {
      await this.redis.clearUserActiveRole(userId);
      return null;
    }
    const member = await this.userRoleRepo.findOne({ where: { userId, roleId } });
    if (!member) {
      await this.redis.clearUserActiveRole(userId);
      return null;
    }
    return roleId;
  }

  async getRoleSummariesForUser(userId: number): Promise<{ id: number; name: string; code: string }[]> {
    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .select(['r.id AS id', 'r.name AS name', 'r.code AS code'])
      .where('ur.user_id = :userId', { userId })
      .getRawMany<{ id: string; name: string; code: string }>();
    return rows.map((x) => ({
      id: Number(x.id),
      name: x.name,
      code: x.code,
    }));
  }

  async getUserApiPermissionCodes(userId: number): Promise<string[]> {
    const active = await this.resolveValidActiveRoleId(userId);
    if (active != null) {
      const rows = await this.roleApiRepo
        .createQueryBuilder('rap')
        .innerJoin('rap.apiPermission', 'ap')
        .where('rap.role_id = :rid', { rid: active })
        .select('DISTINCT ap.code', 'code')
        .getRawMany<{ code: string }>();
      return [...new Set(rows.map((r) => r.code))];
    }
    const rows = await this.roleApiRepo
      .createQueryBuilder('rap')
      .innerJoin('rap.apiPermission', 'ap')
      .innerJoin(UserRole, 'ur', 'ur.role_id = rap.role_id')
      .where('ur.user_id = :userId', { userId })
      .select('DISTINCT ap.code', 'code')
      .getRawMany<{ code: string }>();
    return [...new Set(rows.map((r) => r.code))];
  }

  async expandUiWithAncestors(uiIds: number[]): Promise<number[]> {
    const set = new Set(uiIds.filter((id) => id > 0));
    let frontier = [...set];
    while (frontier.length) {
      const rows = await this.uiPermRepo.find({
        where: { id: In(frontier) },
        select: ['id', 'parentId'],
      });
      frontier = [];
      for (const row of rows) {
        if (row.parentId != null && !set.has(row.parentId)) {
          set.add(row.parentId);
          frontier.push(row.parentId);
        }
      }
    }
    return [...set];
  }

  async getUserUiPermissionIds(userId: number): Promise<number[]> {
    const active = await this.resolveValidActiveRoleId(userId);
    if (active != null) {
      const rows = await this.roleUiRepo.find({
        where: { roleId: active },
        select: ['uiPermissionId'],
      });
      return rows.map((r) => r.uiPermissionId);
    }
    const rows = await this.roleUiRepo
      .createQueryBuilder('rup')
      .innerJoin(UserRole, 'ur', 'ur.role_id = rup.role_id')
      .where('ur.user_id = :userId', { userId })
      .select('DISTINCT rup.ui_permission_id', 'id')
      .getRawMany<{ id: string }>();
    return rows.map((r) => Number(r.id));
  }

  async getUserUiPermissionTree(userId: number): Promise<UiPermissionTreeNode[]> {
    const baseIds = await this.getUserUiPermissionIds(userId);
    if (baseIds.length === 0) return [];
    const expanded = await this.expandUiWithAncestors(baseIds);
    const flat = await this.uiPermRepo.find({
      where: { id: In(expanded) },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return buildUiTree(flat);
  }

  async userHasAllApiCodes(userId: number, codes: string[]): Promise<boolean> {
    if (codes.length === 0) return true;
    const owned = new Set(await this.getUserApiPermissionCodes(userId));
    return codes.every((c) => owned.has(c));
  }

  async getMyPermissionBundle(userId: number) {
    const roles = await this.getRoleSummariesForUser(userId);
    const activeRoleId = await this.resolveValidActiveRoleId(userId);
    let activeRole: { id: number; name: string; code: string } | null = null;
    if (activeRoleId != null) {
      const r = await this.roleRepo.findOne({ where: { id: activeRoleId } });
      if (r) activeRole = { id: r.id, name: r.name, code: r.code };
    }
    const apiPermissionCodes = await this.getUserApiPermissionCodes(userId);
    const uiPermissionTree = await this.getUserUiPermissionTree(userId);
    return {
      roles,
      activeRoleId,
      activeRole,
      apiPermissionCodes,
      uiPermissionTree,
      summary: {
        roleCount: roles.length,
        apiPermissionCount: apiPermissionCodes.length,
        uiTreeNodeCount: countTreeNodes(uiPermissionTree),
      },
    };
  }
}
