-- 为 ui_permission 增加「是否在侧栏菜单栏展示」。
-- 若列已存在请勿重复执行本文件整段 ALTER。
-- 执行后：全部行先为 1，再将 type=button 置为 0（与全量种子一致）。
ALTER TABLE `ui_permission`
  ADD COLUMN `show_in_menu` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否在侧栏菜单栏展示' AFTER `sort_order`;

UPDATE `ui_permission` SET `show_in_menu` = 0 WHERE `type` = 'button';
