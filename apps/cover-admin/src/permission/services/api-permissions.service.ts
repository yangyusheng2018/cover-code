import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiPermission } from '../entities/api-permission.entity';
import {
  CreateApiPermissionDto,
  DeleteApiPermissionDto,
  ListApiPermissionDto,
  UpdateApiPermissionDto,
} from '../dto/api-permission.dto';

@Injectable()
export class ApiPermissionsService {
  constructor(
    @InjectRepository(ApiPermission)
    private readonly repo: Repository<ApiPermission>,
  ) {}

  async create(dto: CreateApiPermissionDto): Promise<ApiPermission> {
    const exists = await this.repo.findOne({ where: { code: dto.code } });
    if (exists) throw new ConflictException('接口权限编码已存在');
    const row = this.repo.create({
      code: dto.code,
      name: dto.name,
      httpMethod: dto.httpMethod ?? null,
      routePath: dto.routePath ?? null,
      description: dto.description ?? null,
    });
    return this.repo.save(row);
  }

  async update(dto: UpdateApiPermissionDto): Promise<ApiPermission> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException('接口权限不存在');
    if (dto.code != null && dto.code !== row.code) {
      const clash = await this.repo.findOne({ where: { code: dto.code } });
      if (clash) throw new ConflictException('接口权限编码已存在');
      row.code = dto.code;
    }
    if (dto.name != null) row.name = dto.name;
    if (dto.httpMethod !== undefined) row.httpMethod = dto.httpMethod;
    if (dto.routePath !== undefined) row.routePath = dto.routePath;
    if (dto.description !== undefined) row.description = dto.description;
    return this.repo.save(row);
  }

  async remove(dto: DeleteApiPermissionDto): Promise<void> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException('接口权限不存在');
    await this.repo.remove(row);
  }

  async list(dto: ListApiPermissionDto) {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 50, 200);
    const qb = this.repo.createQueryBuilder('ap');
    if (dto.keyword?.trim()) {
      qb.where('(ap.code LIKE :kw OR ap.name LIKE :kw)', { kw: `%${dto.keyword.trim()}%` });
    }
    const [list, total] = await qb
      .orderBy('ap.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }
}
