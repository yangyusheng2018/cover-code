---
name: /clear-spec
id: clear-spec
category: Workflow
description: 清除未归档的 OpenSpec change（删除规划目录，不可恢复）
---

清除**未归档**的 OpenSpec change，删除其规划产物目录。此操作**不可恢复**；已归档的 change 不在清除范围内。

**与 `/opsx:archive` 的区别**：archive 在完成后将 change 移入 `openspec/changes/archive/` 并同步规格；clear-spec 用于**放弃**尚未归档的需求（规划作废、方向变更、误创建等）。

---

**输入**：`/clear-spec` 后的参数为 change 名称（kebab-case），例如 `/clear-spec admin-dashboard-frontend`。

**步骤**

1. **解析 change 名称**

   - 若用户已提供名称，使用该名称。
   - 若未提供，运行 `openspec list --json`，用 **AskUserQuestion** 让用户从**未归档**的 change 中选择。
   - 若没有任何未归档 change，告知用户并停止。

2. **解析 change 路径**

   运行：
   ```bash
   openspec status --change "<name>" --json
   ```

   从 JSON 读取 `changeRoot`、`planningHome.changesDir`。

   - 若 status 失败且 `openspec/changes/<name>/` 也不存在，告知「change 不存在」并停止。
   - 若 `changeRoot` 位于 `.../changes/archive/` 下，告知「该 change 已归档，不能使用 clear-spec；归档记录请手动在 archive 目录管理」并停止。

3. **展示即将删除的内容**

   列出 `changeRoot` 下的主要产物（proposal、design、specs、tasks 等），并说明：
   - 不会修改 `openspec/specs/` 主规格（除非用户曾手动 sync）
   - 不会自动删除已提交的实现代码或 git 分支（仅删除 OpenSpec 规划目录）

4. **确认（必须）**

   使用 **AskUserQuestion** 明确询问用户是否确认删除，选项至少包含：
   - 确认删除
   - 取消

   用户未确认则停止，不执行任何删除。

5. **可选：清理关联 worktree**

   若项目根下存在 `.worktrees/<name>/` 或与 change 同名的 git worktree，提示用户是否一并清理；仅在用户确认后执行 `git worktree remove` 或删除对应目录。

6. **执行删除**

   删除整个 change 目录：
   ```bash
   # Windows PowerShell 示例（按实际 changeRoot 路径）
   Remove-Item -Recurse -Force "<changeRoot>"
   ```

   或使用平台等效的递归删除命令。

7. **验证**

   运行 `openspec list --json`，确认该 change 不再出现在未归档列表中。

8. **汇报结果**

   ```
   ## Clear Spec 完成

   **已清除:** <name>
   **删除路径:** <changeRoot>

   该 change 的规划产物已移除。若需重新规划，使用 `/opsx:new <name>` 或 `/opsx:propose`。
   ```

**安全规则**

- **禁止**在未确认的情况下删除
- **禁止**清除 `openspec/changes/archive/` 下的已归档 change
- **禁止**猜测 change 名称；有歧义时必须让用户选择
- 若 change 中有大量已完成实现但仅规划作废，提醒用户：代码与分支需另行处理
