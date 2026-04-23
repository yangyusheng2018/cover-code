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
@Unique('uk_bc_project_branch_scope', ['projectId', 'testBranch', 'taskScope'])
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
   * full=全量覆盖率任务（全量管理页）；incremental=增量覆盖率任务（增量管理页）。
   * 与 (project_id, test_branch) 共同唯一；上报需带 `X-Coverage-Task-Scope` 对齐。
   */
  @Column({ name: 'task_scope', type: 'varchar', length: 16, default: 'full' })
  taskScope: 'full' | 'incremental';

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
