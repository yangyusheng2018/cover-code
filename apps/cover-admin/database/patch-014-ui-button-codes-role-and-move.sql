-- 补充角色管理页、UI 树「移动」等按钮级 code，供前端仅用 UI 权限控制展示（与 API 码解耦）。
-- 执行一次；执行后请为需访问的角色绑定对应 `ui_permission`（或 `INSERT INTO role_ui_permission` 按需分配）。

INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`) VALUES
(5, 'button', '角色查询', 'btn.role.query', NULL, 0, 0, NULL),
(5, 'button', '新建角色', 'btn.role.create', NULL, 2, 0, NULL),
(5, 'button', '权限与用户', 'btn.role.manage', NULL, 3, 0, NULL),
(5, 'button', '删除角色', 'btn.role.delete', NULL, 5, 0, NULL),
(5, 'button', '添加成员', 'btn.role.assign_users', NULL, 6, 0, NULL),
(5, 'button', '移除成员', 'btn.role.remove_user', NULL, 7, 0, NULL),
(5, 'button', '保存接口权限', 'btn.role.save_api', NULL, 8, 0, NULL),
(5, 'button', '保存菜单与按钮', 'btn.role.save_ui', NULL, 9, 0, NULL),
(12, 'button', '菜单按钮-移动', 'btn.ui_perm.move', NULL, 5, 0, NULL);
