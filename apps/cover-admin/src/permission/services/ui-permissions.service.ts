import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UiPermission } from '../entities/ui-permission.entity';
import { UiPermissionType } from '../entities/ui-permission-type.enum';
import {
  CreateUiPermissionDto,
  DeleteUiPermissionDto,
  ListUiPermissionDto,
  MoveUiPermissionDto,
  UpdateUiPermissionDto,
} from '../dto/ui-permission.dto';
import { buildUiTree, UiPermissionTreeNode } from '../utils/ui-tree.util';

@Injectable()
export class UiPermissionsService {
  constructor(
    @InjectRepository(UiPermission)
    private readonly repo: Repository<UiPermission>,
  ) {}

  async create(dto: CreateUiPermissionDto): Promise<UiPermission> {
    if (dto.type === UiPermissionType.BUTTON && (!dto.code || !dto.code.trim())) {
      throw new BadRequestException('按钮类型必须提供唯一 code');
    }
    if (dto.code?.trim()) {
      const clash = await this.repo.findOne({ where: { code: dto.code.trim() } });
      if (clash) throw new ConflictException('菜单/按钮 code 已存在');
    }
    if (dto.parentId != null) {
      const parent = await this.repo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('父节点不存在');
    }
    const row = this.repo.create({
      parentId: dto.parentId ?? null,
      type: dto.type,
      name: dto.name,
      code: dto.code?.trim() || null,
      path: dto.path ?? null,
      sortOrder: dto.sortOrder ?? 0,
      showInMenu: dto.showInMenu ?? true,
      remark: dto.remark ?? null,
    });
    return this.repo.save(row);
  }

  async update(dto: UpdateUiPermissionDto): Promise<UiPermission> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException('节点不存在');
    if (dto.parentId !== undefined) {
      if (dto.parentId === dto.id) {
        throw new BadRequestException('不能将父节点设为自身');
      }
      if (dto.parentId != null) {
        const parent = await this.repo.findOne({ where: { id: dto.parentId } });
        if (!parent) throw new NotFoundException('父节点不存在');
        const wouldCycle = await this.wouldCreateCycle(dto.id, dto.parentId);
        if (wouldCycle) throw new BadRequestException('不能将节点移动到其子树之下');
      }
      row.parentId = dto.parentId;
    }
    if (dto.type != null) row.type = dto.type;
    if (dto.name != null) row.name = dto.name;
    if (dto.code !== undefined) {
      const c = dto.code?.trim() || null;
      if (row.type === UiPermissionType.BUTTON && !c) {
        throw new BadRequestException('按钮类型必须提供唯一 code');
      }
      if (c) {
        const clash = await this.repo.findOne({ where: { code: c } });
        if (clash && clash.id !== row.id) throw new ConflictException('菜单/按钮 code 已存在');
      }
      row.code = c;
    }
    if (dto.path !== undefined) row.path = dto.path;
    if (dto.sortOrder != null) row.sortOrder = dto.sortOrder;
    if (dto.showInMenu !== undefined) row.showInMenu = dto.showInMenu;
    if (dto.remark !== undefined) row.remark = dto.remark;
    return this.repo.save(row);
  }

  async remove(dto: DeleteUiPermissionDto): Promise<void> {
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException('节点不存在');
    await this.repo.remove(row);
  }

  async listFlat(dto: ListUiPermissionDto): Promise<UiPermission[]> {
    const where =
      dto.parentId === undefined
        ? {}
        : dto.parentId === null
          ? { parentId: IsNull() }
          : { parentId: dto.parentId };
    return this.repo.find({
      where,
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async tree(): Promise<UiPermissionTreeNode[]> {
    const flat = await this.repo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
    return buildUiTree(flat);
  }

  /** 将节点移动到根（parentId=null）或指定父节点下；校验环路 */
  async move(dto: MoveUiPermissionDto): Promise<UiPermission> {
    if (dto.parentId === undefined) {
      throw new BadRequestException('请指定 parentId：传 null 表示根目录，或传目标父节点 id');
    }
    const row = await this.repo.findOne({ where: { id: dto.id } });
    if (!row) throw new NotFoundException('节点不存在');
    if (dto.parentId !== null) {
      if (dto.parentId === dto.id) {
        throw new BadRequestException('不能将父节点设为自身');
      }
      const parent = await this.repo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('目标父节点不存在');
      const wouldCycle = await this.wouldCreateCycle(dto.id, dto.parentId);
      if (wouldCycle) throw new BadRequestException('不能将节点移动到其子树之下');
    }
    row.parentId = dto.parentId;
    return this.repo.save(row);
  }

  private async wouldCreateCycle(nodeId: number, newParentId: number): Promise<boolean> {
    let pid: number | null = newParentId;
    const visited = new Set<number>();
    while (pid != null) {
      if (pid === nodeId) return true;
      if (visited.has(pid)) return true;
      visited.add(pid);
      const p = await this.repo.findOne({ where: { id: pid }, select: ['parentId'] });
      pid = p?.parentId ?? null;
    }
    return false;
  }
}
