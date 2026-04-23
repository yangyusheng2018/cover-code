import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { RoleApiPermission } from '../entities/role-api-permission.entity';
import { RoleUiPermission } from '../entities/role-ui-permission.entity';
import { ApiPermission } from '../entities/api-permission.entity';
import { UiPermission } from '../entities/ui-permission.entity';
import {
  AssignUsersToRoleDto,
  CreateRoleDto,
  DeleteRoleDto,
  ListRoleDto,
  ListUsersInRoleDto,
  RemoveUsersFromRoleDto,
  SetRoleApiPermissionsDto,
  SetRoleUiPermissionsDto,
  UpdateRoleDto,
} from '../dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RoleApiPermission)
    private readonly roleApiRepo: Repository<RoleApiPermission>,
    @InjectRepository(RoleUiPermission)
    private readonly roleUiRepo: Repository<RoleUiPermission>,
    @InjectRepository(ApiPermission)
    private readonly apiPermRepo: Repository<ApiPermission>,
    @InjectRepository(UiPermission)
    private readonly uiPermRepo: Repository<UiPermission>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.roleRepo.findOne({
      where: [{ code: dto.code }, { name: dto.name }],
    });
    if (exists) {
      throw new ConflictException('角色名称或编码已存在');
    }
    const role = this.roleRepo.create({
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
    });
    return this.roleRepo.save(role);
  }

  async update(dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id: dto.id } });
    if (!role) throw new NotFoundException('角色不存在');
    if (dto.code != null && dto.code !== role.code) {
      const clash = await this.roleRepo.findOne({ where: { code: dto.code } });
      if (clash) throw new ConflictException('角色编码已存在');
      role.code = dto.code;
    }
    if (dto.name != null) {
      const clash = await this.roleRepo.findOne({ where: { name: dto.name } });
      if (clash && clash.id !== role.id) throw new ConflictException('角色名称已存在');
      role.name = dto.name;
    }
    if (dto.description !== undefined) role.description = dto.description;
    return this.roleRepo.save(role);
  }

  async remove(dto: DeleteRoleDto): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id: dto.id } });
    if (!role) throw new NotFoundException('角色不存在');
    await this.roleRepo.remove(role);
  }

  async list(dto: ListRoleDto) {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 10, 100);
    const qb = this.roleRepo.createQueryBuilder('r');
    if (dto.keyword?.trim()) {
      qb.where('(r.name LIKE :kw OR r.code LIKE :kw)', { kw: `%${dto.keyword.trim()}%` });
    }
    const [list, total] = await qb
      .orderBy('r.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }

  async getDetail(id: number) {
    const role = await this.findOne(id);
    const perm = await this.getRolePermissionIds(id);
    return { role, apiPermissionIds: perm.apiPermissionIds, uiPermissionIds: perm.uiPermissionIds };
  }

  async assignUsers(dto: AssignUsersToRoleDto): Promise<void> {
    await this.ensureRole(dto.roleId);
    const users = await this.userRepo.findBy({ id: In(dto.userIds) });
    if (users.length !== dto.userIds.length) {
      throw new NotFoundException('部分用户不存在');
    }
    for (const uid of dto.userIds) {
      const exists = await this.userRoleRepo.findOne({
        where: { userId: uid, roleId: dto.roleId },
      });
      if (!exists) {
        await this.userRoleRepo.save(
          this.userRoleRepo.create({ userId: uid, roleId: dto.roleId }),
        );
      }
    }
  }

  async removeUsers(dto: RemoveUsersFromRoleDto): Promise<void> {
    await this.ensureRole(dto.roleId);
    await this.userRoleRepo.delete({
      roleId: dto.roleId,
      userId: In(dto.userIds),
    });
  }

  async setApiPermissions(dto: SetRoleApiPermissionsDto): Promise<void> {
    await this.ensureRole(dto.roleId);
    if (dto.apiPermissionIds.length) {
      const rows = await this.apiPermRepo.findBy({ id: In(dto.apiPermissionIds) });
      if (rows.length !== dto.apiPermissionIds.length) {
        throw new NotFoundException('部分接口权限不存在');
      }
    }
    await this.roleApiRepo.delete({ roleId: dto.roleId });
    if (dto.apiPermissionIds.length) {
      await this.roleApiRepo.insert(
        dto.apiPermissionIds.map((apiPermissionId) => ({ roleId: dto.roleId, apiPermissionId })),
      );
    }
  }

  async setUiPermissions(dto: SetRoleUiPermissionsDto): Promise<void> {
    await this.ensureRole(dto.roleId);
    if (dto.uiPermissionIds.length) {
      const rows = await this.uiPermRepo.findBy({ id: In(dto.uiPermissionIds) });
      if (rows.length !== dto.uiPermissionIds.length) {
        throw new NotFoundException('部分菜单/按钮权限不存在');
      }
    }
    await this.roleUiRepo.delete({ roleId: dto.roleId });
    if (dto.uiPermissionIds.length) {
      await this.roleUiRepo.insert(
        dto.uiPermissionIds.map((uiPermissionId) => ({ roleId: dto.roleId, uiPermissionId })),
      );
    }
  }

  async listUsersInRole(dto: ListUsersInRoleDto) {
    await this.ensureRole(dto.roleId);
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 10, 100);
    const qb = this.userRepo
      .createQueryBuilder('u')
      .innerJoin(UserRole, 'ur', 'ur.user_id = u.id')
      .where('ur.role_id = :roleId', { roleId: dto.roleId })
      .select(['u.id', 'u.username', 'u.email', 'u.createdAt', 'u.updatedAt']);
    const total = await qb.getCount();
    const list = await qb
      .orderBy('u.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return { list, total, page, pageSize };
  }

  async getRolePermissionIds(roleId: number) {
    await this.ensureRole(roleId);
    const apiRows = await this.roleApiRepo.find({
      where: { roleId },
      select: ['apiPermissionId'],
    });
    const uiRows = await this.roleUiRepo.find({
      where: { roleId },
      select: ['uiPermissionId'],
    });
    return {
      apiPermissionIds: apiRows.map((r) => r.apiPermissionId),
      uiPermissionIds: uiRows.map((r) => r.uiPermissionId),
    };
  }

  private async ensureRole(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }
}
