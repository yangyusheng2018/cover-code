import { Body, Controller, Get, Post } from '@nestjs/common';
import { UiPermissionsService } from '../services/ui-permissions.service';
import {
  CreateUiPermissionDto,
  DeleteUiPermissionDto,
  ListUiPermissionDto,
  MoveUiPermissionDto,
  UpdateUiPermissionDto,
} from '../dto/ui-permission.dto';
import { RequireApiPermissions } from '../decorators/require-api-permission.decorator';

@Controller('ui-permissions')
export class UiPermissionsController {
  constructor(private readonly service: UiPermissionsService) {}

  @Post('list')
  @RequireApiPermissions('ui-perm:list')
  async listFlat(@Body() dto: ListUiPermissionDto) {
    return this.service.listFlat(dto);
  }

  @Get('tree')
  @RequireApiPermissions('ui-perm:tree')
  async tree() {
    return this.service.tree();
  }

  @Post('create')
  @RequireApiPermissions('ui-perm:create')
  async create(@Body() dto: CreateUiPermissionDto) {
    return this.service.create(dto);
  }

  @Post('update')
  @RequireApiPermissions('ui-perm:update')
  async update(@Body() dto: UpdateUiPermissionDto) {
    return this.service.update(dto);
  }

  @Post('move')
  @RequireApiPermissions('ui-perm:move')
  async move(@Body() dto: MoveUiPermissionDto) {
    return this.service.move(dto);
  }

  @Post('delete')
  @RequireApiPermissions('ui-perm:delete')
  async delete(@Body() dto: DeleteUiPermissionDto) {
    await this.service.remove(dto);
    return { message: '删除成功' };
  }
}
