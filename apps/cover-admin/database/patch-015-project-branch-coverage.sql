-- 为已有库增加「项目管理」「分支覆盖率」表、接口权限与菜单种子；可重复执行（按 code 去重）。
-- 执行后建议对 super_admin 全量补绑：见 patch-014-super-admin-bind-all-permissions.sql

CREATE TABLE IF NOT EXISTS `project` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '项目名称',
  `code` varchar(128) NOT NULL COMMENT '项目唯一 code',
  `git_url` varchar(512) NOT NULL COMMENT 'Git 地址',
  `main_branch` varchar(128) NOT NULL DEFAULT 'master' COMMENT '主分支',
  `relative_dir` varchar(512) DEFAULT NULL COMMENT '项目相对目录',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_code` (`code`),
  KEY `idx_project_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目管理';

CREATE TABLE IF NOT EXISTS `branch_coverage` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL COMMENT '项目 id',
  `test_branch` varchar(255) NOT NULL COMMENT '测试分支',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bc_project_branch` (`project_id`, `test_branch`),
  KEY `idx_bc_project` (`project_id`),
  CONSTRAINT `fk_bc_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分支覆盖率配置';

INSERT IGNORE INTO `api_permission` (`code`, `name`, `http_method`, `route_path`, `description`) VALUES
('project:list', '项目分页列表；GET/POST /api/projects/options 简要列表', 'POST', '/api/projects/list', NULL),
('project:detail', '项目详情', 'POST', '/api/projects/detail', NULL),
('project:create', '创建项目', 'POST', '/api/projects/create', NULL),
('project:update', '更新项目', 'POST', '/api/projects/update', NULL),
('project:delete', '删除项目', 'POST', '/api/projects/delete', NULL),
('branch-coverage:list', '分支覆盖率分页列表', 'POST', '/api/branch-coverages/list', NULL),
('branch-coverage:detail', '分支覆盖率详情', 'POST', '/api/branch-coverages/detail', NULL),
('branch-coverage:create', '创建分支覆盖率', 'POST', '/api/branch-coverages/create', NULL),
('branch-coverage:update', '更新分支覆盖率', 'POST', '/api/branch-coverages/update', NULL),
('branch-coverage:delete', '删除分支覆盖率', 'POST', '/api/branch-coverages/delete', NULL);

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT 1, 'menu', '项目管理', 'menu.project', '/system/project', 12, 1, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'menu.project');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '项目-查询', 'btn.project.query', NULL, 1, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.project'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.project.query');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '项目-新增', 'btn.project.add', NULL, 2, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.project'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.project.add');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '项目-编辑', 'btn.project.edit', NULL, 3, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.project'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.project.edit');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '项目-删除', 'btn.project.delete', NULL, 4, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.project'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.project.delete');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT 1, 'menu', '分支覆盖率', 'menu.branch_coverage', '/system/branch-coverage', 13, 1, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'menu.branch_coverage');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '覆盖率-查询', 'btn.branch_coverage.query', NULL, 1, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.branch_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.branch_coverage.query');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '覆盖率-新增', 'btn.branch_coverage.add', NULL, 2, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.branch_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.branch_coverage.add');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '覆盖率-编辑', 'btn.branch_coverage.edit', NULL, 3, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.branch_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.branch_coverage.edit');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '覆盖率-删除', 'btn.branch_coverage.delete', NULL, 4, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.branch_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.branch_coverage.delete');

INSERT IGNORE INTO `role_api_permission` (`role_id`, `api_permission_id`)
SELECT r.`id`, ap.`id`
FROM `role` r
INNER JOIN `api_permission` ap ON ap.`code` IN (
  'project:list', 'project:detail', 'project:create', 'project:update', 'project:delete',
  'branch-coverage:list', 'branch-coverage:detail', 'branch-coverage:create', 'branch-coverage:update', 'branch-coverage:delete'
)
WHERE r.`code` = 'super_admin';

INSERT IGNORE INTO `role_ui_permission` (`role_id`, `ui_permission_id`)
SELECT r.`id`, u.`id`
FROM `role` r
INNER JOIN `ui_permission` u ON u.`code` IN (
  'menu.project', 'btn.project.query', 'btn.project.add', 'btn.project.edit', 'btn.project.delete',
  'menu.branch_coverage', 'btn.branch_coverage.query', 'btn.branch_coverage.add', 'btn.branch_coverage.edit', 'btn.branch_coverage.delete'
)
WHERE r.`code` = 'super_admin';
