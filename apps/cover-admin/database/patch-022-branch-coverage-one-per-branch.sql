-- 同项目 + 测试分支仅保留一条 branch_coverage（去掉「全量+增量」双行）
-- 前置：已执行 patch-021（存在 uk_bc_project_branch_scope）。若 DROP 报索引不存在，说明已是单列唯一，可只执行下方 DELETE 去重后手工核对。
-- 若同一 (project_id, test_branch) 有多行，保留 id 最小的一条，其余删除（级联删除其 coverage_report）

DELETE bc FROM `branch_coverage` bc
INNER JOIN (
  SELECT `project_id`, `test_branch`, MIN(`id`) AS keep_id
  FROM `branch_coverage`
  GROUP BY `project_id`, `test_branch`
) k ON bc.`project_id` = k.`project_id` AND bc.`test_branch` = k.`test_branch`
WHERE bc.`id` != k.keep_id;

ALTER TABLE `branch_coverage` DROP INDEX `uk_bc_project_branch_scope`;

ALTER TABLE `branch_coverage`
ADD UNIQUE KEY `uk_bc_project_branch` (`project_id`, `test_branch`);
