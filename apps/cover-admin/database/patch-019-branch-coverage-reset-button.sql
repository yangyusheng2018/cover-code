-- 分支覆盖率：重置覆盖率按钮（与前端 v-ui-code 一致）
INSERT INTO `ui_permission` (`parent_id`, `type`, `name`, `code`, `path`, `sort_order`, `show_in_menu`, `remark`)
SELECT p.`id`, 'button', '覆盖率-重置', 'btn.branch_coverage.reset', NULL, 5, 0, NULL
FROM `ui_permission` p
WHERE p.`code` = 'menu.branch_coverage'
  AND NOT EXISTS (SELECT 1 FROM `ui_permission` WHERE `code` = 'btn.branch_coverage.reset');
