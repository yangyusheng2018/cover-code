-- 将「旧版」coverage 表（无 line_details、无 coverage_mode 等）升级到当前结构。
-- 适用：曾执行过旧 patch-016（含 covered_lines/uncovered_lines）的库。
-- 执行前请备份；若列已存在会报错，可跳过对应语句。

-- 1) coverage_report 扩展
ALTER TABLE `coverage_report`
  ADD COLUMN `coverage_mode` varchar(16) NOT NULL DEFAULT 'full' COMMENT 'full=全量 incremental=增量 inScope' AFTER `git_commit`,
  ADD COLUMN `parent_commit` varchar(64) DEFAULT NULL COMMENT '合并来源父提交（meta）' AFTER `coverage_mode`,
  ADD COLUMN `diff_base_commit` varchar(64) DEFAULT NULL COMMENT '增量 diff 基准（如 main）' AFTER `parent_commit`,
  ADD COLUMN `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER `created_at`;

-- 若尚未有 uk_cr_bc_commit 且确认无重复 (branch_coverage_id, git_commit) 非空行，可取消注释：
-- ALTER TABLE `coverage_report` ADD UNIQUE KEY `uk_cr_bc_commit` (`branch_coverage_id`, `git_commit`);

-- 2) coverage_file：新增 line_details；旧数据需重新上报或由脚本从 covered_lines/uncovered_lines 生成 JSON 后再删旧列
ALTER TABLE `coverage_file` ADD COLUMN `line_details` json NULL COMMENT '行级明细' AFTER `path`;

-- 将旧列转为最小 line_details（仅 ok + covered/uncovered，无 inScope/carried）；生成后执行更新 UPDATE（示例需按行展开，建议应用层重传）
-- 完成后可：
-- ALTER TABLE `coverage_file` DROP COLUMN `covered_lines`, DROP COLUMN `uncovered_lines`;
-- ALTER TABLE `coverage_file` MODIFY `line_details` json NOT NULL;
