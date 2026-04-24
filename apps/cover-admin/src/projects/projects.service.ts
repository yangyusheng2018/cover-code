import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Project } from "./entities/project.entity";
import {
  CreateProjectDto,
  DeleteProjectDto,
  ListProjectDto,
  ProjectDetailDto,
  UpdateProjectDto,
} from "./dto/project.dto";

/** 接口返回：不暴露 repoToken 明文，仅 hasRepoToken */
export type ProjectPublic = Omit<Project, "repoToken"> & {
  hasRepoToken: boolean;
};

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  async create(dto: CreateProjectDto): Promise<ProjectPublic> {
    const clash = await this.repo.findOne({ where: { code: dto.code.trim() } });
    if (clash) throw new ConflictException("项目 code 已存在");
    const row = this.repo.create({
      name: dto.name.trim(),
      code: dto.code.trim(),
      gitUrl: dto.gitUrl.trim(),
      mainBranch: dto.mainBranch?.trim() || "master" || "master",
      relativeDir: this.pickRelativeDir(dto),
      repoToken: dto.repoToken?.trim() || null,
    });
    const saved = await this.repo.save(row);
    return this.toPublic(saved);
  }

  async update(dto: UpdateProjectDto): Promise<ProjectPublic> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException("项目不存在");
    if (dto.code != null && dto.code.trim() !== row.code) {
      const clash = await this.repo.findOne({
        where: { code: dto.code.trim() },
      });
      if (clash && clash.id !== row.id)
        throw new ConflictException("项目 code 已存在");
      row.code = dto.code.trim();
    }
    if (dto.name != null) row.name = dto.name.trim();
    if (dto.gitUrl != null) row.gitUrl = dto.gitUrl.trim();
    if (dto.mainBranch != null)
      row.mainBranch = dto.mainBranch.trim() || "master";
    if (dto.relativeDir !== undefined || dto.relativePath !== undefined) {
      row.relativeDir = this.pickRelativeDir(dto);
    }
    if (dto.repoToken !== undefined) {
      row.repoToken = dto.repoToken?.trim() ? dto.repoToken.trim() : null;
    }
    const saved = await this.repo.save(row);
    return this.toPublic(saved);
  }

  /**
   * 删除项目；`branch_coverage.project_id` 等为 ON DELETE CASCADE，
   * 会链式删除分支覆盖率、coverage_report、coverage_file。
   */
  async remove(dto: DeleteProjectDto): Promise<void> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException("项目不存在");
    await this.repo.remove(row);
  }

  async findOne(dto: ProjectDetailDto): Promise<ProjectPublic> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException("项目不存在");
    return this.toPublic(row);
  }

  async findAllOptions(): Promise<{
    list: { id: number; code: string; name: string }[];
  }> {
    const rows = await this.repo.find({
      select: ["id", "code", "name"],
      order: { id: "ASC" },
    });
    return { list: rows };
  }

  async list(dto: ListProjectDto): Promise<{
    list: ProjectPublic[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 10, 100);
    const qb = this.repo.createQueryBuilder("p");
    if (dto.keyword?.trim()) {
      const k = `%${dto.keyword.trim()}%`;
      qb.where("(p.name LIKE :k OR p.code LIKE :k)", { k });
    }
    const [rows, total] = await qb
      .orderBy("p.id", "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list: rows.map((r) => this.toPublic(r)), total, page, pageSize };
  }

  private toPublic(row: Project): ProjectPublic {
    const { repoToken, ...rest } = row;
    return {
      ...rest,
      hasRepoToken: !!(repoToken && repoToken.trim()),
    };
  }

  /** 请求体可用 `relativeDir` 或 `relativePath`；同时存在时以 `relativeDir` 为准 */
  private pickRelativeDir(dto: {
    relativeDir?: string | null;
    relativePath?: string | null;
  }): string | null {
    if (dto.relativeDir !== undefined) {
      return dto.relativeDir?.trim() || null;
    }
    if (dto.relativePath !== undefined) {
      return dto.relativePath?.trim() || null;
    }
    return null;
  }
}
