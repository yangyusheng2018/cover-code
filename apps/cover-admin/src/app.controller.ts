/**
 * 根控制器：提供健康检查或欢迎接口
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** GET /api 返回应用说明 */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
