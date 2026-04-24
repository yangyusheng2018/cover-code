-- 增量覆盖率页独立按钮（与「全量覆盖率管理」下 btn.branch_coverage.* 解耦）
-- 父节点为 menu.incremental_coverage

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '增量覆盖率-查询', 'btn.incremental_coverage.query', NULL, 1, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.incremental_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.incremental_coverage.query');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '增量覆盖率-新增', 'btn.incremental_coverage.add', NULL, 2, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.incremental_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.incremental_coverage.add');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '增量覆盖率-查看详情', 'btn.incremental_coverage.detail', NULL, 3, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.incremental_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.incremental_coverage.detail');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '增量覆盖率-重置', 'btn.incremental_coverage.reset', NULL, 4, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.incremental_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.incremental_coverage.reset');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '增量覆盖率-编辑', 'btn.incremental_coverage.edit', NULL, 5, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.incremental_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.incremental_coverage.edit');

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '增量覆盖率-删除', 'btn.incremental_coverage.remove', NULL, 6, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.incremental_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.incremental_coverage.remove');

-- 已勾选「增量覆盖率」菜单的角色，自动勾选上述按钮（与菜单同权扩展）
INSERT IGNORE INTO `role_ui_permission` (`role_id`, `ui_permission_id`)
SELECT rup.`role_id`, u.`id`
FROM `role_ui_permission` rup
INNER JOIN `ui_permission` mp ON mp.`id` = rup.`ui_permission_id` AND mp.`code` = 'menu.incremental_coverage'
INNER JOIN `ui_permission` u ON u.`code` IN (
  'btn.incremental_coverage.query',
  'btn.incremental_coverage.add',
  'btn.incremental_coverage.detail',
  'btn.incremental_coverage.reset',
  'btn.incremental_coverage.edit',
  'btn.incremental_coverage.remove'
);
