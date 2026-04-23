import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { UiPermission } from './ui-permission.entity';

@Entity('role_ui_permission')
export class RoleUiPermission {
  @PrimaryColumn({ name: 'role_id', type: 'bigint', unsigned: true })
  roleId: number;

  @PrimaryColumn({ name: 'ui_permission_id', type: 'bigint', unsigned: true })
  uiPermissionId: number;

  @ManyToOne(() => Role, (role) => role.roleUiPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => UiPermission, (u) => u.roleUiPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ui_permission_id' })
  uiPermission: UiPermission;
}
