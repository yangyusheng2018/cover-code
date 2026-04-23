import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CoverageReport } from './coverage-report.entity';
import type { CoverageLineDetail } from '../coverage-line-types';

@Entity('coverage_file')
export class CoverageFile {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'report_id', type: 'bigint', unsigned: true })
  reportId: number;

  @ManyToOne(() => CoverageReport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: CoverageReport;

  @Column({ type: 'varchar', length: 4096 })
  path: string;

  /** 行级可视化数据（插桩/覆盖/inScope/继承） */
  @Column({ name: 'line_details', type: 'json' })
  lineDetails: CoverageLineDetail[];

  /** 由 line_details 派生，兼容旧表 NOT NULL 及简易查询 */
  @Column({ name: 'covered_lines', type: 'json' })
  coveredLines: number[];

  @Column({ name: 'uncovered_lines', type: 'json' })
  uncoveredLines: number[];
}
