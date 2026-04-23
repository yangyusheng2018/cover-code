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
import { BranchCoverage } from '../../branch-coverages/entities/branch-coverage.entity';

@Entity('coverage_report')
@Unique('uk_cr_bc_commit', ['branchCoverageId', 'gitCommit'])
export class CoverageReport {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'branch_coverage_id', type: 'bigint', unsigned: true })
  branchCoverageId: number;

  @ManyToOne(() => BranchCoverage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_coverage_id' })
  branchCoverage: BranchCoverage;

  @Column({ name: 'git_commit', type: 'varchar', length: 64, nullable: true })
  gitCommit: string | null;

  /** full=全量行；incremental=配合 line_details.inScope */
  @Column({ name: 'coverage_mode', type: 'varchar', length: 16, default: 'full' })
  coverageMode: string;

  /** 合并覆盖时使用的父提交（审计） */
  @Column({ name: 'parent_commit', type: 'varchar', length: 64, nullable: true })
  parentCommit: string | null;

  /** 增量 diff 基准提交（如 main） */
  @Column({ name: 'diff_base_commit', type: 'varchar', length: 64, nullable: true })
  diffBaseCommit: string | null;

  @Column({ name: 'file_count', type: 'int', unsigned: true, default: 0 })
  fileCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
