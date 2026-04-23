/**
 * 用户控制器：用户注册、删除、按用户名模糊查询
 */
import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { ListUserQueryDto } from './dto/list-user-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireApiPermissions } from '../permission/decorators/require-api-permission.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** POST /api/users/register 用户注册，密码会做 bcrypt 哈希后入库 */
  @Public()
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /** POST /api/users/change-password 当前登录用户修改自己的密码（需 JWT，不要求接口权限码） */
  @Post('change-password')
  async changePassword(
    @CurrentUser('sub') sub: string,
    @Body() dto: ChangeOwnPasswordDto,
  ): Promise<{ message: string }> {
    const userId = Number(sub);
    await this.usersService.changeOwnPassword(userId, dto);
    return { message: '密码已更新' };
  }

  /** POST /api/users/delete 根据用户 id 删除，请求体 id 必填 */
  @RequireApiPermissions('user:delete')
  @Post('delete')
  async remove(@Body() dto: DeleteUserDto) {
    await this.usersService.remove(dto.id);
    return { message: '删除成功' };
  }

  /** POST /api/users/list 分页查询，请求体：username（可选）、page（默认1）、pageSize（默认10） */
  @RequireApiPermissions('user:list')
  @Post('list')
  async list(@Body() query: ListUserQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    return this.usersService.findByUsernameFuzzy(query.username, page, pageSize);
  }
}
