/**
 * 应用入口：创建 Nest 应用、全局管道、监听端口
 */
import { NestFactory } from "@nestjs/core";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 解析 Cookie（RefreshToken 通过 HttpOnly Cookie 携带）
  app.use(cookieParser());
  // 开放跨域（credentials: true 以便携带 Cookie）
  const corsOrigins = process.env.CORS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins?.length
      ? corsOrigins
      : [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
          "http://localhost:5176",
          "http://localhost:5177",
          "http://localhost:5178",
          "http://localhost:5179",
          "http://localhost:4173",
          "http://localhost:4174",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
          "http://127.0.0.1:5175",
          "http://127.0.0.1:5176",
          "http://127.0.0.1:5177",
          "http://127.0.0.1:5178",
          "http://127.0.0.1:5179",
          "http://127.0.0.1:4173",
          "http://127.0.0.1:4174",
          "http://localhost:4179",
          "http://127.0.0.1:4178",
          "http://127.0.0.1:4179",
          "http://localhost:4178",
        ],
    credentials: true,
  });
  // 为所有路由加统一前缀，例如 /api/auth/login（欢迎页 /home 除外）
  app.setGlobalPrefix("api", {
    exclude: [{ path: "home", method: RequestMethod.GET }],
  });
  // 响应默认 Content-Type 为 application/json（HTML 欢迎页不覆盖）
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path !== "/home") {
      res.setHeader("Content-Type", "application/json");
    }
    next();
  });
  // 全局校验管道：白名单过滤、禁止多余字段、自动类型转换
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
