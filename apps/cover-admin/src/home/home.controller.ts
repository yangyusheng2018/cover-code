/**
 * 浏览器欢迎页：路由在全局前缀之外，为 GET /home
 */
import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";

@Controller()
export class HomeController {
  @Public()
  @Get("home")
  @Header("Content-Type", "text/html; charset=utf-8")
  getHome(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>欢迎</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f1419; color: #e6edf3; }
    main { text-align: center; padding: 2rem; max-width: 28rem; }
    h1 { font-size: 1.75rem; font-weight: 600; margin: 0 0 0.5rem; letter-spacing: 0.02em; }
    p { margin: 0; opacity: 0.85; font-size: 0.95rem; line-height: 1.5; }
    .path { margin-top: 1.25rem; font-family: ui-monospace, monospace; font-size: 0.8rem; opacity: 0.55; }
  </style>
</head>
<body>
  <main>
    <h1>欢迎使用</h1>
    <p>您已进入系统欢迎页。管理端接口位于 <code>/api</code> 路径下。</p>
    <p class="path">当前路径：/home</p>
  </main>
</body>
</html>`;
  }
}
