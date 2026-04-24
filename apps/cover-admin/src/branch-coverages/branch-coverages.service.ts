import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchCoverage } from './entities/branch-coverage.entity';
import { Project } from '../projects/entities/project.entity';
import {
  BranchCoverageDetailDto,
  CreateBranchCoverageDto,
  DeleteBranchCoverageDto,
  ListBranchCoverageDto,
  ResetBranchCoverageCoverageDto,
  UpdateBranchCoverageDto,
} from './dto/branch-coverage.dto';
import { CoverageReport } from '../coverage/entities/coverage-report.entity';
import { BranchCoverageCoverageReportDto } from './dto/branch-coverage-coverage-report.dto';
import { BranchCoverageSourceFileDto } from './dto/branch-coverage-source-file.dto';
import { CoverageReportDetailService } from '../coverage/coverage-report-detail.service';
import { CoverageSourceFetchService } from '../coverage/coverage-source-fetch.service';

export interface BranchCoverageRow {
  id: number;
  projectId: number;
  testBranch: string;
  taskScope: 'full' | 'incremental';
  projectCode: string;
  projectName: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BranchCoveragesService {
  constructor(
    @InjectRepository(BranchCoverage)
    private readonly repo: Repository<BranchCoverage>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(CoverageReport)
    private readonly coverageReportRepo: Repository<CoverageReport>,
    private readonly coverageReportDetail: CoverageReportDetailService,
    private readonly coverageSourceFetch: CoverageSourceFetchService,
  ) {}

  private async ensureProject(id: number): Promise<Project> {
    const p = await this.projectRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('项目不存在');
    return p;
  }

  async create(dto: CreateBranchCoverageDto): Promise<BranchCoverageRow> {
    await this.ensureProject(dto.projectId);
    const tb = dto.testBranch.trim();
    const taskScope: 'full' | 'incremental' =
      dto.taskScope === 'incremental' ? 'incremental' : 'full';
    const dup = await this.repo.findOne({
      where: { projectId: dto.projectId, testBranch: tb },
    });
    if (dup) {
      throw new ConflictException(
        '该「项目 + 测试分支」已存在覆盖率配置，同分支仅允许一条（不可同时维护全量与增量两条）',
      );
    }
    const row = this.repo.create({
      projectId: dto.projectId,
      testBranch: tb,
      taskScope,
    });
    const saved = await this.repo.save(row);
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['project'],
    });
    if (!full?.project) throw new NotFoundException('关联项目不存在');
    return this.toRow(full);
  }

  async update(dto: UpdateBranchCoverageDto): Promise<BranchCoverageRow> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException('分支覆盖率记录不存在');
    let pid = row.projectId;
    if (dto.projectId != null) {
      await this.ensureProject(dto.projectId);
      pid = dto.projectId;
    }
    if (dto.testBranch != null) {
      const tb = dto.testBranch.trim();
      const dup = await this.repo.findOne({
        where: { projectId: pid, testBranch: tb },
      });
      if (dup && dup.id !== row.id) {
        throw new ConflictException(
          '该「项目 + 测试分支」已存在其他覆盖率配置，同分支仅允许一条',
        );
      }
      row.testBranch = tb;
    }
    row.projectId = pid;
    await this.repo.save(row);
    const full = await this.repo.findOne({
      where: { id: row.id },
      relations: ['project'],
    });
    if (!full?.project) throw new NotFoundException('关联项目不存在');
    return this.toRow(full);
  }

  async remove(dto: DeleteBranchCoverageDto): Promise<void> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException('分支覆盖率记录不存在');
    await this.repo.remove(row);
  }

  async findOne(dto: BranchCoverageDetailDto): Promise<BranchCoverageRow> {
    const full = await this.repo.findOne({
      where: { id: dto.id },
      relations: ['project'],
    });
    if (!full?.project) throw new NotFoundException('分支覆盖率记录不存在');
    return this.toRow(full);
  }

  /** 删除该分支覆盖率下所有上报（coverage_report 及级联 coverage_file），不删除 branch_coverage 行 */
  async resetCoverage(dto: ResetBranchCoverageCoverageDto) {
    const bc = await this.repo.findOne({ where: { id: dto.branchCoverageId } });
    if (!bc) throw new NotFoundException('分支覆盖率记录不存在');
    const result = await this.coverageReportRepo.delete({
      branchCoverageId: bc.id,
    });
    return {
      message: '已清空该分支下的覆盖率数据',
      branchCoverageId: bc.id,
      deletedReportCount: result.affected ?? 0,
    };
  }

  /** 覆盖率详情：汇总 + 文件树 + 行级（供详情弹窗） */
  async coverageReport(dto: BranchCoverageCoverageReportDto) {
    const bc = await this.repo.findOne({
      where: { id: dto.branchCoverageId },
      relations: ['project'],
    });
    if (!bc?.project) throw new NotFoundException('分支覆盖率记录不存在');
    if (dto.view === 'incremental' && bc.taskScope !== 'incremental') {
      throw new BadRequestException(
        '增量详情（view=incremental）仅适用于「增量覆盖率」任务配置，请在增量管理页创建对应任务',
      );
    }
    const includeLineDetails = dto.includeLineDetails !== false;
    return this.coverageReportDetail.getDetailForBranchCoverage(
      bc as BranchCoverage & { project: Project },
      dto.reportId,
      includeLineDetails,
      dto.view,
    );
  }

  /** 从远程 Git 托管 HTTP raw 拉取与上报 commit 一致的源码 */
  async sourceFile(dto: BranchCoverageSourceFileDto) {
    const bc = await this.repo.findOne({
      where: { id: dto.branchCoverageId },
      relations: ['project'],
    });
    if (!bc?.project) throw new NotFoundException('分支覆盖率记录不存在');
    return this.coverageSourceFetch.fetchSourceForFile(
      bc.id,
      dto.reportId,
      dto.path,
      bc.project,
    );
  }

  async list(
    dto: ListBranchCoverageDto,
  ): Promise<{ list: BranchCoverageRow[]; total: number; page: number; pageSize: number }> {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 10, 100);
    const taskScope: 'full' | 'incremental' =
      dto.taskScope === 'incremental' ? 'incremental' : 'full';
    const qb = this.repo.createQueryBuilder('bc').innerJoinAndSelect('bc.project', 'p');
    qb.andWhere('bc.task_scope = :ts', { ts: taskScope });
    if (dto.projectId != null) {
      qb.andWhere('bc.project_id = :pid', { pid: dto.projectId });
    }
    if (dto.keyword?.trim()) {
      const k = `%${dto.keyword.trim()}%`;
      qb.andWhere('(bc.test_branch LIKE :k OR p.name LIKE :k OR p.code LIKE :k)', { k });
    }
    const [rows, total] = await qb
      .orderBy('bc.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const list = rows.map((bc) => this.toRow(bc));
    return { list, total, page, pageSize };
  }

  private toRow(bc: BranchCoverage & { project: Project }): BranchCoverageRow {
    const ts = bc.taskScope === 'incremental' ? 'incremental' : 'full';
    return {
      id: bc.id,
      projectId: bc.projectId,
      testBranch: bc.testBranch,
      taskScope: ts,
      projectCode: bc.project.code,
      projectName: bc.project.name,
      createdAt: bc.createdAt,
      updatedAt: bc.updatedAt,
    };
  }
}
