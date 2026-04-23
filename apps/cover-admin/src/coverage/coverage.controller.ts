import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CoverageService } from './coverage.service';

@Controller('coverage')
export class CoverageController {
  constructor(private readonly service: CoverageService) {}

  /**
   * SDK 上报 Istanbul 覆盖率 JSON（公开接口，无需 JWT）。
   * 请求头：X-Project-Code、X-Git-Branch（须与「分支覆盖率」配置一致）；可选 X-Git-Commit。
   */
  @Post('upload')
  @Public()
  @HttpCode(HttpStatus.OK)
  async upload(@Req() req: Request, @Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('请求体须为 JSON 对象');
    }
    const projectCode = readHeader(req, 'x-project-code');
    const gitBranch = readHeader(req, 'x-git-branch');
    const gitCommit = readHeader(req, 'x-git-commit');
    const parentCommitHeader = readHeader(req, 'x-parent-commit');
    const coverageModeHeader = readHeader(req, 'x-coverage-mode');
    const diffBaseCommitHeader = readHeader(req, 'x-diff-base-commit');
    return this.service.ingest({
      body: body as Record<string, unknown>,
      projectCode,
      gitBranch,
      gitCommit,
      parentCommitHeader,
      coverageModeHeader,
      diffBaseCommitHeader,
    });
  }
}

function readHeader(req: Request, lowerName: string): string | undefined {
  const v = req.headers[lowerName];
  if (Array.isArray(v)) return v[0]?.trim() || undefined;
  if (typeof v === 'string') return v.trim() || undefined;
  return undefined;
}
