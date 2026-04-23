import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { RoleApiPermission } from './role-api-permission.entity';
import { RoleUiPermission } from './role-ui-permission.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  /** 唯一编码；种子「用户角色」可使用 `super_admin`，与其它角色一样按绑定校验接口权限 */
  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];

  @OneToMany(() => RoleApiPermission, (r) => r.role)
  roleApiPermissions: RoleApiPermission[];

  @OneToMany(() => RoleUiPermission, (r) => r.role)
  roleUiPermissions: RoleUiPermission[];
}
