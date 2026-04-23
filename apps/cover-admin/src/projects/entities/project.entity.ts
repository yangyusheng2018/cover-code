import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('project')
export class Project {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** 业务唯一标识 */
  @Column({ type: 'varchar', length: 128, unique: true })
  code: string;

  @Column({ name: 'git_url', type: 'varchar', length: 512 })
  gitUrl: string;

  @Column({ name: 'main_branch', type: 'varchar', length: 128, default: 'master' })
  mainBranch: string;

  /** 仓库或工作区中的相对目录 */
  @Column({ name: 'relative_dir', type: 'varchar', length: 512, nullable: true })
  relativeDir: string | null;

  /**
   * 私有仓库访问令牌（PAT 等），仅服务端拉取源码使用；接口响应中不返回明文
   */
  @Column({ name: 'repo_token', type: 'varchar', length: 2048, nullable: true })
  repoToken: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
