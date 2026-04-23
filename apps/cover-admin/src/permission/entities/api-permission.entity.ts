import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoleApiPermission } from './role-api-permission.entity';

/** 接口权限：由守卫按 code 校验 */
@Entity('api_permission')
export class ApiPermission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'http_method', type: 'varchar', length: 16, nullable: true })
  httpMethod: string | null;

  @Column({ name: 'route_path', type: 'varchar', length: 255, nullable: true })
  routePath: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;

  @OneToMany(() => RoleApiPermission, (r) => r.apiPermission)
  roleApiPermissions: RoleApiPermission[];
}
