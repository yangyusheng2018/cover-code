import { Body, Controller, Post } from '@nestjs/common';
import { RolesService } from '../services/roles.service';
import {
  AssignUsersToRoleDto,
  CreateRoleDto,
  DeleteRoleDto,
  ListRoleDto,
  ListUsersInRoleDto,
  RemoveUsersFromRoleDto,
  RoleDetailDto,
  SetRoleApiPermissionsDto,
  SetRoleUiPermissionsDto,
  UpdateRoleDto,
} from '../dto/role.dto';
import { RequireApiPermissions } from '../decorators/require-api-permission.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('list')
  @RequireApiPermissions('role:list')
  async list(@Body() dto: ListRoleDto) {
    return this.rolesService.list(dto);
  }

  @Post('detail')
  @RequireApiPermissions('role:detail')
  async detail(@Body() dto: RoleDetailDto) {
    return this.rolesService.getDetail(dto.id);
  }

  @Post('create')
  @RequireApiPermissions('role:create')
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Post('update')
  @RequireApiPermissions('role:update')
  async update(@Body() dto: UpdateRoleDto) {
    return this.rolesService.update(dto);
  }

  @Post('delete')
  @RequireApiPermissions('role:delete')
  async delete(@Body() dto: DeleteRoleDto) {
    await this.rolesService.remove(dto);
    return { message: '删除成功' };
  }

  @Post('assign-users')
  @RequireApiPermissions('role:assign-users')
  async assignUsers(@Body() dto: AssignUsersToRoleDto) {
    await this.rolesService.assignUsers(dto);
    return { message: '已加入角色' };
  }

  @Post('remove-users')
  @RequireApiPermissions('role:remove-users')
  async removeUsers(@Body() dto: RemoveUsersFromRoleDto) {
    await this.rolesService.removeUsers(dto);
    return { message: '已移出角色' };
  }

  @Post('set-api-permissions')
  @RequireApiPermissions('role:set-api-permissions')
  async setApi(@Body() dto: SetRoleApiPermissionsDto) {
    await this.rolesService.setApiPermissions(dto);
    return { message: '接口权限已更新' };
  }

  @Post('set-ui-permissions')
  @RequireApiPermissions('role:set-ui-permissions')
  async setUi(@Body() dto: SetRoleUiPermissionsDto) {
    await this.rolesService.setUiPermissions(dto);
    return { message: '菜单/按钮权限已更新' };
  }

  @Post('list-users')
  @RequireApiPermissions('role:list-users')
  async listUsers(@Body() dto: ListUsersInRoleDto) {
    return this.rolesService.listUsersInRole(dto);
  }
}
