-- 用户管理菜单展示名、添加用户按钮、删除按钮排序；可重复执行中 INSERT 段
UPDATE `ui_permission` SET `name` = '用户管理页面' WHERE `id` = 2 AND `code` = 'menu.user';

UPDATE `ui_permission` SET `sort_order` = 3 WHERE `id` = 4 AND `code` = 'btn.user.delete';

INSERT INTO `ui_permission` (`id`, `parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT 18, 2, 'button', '添加用户', 'btn.user.add', NULL, 2, 0, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `id` = 18);

INSERT IGNORE INTO `role_ui_permission` (`role_id`, `ui_permission_id`) VALUES (1, 18);
