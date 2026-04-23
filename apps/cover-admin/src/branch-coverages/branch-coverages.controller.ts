import { Body, Controller, Post } from '@nestjs/common';
import { BranchCoveragesService } from './branch-coverages.service';
import {
  BranchCoverageDetailDto,
  CreateBranchCoverageDto,
  DeleteBranchCoverageDto,
  ListBranchCoverageDto,
  ResetBranchCoverageCoverageDto,
  UpdateBranchCoverageDto,
} from './dto/branch-coverage.dto';
import { BranchCoverageCoverageReportDto } from './dto/branch-coverage-coverage-report.dto';
import { BranchCoverageSourceFileDto } from './dto/branch-coverage-source-file.dto';
import { RequireApiPermissions } from '../permission/decorators/require-api-permission.decorator';

@Controller('branch-coverages')
export class BranchCoveragesController {
  constructor(private readonly service: BranchCoveragesService) {}

  @Post('list')
  @RequireApiPermissions('branch-coverage:list')
  async list(@Body() dto: ListBranchCoverageDto) {
    return this.service.list(dto);
  }

  @Post('detail')
  @RequireApiPermissions('branch-coverage:detail')
  async detail(@Body() dto: BranchCoverageDetailDto) {
    return this.service.findOne(dto);
  }

  /** 覆盖率上报详情：总览、文件树、每文件行级状态、源码拉取提示（raw URL） */
  @Post('coverage-report')
  @RequireApiPermissions('branch-coverage:detail')
  async coverageReport(@Body() dto: BranchCoverageCoverageReportDto) {
    return this.service.coverageReport(dto);
  }

  /** 从远程仓库（HTTP raw）拉取与本次上报 commit 一致的源码正文 */
  @Post('source-file')
  @RequireApiPermissions('branch-coverage:detail')
  async sourceFile(@Body() dto: BranchCoverageSourceFileDto) {
    return this.service.sourceFile(dto);
  }

  /** 清空该分支覆盖率下的全部覆盖率上报（不删除分支覆盖率配置本身） */
  @Post('reset-coverage')
  @RequireApiPermissions('branch-coverage:update')
  async resetCoverage(@Body() dto: ResetBranchCoverageCoverageDto) {
    return this.service.resetCoverage(dto);
  }

  @Post('create')
  @RequireApiPermissions('branch-coverage:create')
  async create(@Body() dto: CreateBranchCoverageDto) {
    return this.service.create(dto);
  }

  @Post('update')
  @RequireApiPermissions('branch-coverage:update')
  async update(@Body() dto: UpdateBranchCoverageDto) {
    return this.service.update(dto);
  }

  @Post('delete')
  @RequireApiPermissions('branch-coverage:delete')
  async delete(@Body() dto: DeleteBranchCoverageDto) {
    await this.service.remove(dto);
    return { message: '删除成功' };
  }
}
