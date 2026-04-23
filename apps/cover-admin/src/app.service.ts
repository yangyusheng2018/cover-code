/**
 * 根服务：简单业务逻辑
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** 返回应用欢迎信息 */
  getHello(): string {
    return 'NestJS API with dual-token auth';
  }
}
