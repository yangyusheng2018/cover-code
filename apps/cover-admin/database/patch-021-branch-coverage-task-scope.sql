-- 分支覆盖率：区分全量 / 增量任务；唯一键改为 (project_id, test_branch, task_scope)
-- 执行前请备份；已有数据默认 task_scope = full

ALTER TABLE `branch_coverage`
ADD COLUMN `task_scope` varchar(16) NOT NULL DEFAULT 'full'
  COMMENT 'full=全量覆盖率任务 incremental=增量覆盖率任务'
  AFTER `test_branch`;

ALTER TABLE `branch_coverage` DROP INDEX `uk_bc_project_branch`;

ALTER TABLE `branch_coverage`
ADD UNIQUE KEY `uk_bc_project_branch_scope` (`project_id`, `test_branch`, `task_scope`);
