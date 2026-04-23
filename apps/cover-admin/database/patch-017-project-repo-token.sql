-- 项目表增加仓库访问令牌（私有仓库拉取源码），可重复执行

ALTER TABLE `project`
  ADD COLUMN `repo_token` varchar(2048) DEFAULT NULL COMMENT '仓库访问令牌（私有拉取），仅服务端使用' AFTER `relative_dir`;
