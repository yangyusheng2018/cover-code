import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchCoverage } from './entities/branch-coverage.entity';
import { Project } from '../projects/entities/project.entity';
import { CoverageReport } from '../coverage/entities/coverage-report.entity';
import { BranchCoveragesService } from './branch-coverages.service';
import { BranchCoveragesController } from './branch-coverages.controller';
import { CoverageModule } from '../coverage/coverage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchCoverage, Project, CoverageReport]),
    CoverageModule,
  ],
  controllers: [BranchCoveragesController],
  providers: [BranchCoveragesService],
})
export class BranchCoveragesModule {}
