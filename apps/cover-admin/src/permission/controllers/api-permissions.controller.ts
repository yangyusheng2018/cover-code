import { Body, Controller, Post } from '@nestjs/common';
import { ApiPermissionsService } from '../services/api-permissions.service';
import {
  CreateApiPermissionDto,
  DeleteApiPermissionDto,
  ListApiPermissionDto,
  UpdateApiPermissionDto,
} from '../dto/api-permission.dto';
import { RequireApiPermissions } from '../decorators/require-api-permission.decorator';

@Controller('api-permissions')
export class ApiPermissionsController {
  constructor(private readonly service: ApiPermissionsService) {}

  @Post('list')
  @RequireApiPermissions('api-perm:list')
  async list(@Body() dto: ListApiPermissionDto) {
    return this.service.list(dto);
  }

  @Post('create')
  @RequireApiPermissions('api-perm:create')
  async create(@Body() dto: CreateApiPermissionDto) {
    return this.service.create(dto);
  }

  @Post('update')
  @RequireApiPermissions('api-perm:update')
  async update(@Body() dto: UpdateApiPermissionDto) {
    return this.service.update(dto);
  }

  @Post('delete')
  @RequireApiPermissions('api-perm:delete')
  async delete(@Body() dto: DeleteApiPermissionDto) {
    await this.service.remove(dto);
    return { message: '删除成功' };
  }
}
