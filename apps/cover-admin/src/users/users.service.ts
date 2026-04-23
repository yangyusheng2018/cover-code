/**
 * 用户服务：用户表增删改查、密码校验，供认证模块使用
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 按用户名查询用户 */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  /** 按 ID 查询用户 */
  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  /** 创建用户：校验用户名唯一、密码 bcrypt 哈希后入库，返回不含密码的字段，id 自增 */
  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.findByUsername(dto.username);
    if (existing) {
      throw new ConflictException('用户名已存在');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      email: dto.email ?? null,
    });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...result } = saved;
    return result;
  }

  /** 校验明文密码与哈希是否一致 */
  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** 根据用户 id 删除用户，不存在则抛出 NotFoundException */
  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    await this.userRepo.remove(user);
  }

  /** 当前用户修改自己的密码：校验原密码后写入新哈希 */
  async changeOwnPassword(userId: number, dto: ChangeOwnPasswordDto): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const ok = await this.validatePassword(dto.oldPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('原密码不正确');
    }
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
  }

  /** 根据用户名模糊查询用户列表（分页），username 不传则查全部；返回不含密码 */
  async findByUsernameFuzzy(
    username: string | undefined,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ list: Omit<User, 'passwordHash'>[]; total: number; page: number; pageSize: number }> {
    const qb = this.userRepo.createQueryBuilder('user').select([
      'user.id',
      'user.username',
      'user.email',
      'user.createdAt',
      'user.updatedAt',
    ]);
    if (username && username.trim()) {
      qb.where('user.username LIKE :name', { name: `%${username.trim()}%` });
    }
    const [list, total] = await qb
      .orderBy('user.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }
}
