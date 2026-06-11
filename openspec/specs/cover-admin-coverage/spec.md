## Purpose

cover-admin 覆盖率上报接入、项目管理、分支覆盖率任务、报告详情与人工标记。

## Requirements

### Requirement: 公开覆盖率上报

`POST /api/coverage/upload` MUST 为公开接口（无需 JWT）；MUST 根据 `X-Project-Code` 与 `X-Git-Branch` 匹配 `branch_coverage`；业务失败时 HTTP MUST 仍为 200 且 `success: false`。

#### Scenario: 成功上报全量任务

- **WHEN** 请求头含有效 project code 与 test branch，body 为 Istanbul 多文件 payload
- **THEN** 创建或更新对应 `coverage_report` 与 `coverage_file` 行级数据，返回 `success: true` 及 `reportId`、`files` 统计

#### Scenario: 同 commit 再次上报合并

- **WHEN** 同一 `branch_coverage` + 同一 `git_commit` 再次上报
- **THEN** MUST 更新同一条 report；行级合并 MUST 保留此前已覆盖行（`carried: true`），避免刷新导致覆盖归零

### Requirement: 增量与跨提交继承

增量任务（`task_scope = incremental`）入库前 MUST 按 GitHub compare 过滤 diff 范围内文件与行；跨提交 MUST 支持显式/隐式父 commit 行继承与 `meta.fileChanges.resetLines` 重置。

#### Scenario: 增量任务 diff 过滤

- **WHEN** branch_coverage 为 incremental 且 GitHub compare 可用
- **THEN** 仅 diff 涉及路径写入库；`line_details.inScope` 反映 diff 范围

#### Scenario: Source map 行号映射

- **WHEN** payload 含 `inputSourceMap`
- **THEN** 服务端 MUST 使用 istanbul-lib-source-maps 映射后再计算 `line_details`；映射失败 MUST 告警并回退未映射数据

### Requirement: 项目管理

`/api/projects` MUST 提供 CRUD；项目 MUST 含全局唯一 `code`、`gitUrl`、`mainBranch`、可选 `relativeDir` 与加密存储的 `repoToken`（响应仅 `hasRepoToken`）。

#### Scenario: 创建项目

- **WHEN** `POST /api/projects/create` 含 name、code、gitUrl
- **THEN** 项目入库；`code` 仅允许字母数字及 `._-`；SDK 侧 `project_code` MUST 与此 code 一致

### Requirement: 分支覆盖率任务

`/api/branch-coverages` MUST 关联项目与测试分支；同一 `projectId + test_branch` 全局 MUST 仅一条记录；`taskScope` 为 `full` 或 `incremental` 决定列表归属。

#### Scenario: 覆盖率详情弹窗

- **WHEN** `POST /api/branch-coverages/coverage-report` 含 `branchCoverageId`
- **THEN** 返回 summary、fileTree、files 行级详情；incremental 视图 MUST 在 task_scope 为 incremental 时可用

#### Scenario: 远程拉取源码

- **WHEN** `POST /api/branch-coverages/source-file` 含 path 与 branchCoverageId
- **THEN** 服务端按 gitUrl、commit、repoToken 从 GitHub/GitLab 等拉取 UTF-8 源码正文供前端着色

### Requirement: 人工标记与重置

系统 MUST 支持 `coverage-manual-marks`（冗余、兜底、插桩排除）与 `reset-coverage` 清空该分支下全部上报。

#### Scenario: 行级人工标记

- **WHEN** 详情弹窗提交 lineMarks 为 `redundant_covered` 或 `fallback_covered`
- **THEN** 该行在统计中 MUST 视为已覆盖；标记 MUST 持久化于 `coverage_file.manual_marks` 并在再次上报时按基准重放

#### Scenario: 清空覆盖率

- **WHEN** `POST /api/branch-coverages/reset-coverage`
- **THEN** 删除该 branch_coverage 下全部 coverage_report（级联 coverage_file），保留 branch_coverage 配置本身
