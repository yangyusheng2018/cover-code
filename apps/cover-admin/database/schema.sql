-- NestJS 双 Token 认证 + RBAC 权限 - MySQL 8（仅用户 / 登录 / 角色与权限）
-- 执行前请先创建数据库:
--   CREATE DATABASE cover_admin DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cover_admin;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `coverage_file`;
DROP TABLE IF EXISTS `coverage_report`;
DROP TABLE IF EXISTS `branch_coverage`;
DROP TABLE IF EXISTS `project`;
DROP TABLE IF EXISTS `role_ui_permission`;
DROP TABLE IF EXISTS `role_api_permission`;
DROP TABLE IF EXISTS `user_role`;
DROP TABLE IF EXISTS `refresh_token`;
DROP TABLE IF EXISTS `ui_permission`;
DROP TABLE IF EXISTS `api_permission`;
DROP TABLE IF EXISTS `role`;
DROP TABLE IF EXISTS `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- 用户表
-- ----------------------------
CREATE TABLE `user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID (自增)',
  `username` varchar(64) NOT NULL COMMENT '用户名',
  `password_hash` varchar(255) NOT NULL COMMENT '密码哈希 (bcrypt)',
  `email` varchar(255) DEFAULT NULL COMMENT '邮箱',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------
-- 刷新令牌表
-- ----------------------------
CREATE TABLE `refresh_token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键 (自增)',
  `user_id` bigint unsigned NOT NULL COMMENT '用户ID',
  `token` varchar(512) NOT NULL COMMENT 'Refresh Token 值',
  `expires_at` datetime(3) NOT NULL COMMENT '过期时间',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`(255)),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_refresh_token_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刷新令牌表';

-- ----------------------------
-- 用户角色
-- ----------------------------
CREATE TABLE `role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL COMMENT '角色名称',
  `code` varchar(64) NOT NULL COMMENT '角色编码；如 super_admin 仅为种子约定，权限仍按 role_* 绑定表校验',
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`code`),
  UNIQUE KEY `uk_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色';

-- ----------------------------
-- 用户 <-> 角色（多对多）
-- ----------------------------
CREATE TABLE `user_role` (
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  KEY `idx_user_role_role` (`role_id`),
  CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联';

-- ----------------------------
-- 接口权限（后端 @RequireApiPermissions 使用 code 校验）
-- ----------------------------
CREATE TABLE `api_permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(128) NOT NULL COMMENT '唯一编码，如 role:list',
  `name` varchar(128) NOT NULL,
  `http_method` varchar(16) DEFAULT NULL COMMENT '可选：GET/POST 等，便于文档',
  `route_path` varchar(255) DEFAULT NULL COMMENT '可选：路由说明',
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_api_permission_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接口权限';

-- ----------------------------
-- 角色拥有的接口权限
-- ----------------------------
CREATE TABLE `role_api_permission` (
  `role_id` bigint unsigned NOT NULL,
  `api_permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`, `api_permission_id`),
  KEY `idx_rap_api` (`api_permission_id`),
  CONSTRAINT `fk_rap_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rap_api` FOREIGN KEY (`api_permission_id`) REFERENCES `api_permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色接口权限';

-- ----------------------------
-- 菜单 / 目录 / 按钮（树）
-- ----------------------------
CREATE TABLE `ui_permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned DEFAULT NULL,
  `type` varchar(32) NOT NULL COMMENT 'directory | menu | button',
  `name` varchar(128) NOT NULL,
  `code` varchar(128) DEFAULT NULL COMMENT '按钮/菜单权限标识，目录可为空；非空时全局唯一',
  `path` varchar(255) DEFAULT NULL COMMENT '前端路由等',
  `sort_order` int NOT NULL DEFAULT 0,
  `show_in_menu` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否在侧栏菜单栏展示（0=否，仅权限/树；1=是）',
  `remark` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ui_permission_code` (`code`),
  KEY `idx_ui_parent` (`parent_id`),
  CONSTRAINT `fk_ui_parent` FOREIGN KEY (`parent_id`) REFERENCES `ui_permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单与按钮权限树';

-- ----------------------------
-- 角色拥有的菜单/按钮节点
-- ----------------------------
CREATE TABLE `role_ui_permission` (
  `role_id` bigint unsigned NOT NULL,
  `ui_permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`, `ui_permission_id`),
  KEY `idx_rup_ui` (`ui_permission_id`),
  CONSTRAINT `fk_rup_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rup_ui` FOREIGN KEY (`ui_permission_id`) REFERENCES `ui_permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色菜单按钮权限';

-- ----------------------------
-- 项目管理
-- ----------------------------
CREATE TABLE `project` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '项目名称',
  `code` varchar(128) NOT NULL COMMENT '项目唯一 code',
  `git_url` varchar(512) NOT NULL COMMENT 'Git 地址',
  `main_branch` varchar(128) NOT NULL DEFAULT 'master' COMMENT '主分支',
  `relative_dir` varchar(512) DEFAULT NULL COMMENT '项目相对目录',
  `repo_token` varchar(2048) DEFAULT NULL COMMENT '仓库访问令牌（私有拉取），仅服务端使用',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_code` (`code`),
  KEY `idx_project_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目管理';

-- ----------------------------
-- 分支覆盖率（关联项目）
-- ----------------------------
CREATE TABLE `branch_coverage` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL COMMENT '项目 id',
  `test_branch` varchar(255) NOT NULL COMMENT '测试分支',
  `task_scope` varchar(16) NOT NULL DEFAULT 'full' COMMENT 'full=全量覆盖率任务 incremental=增量覆盖率任务',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bc_project_branch` (`project_id`, `test_branch`),
  KEY `idx_bc_project` (`project_id`),
  CONSTRAINT `fk_bc_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分支覆盖率配置';

-- ----------------------------
-- 覆盖率上报（Istanbul JSON）
-- ----------------------------
CREATE TABLE `coverage_report` (
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

CREATE TABLE `coverage_file` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `report_id` bigint unsigned NOT NULL,
  `path` varchar(4096) NOT NULL COMMENT '文件路径（与 Istanbul 键一致）',
  `line_details` json NOT NULL COMMENT '行级：inScope/instrument/covered/carried（含人工标记合并结果）',
  `line_details_core` json NULL COMMENT '插桩+继承基准，不含人工标记',
  `covered_lines` json NOT NULL COMMENT '由 line_details 派生（兼容/查询）',
  `uncovered_lines` json NOT NULL COMMENT '由 line_details 派生（兼容/查询）',
  `manual_marks` json NULL COMMENT '人工标记 JSON：fileMark / lineMarks',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cf_report_path` (`report_id`, `path`(512)),
  KEY `idx_cf_report` (`report_id`),
  CONSTRAINT `fk_cf_report` FOREIGN KEY (`report_id`) REFERENCES `coverage_report` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单文件行覆盖明细';

-- ----------------------------
-- 初始化数据（顺序有依赖）
-- ① 默认「用户角色」：编码 super_admin（与其它角色相同，权限仅来自下方绑定；种子为其绑定全部接口/UI）
-- ② 接口权限元数据、③ 将该角色与全部接口权限绑定、④ UI 菜单树、⑤ 将该角色与全部 UI 节点绑定
-- ⑥ 初始登录用户、⑦ 将初始用户归入上述角色（user_role）
-- ----------------------------
INSERT INTO `role` (`id`, `name`, `code`, `description`) VALUES
(1, '用户角色', 'super_admin', '初始角色：已绑定全部接口与 UI 权限；无代码层权限短路');

INSERT INTO `api_permission` (`code`, `name`, `http_method`, `route_path`, `description`) VALUES
('user:list', '用户分页列表', 'POST', '/api/users/list', NULL),
('user:delete', '删除用户', 'POST', '/api/users/delete', NULL),
('role:list', '角色列表', 'POST', '/api/roles/list', NULL),
('role:detail', '角色详情', 'POST', '/api/roles/detail', NULL),
('role:create', '创建角色', 'POST', '/api/roles/create', NULL),
('role:update', '更新角色', 'POST', '/api/roles/update', NULL),
('role:delete', '删除角色', 'POST', '/api/roles/delete', NULL),
('role:assign-users', '角色添加用户', 'POST', '/api/roles/assign-users', NULL),
('role:remove-users', '角色移除用户', 'POST', '/api/roles/remove-users', NULL),
('role:set-api-permissions', '角色配置接口权限', 'POST', '/api/roles/set-api-permissions', NULL),
('role:set-ui-permissions', '角色配置菜单按钮', 'POST', '/api/roles/set-ui-permissions', NULL),
('role:list-users', '角色下用户列表', 'POST', '/api/roles/list-users', NULL),
('api-perm:list', '接口权限列表', 'POST', '/api/api-permissions/list', NULL),
('api-perm:create', '创建接口权限', 'POST', '/api/api-permissions/create', NULL),
('api-perm:update', '更新接口权限', 'POST', '/api/api-permissions/update', NULL),
('api-perm:delete', '删除接口权限', 'POST', '/api/api-permissions/delete', NULL),
('ui-perm:list', 'UI 权限平铺列表', 'POST', '/api/ui-permissions/list', NULL),
('ui-perm:tree', 'UI 权限树', 'GET', '/api/ui-permissions/tree', NULL),
('ui-perm:create', '创建 UI 节点', 'POST', '/api/ui-permissions/create', NULL),
('ui-perm:update', '更新 UI 节点', 'POST', '/api/ui-permissions/update', NULL),
('ui-perm:delete', '删除 UI 节点', 'POST', '/api/ui-permissions/delete', NULL),
('ui-perm:move', '移动 UI 节点', 'POST', '/api/ui-permissions/move', NULL),
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

-- 用户角色（id=1）拥有当前库中全部接口权限
INSERT INTO `role_api_permission` (`role_id`, `api_permission_id`)
SELECT 1, `id` FROM `api_permission`;

INSERT INTO `ui_permission` (`id`, `parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`) VALUES
(1, NULL, 'directory', '用户权限', NULL, NULL, 0, 1, '根目录；仅子级 menu 为可访问页面'),
(17, 1, 'menu', '欢迎页', 'menu.home', '/home', 5, 1, NULL),
(2, 1, 'menu', '用户管理页面', 'menu.user', '/system/user', 10, 1, NULL),
(3, 2, 'button', '用户查询', 'btn.user.query', NULL, 1, 0, NULL),
(18, 2, 'button', '添加用户', 'btn.user.add', NULL, 2, 0, NULL),
(4, 2, 'button', '用户删除', 'btn.user.delete', NULL, 3, 0, NULL),
(5, 1, 'menu', '角色管理', 'menu.role', '/system/role', 20, 1, NULL),
(6, 5, 'button', '角色编辑', 'btn.role.edit', NULL, 1, 0, NULL),
(7, 1, 'menu', '接口权限管理', 'menu.api_permission', '/system/api-permission', 30, 1, NULL),
(8, 7, 'button', '接口权限-查询', 'btn.api_perm.query', NULL, 1, 0, NULL),
(9, 7, 'button', '接口权限-新增', 'btn.api_perm.add', NULL, 2, 0, NULL),
(10, 7, 'button', '接口权限-编辑', 'btn.api_perm.edit', NULL, 3, 0, NULL),
(11, 7, 'button', '接口权限-删除', 'btn.api_perm.remove', NULL, 4, 0, NULL),
(12, 1, 'menu', '菜单与按钮', 'menu.ui_permission', '/system/ui-permission', 40, 1, NULL),
(13, 12, 'button', '菜单按钮-查询', 'btn.ui_perm.query', NULL, 1, 0, NULL),
(14, 12, 'button', '菜单按钮-新增', 'btn.ui_perm.add', NULL, 2, 0, NULL),
(15, 12, 'button', '菜单按钮-编辑', 'btn.ui_perm.edit', NULL, 3, 0, NULL),
(16, 12, 'button', '菜单按钮-删除', 'btn.ui_perm.remove', NULL, 4, 0, NULL),
(19, 5, 'button', '角色查询', 'btn.role.query', NULL, 0, 0, NULL),
(20, 5, 'button', '新建角色', 'btn.role.create', NULL, 2, 0, NULL),
(21, 5, 'button', '权限与用户', 'btn.role.manage', NULL, 3, 0, NULL),
(22, 5, 'button', '删除角色', 'btn.role.delete', NULL, 5, 0, NULL),
(23, 5, 'button', '添加成员', 'btn.role.assign_users', NULL, 6, 0, NULL),
(24, 5, 'button', '移除成员', 'btn.role.remove_user', NULL, 7, 0, NULL),
(25, 5, 'button', '保存接口权限', 'btn.role.save_api', NULL, 8, 0, NULL),
(26, 5, 'button', '保存菜单与按钮', 'btn.role.save_ui', NULL, 9, 0, NULL),
(27, 12, 'button', '菜单按钮-移动', 'btn.ui_perm.move', NULL, 5, 0, NULL),
(28, 1, 'menu', '项目管理', 'menu.project', '/system/project', 12, 1, NULL),
(29, 28, 'button', '项目-查询', 'btn.project.query', NULL, 1, 0, NULL),
(30, 28, 'button', '项目-新增', 'btn.project.add', NULL, 2, 0, NULL),
(31, 28, 'button', '项目-编辑', 'btn.project.edit', NULL, 3, 0, NULL),
(32, 28, 'button', '项目-删除', 'btn.project.delete', NULL, 4, 0, NULL),
(33, 1, 'menu', '分支覆盖率', 'menu.branch_coverage', '/system/branch-coverage', 13, 1, NULL),
(34, 33, 'button', '覆盖率-查询', 'btn.branch_coverage.query', NULL, 1, 0, NULL),
(35, 33, 'button', '覆盖率-新增', 'btn.branch_coverage.add', NULL, 2, 0, NULL),
(36, 33, 'button', '覆盖率-编辑', 'btn.branch_coverage.edit', NULL, 3, 0, NULL),
(37, 33, 'button', '覆盖率-删除', 'btn.branch_coverage.delete', NULL, 4, 0, NULL),
(38, 33, 'button', '覆盖率-重置', 'btn.branch_coverage.reset', NULL, 5, 0, NULL),
(39, 1, 'menu', '增量覆盖率', 'menu.incremental_coverage', '/system/incremental-coverage', 14, 1, NULL),
(40, 39, 'button', '增量覆盖率-查询', 'btn.incremental_coverage.query', NULL, 1, 0, NULL),
(41, 39, 'button', '增量覆盖率-新增', 'btn.incremental_coverage.add', NULL, 2, 0, NULL),
(42, 39, 'button', '增量覆盖率-查看详情', 'btn.incremental_coverage.detail', NULL, 3, 0, NULL),
(43, 39, 'button', '增量覆盖率-重置', 'btn.incremental_coverage.reset', NULL, 4, 0, NULL),
(44, 39, 'button', '增量覆盖率-编辑', 'btn.incremental_coverage.edit', NULL, 5, 0, NULL),
(45, 39, 'button', '增量覆盖率-删除', 'btn.incremental_coverage.remove', NULL, 6, 0, NULL);

-- 用户角色（id=1）拥有当前库中全部 UI 权限
INSERT INTO `role_ui_permission` (`role_id`, `ui_permission_id`)
SELECT 1, `id` FROM `ui_permission`;

-- 初始用户：用户名 admin，密码 Admin@123（bcrypt 10 轮）；生产请改密
INSERT INTO `user` (`id`, `username`, `password_hash`, `email`) VALUES
(
  1,
  'admin',
  '$2a$10$BvGx0Kvoj3bNRg2BqlNO3ukIVDO/fgWZkPVbDGp8.N1MkDYy/PNDa',
  'admin@localhost'
);

-- 初始用户归属用户角色（role_id=1）
INSERT INTO `user_role` (`user_id`, `role_id`) VALUES (1, 1);

ALTER TABLE `role` AUTO_INCREMENT = 2;
ALTER TABLE `ui_permission` AUTO_INCREMENT = 46;
ALTER TABLE `user` AUTO_INCREMENT = 2;

-- ----------------------------
-- 可选: 创建数据库与用户 (需 root 执行)
-- ----------------------------
-- CREATE DATABASE IF NOT EXISTS cover_admin DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CREATE USER IF NOT EXISTS 'nest_mysql'@'%' IDENTIFIED BY 'nest_mysql_pwd';
-- GRANT ALL PRIVILEGES ON cover_admin.* TO 'nest_mysql'@'%';
-- FLUSH PRIVILEGES;
