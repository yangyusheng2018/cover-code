import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UiPermissionType } from './ui-permission-type.enum';
import { RoleUiPermission } from './role-ui-permission.entity';

/** 菜单/目录/按钮树；按钮挂在菜单或目录下，支持多级 */
@Entity('ui_permission')
export class UiPermission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'parent_id', type: 'bigint', unsigned: true, nullable: true })
  parentId: number | null;

  @Column({ type: 'varchar', length: 32 })
  type: UiPermissionType;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** 前端权限标识；目录可为空 */
  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** 是否在侧栏菜单栏展示；按钮类一般 false，仍参与权限与树结构 */
  @Column({ name: 'show_in_menu', type: 'boolean', default: true })
  showInMenu: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;

  @ManyToOne(() => UiPermission, (p) => p.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: UiPermission | null;

  @OneToMany(() => UiPermission, (p) => p.parent)
  children: UiPermission[];

  @OneToMany(() => RoleUiPermission, (r) => r.uiPermission)
  roleUiPermissions: RoleUiPermission[];
}
