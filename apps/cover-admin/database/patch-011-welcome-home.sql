-- 已有库补「欢迎页」菜单节点（id=17）及超级管理员角色绑定；可重复执行（存在则跳过）
INSERT INTO `ui_permission` (`id`, `parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `remark`)
SELECT 17, 1, 'menu', '欢迎页', 'menu.home', '/home', 5, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `id` = 17);

INSERT IGNORE INTO `role_ui_permission` (`role_id`, `ui_permission_id`) VALUES (1, 17);
