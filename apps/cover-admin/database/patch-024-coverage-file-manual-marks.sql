-- 覆盖率文件：人工标记（不参与父提交合并，仅与 line_details_core 合并后写入 line_details）
-- 执行前请备份；可重复执行（需数据库支持 IF NOT EXISTS 语法时自行调整）

ALTER TABLE `coverage_file`
  ADD COLUMN `manual_marks` json NULL COMMENT '人工标记 fileMark/lineMarks' AFTER `uncovered_lines`;

ALTER TABLE `coverage_file`
  ADD COLUMN `line_details_core` json NULL COMMENT '入库前插桩+继承、不含人工覆盖的基准行明细' AFTER `line_details`;

UPDATE `coverage_file`
SET `line_details_core` = `line_details`
WHERE `line_details_core` IS NULL;
