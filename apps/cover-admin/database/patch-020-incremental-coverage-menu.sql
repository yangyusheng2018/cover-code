-- 「增量覆盖率」菜单（前端路由 `/report/incremental-coverage`，与 UI 门禁中的 `/system/incremental-coverage` 成对）
INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT 1, 'menu', '增量覆盖率', 'menu.incremental_coverage', '/system/incremental-coverage', 14, 1, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'menu.incremental_coverage');

INSERT IGNORE INTO `role_ui_permission` (`role_id`, `ui_permission_id`)
SELECT r.`id`, u.`id`
FROM `role` r
INNER JOIN `ui_permission` u ON u.`code` = 'menu.incremental_coverage'
WHERE r.`code` = 'super_admin';
