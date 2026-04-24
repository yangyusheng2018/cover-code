import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchCoverage } from '../branch-coverages/entities/branch-coverage.entity';
import { Project } from '../projects/entities/project.entity';
import { CoverageController } from './coverage.controller';
import { CoverageService } from './coverage.service';
import { CoverageReportDetailService } from './coverage-report-detail.service';
import { CoverageSourceFetchService } from './coverage-source-fetch.service';
import { CoverageBranchDiffService } from './coverage-branch-diff.service';
import { CoverageManualMarksService } from './coverage-manual-marks.service';
import { CoverageFile } from './entities/coverage-file.entity';
import { CoverageReport } from './entities/coverage-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoverageReport,
      CoverageFile,
      BranchCoverage,
      Project,
    ]),
  ],
  controllers: [CoverageController],
  providers: [
    CoverageService,
    CoverageReportDetailService,
    CoverageSourceFetchService,
    CoverageBranchDiffService,
    CoverageManualMarksService,
  ],
  exports: [
    CoverageReportDetailService,
    CoverageSourceFetchService,
    CoverageBranchDiffService,
    CoverageManualMarksService,
  ],
})
export class CoverageModule {}
