/**
 * 根模块：注册全局配置、数据库、Redis、业务模块
 */
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HomeController } from "./home/home.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { RedisModule } from "./redis/redis.module";
import { User } from "./users/entities/user.entity";
import { RefreshToken } from "./auth/entities/refresh-token.entity";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { PermissionModule } from "./permission/permission.module";
import { Role } from "./permission/entities/role.entity";
import { UserRole } from "./permission/entities/user-role.entity";
import { ApiPermission } from "./permission/entities/api-permission.entity";
import { RoleApiPermission } from "./permission/entities/role-api-permission.entity";
import { UiPermission } from "./permission/entities/ui-permission.entity";
import { RoleUiPermission } from "./permission/entities/role-ui-permission.entity";
import { ApiPermissionGuard } from "./permission/guards/api-permission.guard";
import { Project } from "./projects/entities/project.entity";
import { BranchCoverage } from "./branch-coverages/entities/branch-coverage.entity";
import { ProjectsModule } from "./projects/projects.module";
import { BranchCoveragesModule } from "./branch-coverages/branch-coverages.module";
import { CoverageReport } from "./coverage/entities/coverage-report.entity";
import { CoverageFile } from "./coverage/entities/coverage-file.entity";
import { CoverageModule } from "./coverage/coverage.module";

@Module({
  imports: [
    // 全局环境变量，可从 .env 读取
    ConfigModule.forRoot({ isGlobal: true }),
    // MySQL 连接（用户表、refresh_token 表）
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mysql",
        host: config.get("DB_HOST", "localhost"),
        port: config.get<number>("DB_PORT", 3306) || 3306,
        username: config.get("DB_USERNAME", "root"),
        password: config.get("DB_PASSWORD", "qwer1234"),
        database: config.get("DB_DATABASE", "cover_admin"),
        entities: [
          User,
          RefreshToken,
          Role,
          UserRole,
          ApiPermission,
          RoleApiPermission,
          UiPermission,
          RoleUiPermission,
          Project,
          BranchCoverage,
          CoverageReport,
          CoverageFile,
        ],
        synchronize: false,
        charset: "utf8mb4",
      }),
    }),
    // Redis：存储 access_token，支持登出即失效
    RedisModule,
    UsersModule,
    AuthModule,
    PermissionModule,
    ProjectsModule,
    BranchCoveragesModule,
    CoverageModule,
  ],
  controllers: [AppController, HomeController],
  providers: [
    AppService,
    // 全局 JWT 守卫：除带 @Public 的接口外，其余接口都校验 accessToken
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiPermissionGuard,
    },
  ],
})
export class AppModule {}
