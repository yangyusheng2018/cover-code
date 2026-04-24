import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CoverageReport } from './coverage-report.entity';
import type { CoverageLineDetail } from '../coverage-line-types';
import type { CoverageFileManualMarks } from '../coverage-manual-marks';

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

  /** 行级可视化数据（插桩/覆盖/inScope/继承 + 人工标记合并结果） */
  @Column({ name: 'line_details', type: 'json' })
  lineDetails: CoverageLineDetail[];

  /** 入库基准（父提交合并后、人工标记前），用于再次应用 manual_marks */
  @Column({ name: 'line_details_core', type: 'json', nullable: true })
  lineDetailsCore: CoverageLineDetail[] | null;

  /** 由 line_details 派生，兼容旧表 NOT NULL 及简易查询 */
  @Column({ name: 'covered_lines', type: 'json' })
  coveredLines: number[];

  @Column({ name: 'uncovered_lines', type: 'json' })
  uncoveredLines: number[];

  @Column({ name: 'manual_marks', type: 'json', nullable: true })
  manualMarks: CoverageFileManualMarks | null;
}
