## Purpose

浏览器端 Istanbul 插桩与定时上报 SDK（`sdk/` 下 `istanbul-live-*` 系列包）。

## Requirements

### Requirement: Core 上报与路径解析

`istanbul-live-core` MUST 提供 `buildCoverageUploadInlineScript` 生成浏览器内定时 POST `window.__coverage__` 的内联脚本；MUST 提供 `resolveCoverageReportPathRoot` 与 `resolveGitUploadMeta` 用于路径归一化与 Git 元数据。

#### Scenario: 上报脚本携带项目标识

- **WHEN** 插件启用 upload 且配置 `project_code` 与 `endpoint`
- **THEN** 内联脚本 MUST 在请求头携带 `X-Project-Code`，并按 `intervalMs`（默认 3000ms，最小 500ms）向 endpoint POST

#### Scenario: 覆盖率路径归一化

- **WHEN** 上报脚本执行且存在 `reportPathRoot`
- **THEN** coverage 对象键及条目内 `path` MUST 规范为相对仓库根的路径

### Requirement: Vite 插件组合

`istanbul-live-vite-plugin` MUST 导出 `istanbulLiveVitePlugin(options)` 返回插件数组（含 vite-plugin-istanbul、可选 Vue template 插桩、上报注入）；启用插桩时 `project_code` MUST 为非空字符串，否则构建 MUST 失败。

#### Scenario: Vite 开发模式插桩与上报

- **WHEN** `coverage: true` 且配置 `upload.endpoint`，执行 `vite dev`
- **THEN** 源码被 Istanbul 插桩，HTML head 注入上报脚本，浏览器周期性 POST 至 endpoint

#### Scenario: Vue SFC 模板分支覆盖

- **WHEN** `vueTemplateCoverage` 为 true（默认）
- **THEN** 对 `?vue&type=template` 虚拟块进行二次插桩，使模板分支进入覆盖率统计

### Requirement: Webpack 插件组合

`istanbul-live-webpack-plugin` MUST 在 `coverage: true` 时对匹配源码插桩，并在存在 html-webpack-plugin 时向 HTML 注入与 core 一致的上报脚本。

#### Scenario: Webpack 构建插桩

- **WHEN** 启用 `IstanbulLiveWebpackPlugin` 且 `coverage: true`
- **THEN** 匹配 `include`/`exclude` 的模块经 istanbul-loader 插桩，构建产物可在浏览器产生 `__coverage__`

### Requirement: 与管理端对齐的配置

SDK 插件 MUST 将 `project_code` 映射为上报头 `X-Project-Code`；`upload.endpoint` MUST 指向管理端 `POST /api/coverage/upload` 或兼容接收端。

#### Scenario: 未配置分支覆盖率任务

- **WHEN** SDK 向 cover-admin 上报，但项目 code + 测试分支无对应 `branch_coverage` 记录
- **THEN** 服务端 HTTP 200 且 `{ success: false, message: "无此项目或者分支" }`

### Requirement: Babel 插桩辅助

`istanbul-live-babel` MUST 提供非 Vite/Webpack 标准链路下的 Babel 单段插桩辅助，供高级集成场景使用。

#### Scenario: 独立 Babel 流水线

- **WHEN** 业务工程使用自定义 Babel 构建且引入 `istanbul-live-babel`
- **THEN** 可在不依赖 Vite/Webpack 插件的情况下对指定源码插桩
