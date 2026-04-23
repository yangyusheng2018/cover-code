-- 将当前库中「全部接口权限」「全部 UI 权限（菜单/按钮）」绑定到 code = super_admin 的角色。
-- 可重复执行：已存在的 (role_id, *_id) 组合会被 INSERT IGNORE 跳过。
-- 执行前请确认存在角色：SELECT id, code, name FROM role WHERE code = 'super_admin';

-- 接口权限：全量绑定
INSERT IGNORE INTO `role_api_permission` (`role_id`, `api_permission_id`)
SELECT r.`id`, ap.`id`
FROM `role` r
CROSS JOIN `api_permission` ap
WHERE r.`code` = 'super_admin';

-- 菜单与按钮：全量绑定
INSERT IGNORE INTO `role_ui_permission` (`role_id`, `ui_permission_id`)
SELECT r.`id`, u.`id`
FROM `role` r
CROSS JOIN `ui_permission` u
WHERE r.`code` = 'super_admin';
