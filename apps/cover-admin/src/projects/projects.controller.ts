import { Body, Controller, Get, Post } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import {
  CreateProjectDto,
  DeleteProjectDto,
  ListProjectDto,
  ProjectDetailDto,
  UpdateProjectDto,
} from "./dto/project.dto";
import { RequireApiPermissions } from "../permission/decorators/require-api-permission.decorator";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  /** 全部项目简要列表（下拉用）：仅 id / code / name，无分页 */
  @Get("options")
  @RequireApiPermissions("project:list")
  async optionsGet() {
    return this.service.findAllOptions();
  }

  /** 与 GET 相同，便于与其它 POST 风格接口统一调用 */
  @Post("options")
  @RequireApiPermissions("project:list")
  async optionsPost() {
    return this.service.findAllOptions();
  }

  @Post("list")
  @RequireApiPermissions("project:list")
  async list(@Body() dto: ListProjectDto) {
    return this.service.list(dto);
  }

  @Post("detail")
  @RequireApiPermissions("project:detail")
  async detail(@Body() dto: ProjectDetailDto) {
    return this.service.findOne(dto);
  }

  @Post("create")
  @RequireApiPermissions("project:create")
  async create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  @Post("update")
  @RequireApiPermissions("project:update")
  async update(@Body() dto: UpdateProjectDto) {
    return this.service.update(dto);
  }

  @Post("delete")
  @RequireApiPermissions("project:delete")
  async delete(@Body() dto: DeleteProjectDto) {
    await this.service.remove(dto);
    return { message: "删除成功" };
  }
}
