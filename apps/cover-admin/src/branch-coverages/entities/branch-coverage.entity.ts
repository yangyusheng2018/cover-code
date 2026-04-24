import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('branch_coverage')
@Unique('uk_bc_project_branch', ['projectId', 'testBranch'])
export class BranchCoverage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'project_id', type: 'bigint', unsigned: true })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  /** 用于统计/上报覆盖率的测试分支名 */
  @Column({ name: 'test_branch', type: 'varchar', length: 255 })
  testBranch: string;

  /**
   * full=归属「全量覆盖率管理」列表；incremental=归属「增量覆盖率」列表。
   * 同一 (project_id, test_branch) 全局仅一条记录，不可全量+增量并存两条。
   */
  @Column({ name: 'task_scope', type: 'varchar', length: 16, default: 'full' })
  taskScope: 'full' | 'incremental';

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
