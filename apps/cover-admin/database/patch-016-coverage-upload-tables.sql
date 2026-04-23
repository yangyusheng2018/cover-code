-- 已有库增加覆盖率上报表 coverage_report、coverage_file；可重复执行（CREATE IF NOT EXISTS）。

CREATE TABLE IF NOT EXISTS `coverage_report` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_coverage_id` bigint unsigned NOT NULL COMMENT '关联 branch_coverage（项目+测试分支）',
  `git_commit` varchar(64) DEFAULT NULL COMMENT '当前提交 X-Git-Commit',
  `coverage_mode` varchar(16) NOT NULL DEFAULT 'full' COMMENT 'full=全量 incremental=增量 inScope',
  `parent_commit` varchar(64) DEFAULT NULL COMMENT '合并来源父提交（meta）',
  `diff_base_commit` varchar(64) DEFAULT NULL COMMENT '增量 diff 基准（如 main）',
  `file_count` int unsigned NOT NULL DEFAULT '0' COMMENT '本批次文件数',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cr_bc_commit` (`branch_coverage_id`, `git_commit`),
  KEY `idx_cr_bc_created` (`branch_coverage_id`, `created_at`),
  CONSTRAINT `fk_cr_branch_coverage` FOREIGN KEY (`branch_coverage_id`) REFERENCES `branch_coverage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='一次覆盖率上报';

CREATE TABLE IF NOT EXISTS `coverage_file` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `report_id` bigint unsigned NOT NULL,
  `path` varchar(4096) NOT NULL COMMENT '文件路径（与 Istanbul 键一致）',
  `line_details` json NOT NULL COMMENT '行级：inScope/instrument/covered/carried',
  `covered_lines` json NOT NULL COMMENT '由 line_details 派生（兼容/查询）',
  `uncovered_lines` json NOT NULL COMMENT '由 line_details 派生（兼容/查询）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cf_report_path` (`report_id`, `path`(512)),
  KEY `idx_cf_report` (`report_id`),
  CONSTRAINT `fk_cf_report` FOREIGN KEY (`report_id`) REFERENCES `coverage_report` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单文件行覆盖明细';
