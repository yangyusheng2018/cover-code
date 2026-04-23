import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { ApiPermission } from './entities/api-permission.entity';
import { RoleApiPermission } from './entities/role-api-permission.entity';
import { UiPermission } from './entities/ui-permission.entity';
import { RoleUiPermission } from './entities/role-ui-permission.entity';
import { RolesService } from './services/roles.service';
import { ApiPermissionsService } from './services/api-permissions.service';
import { UiPermissionsService } from './services/ui-permissions.service';
import { UserPermissionsService } from './services/user-permissions.service';
import { RolesController } from './controllers/roles.controller';
import { ApiPermissionsController } from './controllers/api-permissions.controller';
import { UiPermissionsController } from './controllers/ui-permissions.controller';
import { ApiPermissionGuard } from './guards/api-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      ApiPermission,
      RoleApiPermission,
      UiPermission,
      RoleUiPermission,
    ]),
  ],
  controllers: [RolesController, ApiPermissionsController, UiPermissionsController],
  providers: [
    RolesService,
    ApiPermissionsService,
    UiPermissionsService,
    UserPermissionsService,
    ApiPermissionGuard,
  ],
  exports: [UserPermissionsService, ApiPermissionGuard],
})
export class PermissionModule {}
