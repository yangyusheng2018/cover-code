import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { ApiPermission } from './api-permission.entity';

@Entity('role_api_permission')
export class RoleApiPermission {
  @PrimaryColumn({ name: 'role_id', type: 'bigint', unsigned: true })
  roleId: number;

  @PrimaryColumn({ name: 'api_permission_id', type: 'bigint', unsigned: true })
  apiPermissionId: number;

  @ManyToOne(() => Role, (role) => role.roleApiPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => ApiPermission, (ap) => ap.roleApiPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'api_permission_id' })
  apiPermission: ApiPermission;
}
