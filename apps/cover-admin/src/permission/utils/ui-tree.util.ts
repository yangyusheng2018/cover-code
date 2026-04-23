import { UiPermission } from '../entities/ui-permission.entity';
import { UiPermissionType } from '../entities/ui-permission-type.enum';

export interface UiPermissionTreeNode {
  id: number;
  parentId: number | null;
  type: UiPermissionType;
  name: string;
  code: string | null;
  path: string | null;
  sortOrder: number;
  /** 是否在侧栏菜单栏展示（前端可过滤） */
  showInMenu: boolean;
  children?: UiPermissionTreeNode[];
}

export function countTreeNodes(nodes: UiPermissionTreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1;
    if (node.children?.length) n += countTreeNodes(node.children);
  }
  return n;
}

export function buildUiTree(flat: UiPermission[]): UiPermissionTreeNode[] {
  const map = new Map<number, UiPermissionTreeNode>();
  for (const row of flat) {
    map.set(row.id, {
      id: row.id,
      parentId: row.parentId,
      type: row.type as UiPermissionType,
      name: row.name,
      code: row.code,
      path: row.path,
      sortOrder: row.sortOrder,
      showInMenu: row.showInMenu,
      children: [],
    });
  }
  const roots: UiPermissionTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId == null) {
      roots.push(node);
    } else {
      const p = map.get(node.parentId);
      if (p) {
        if (!p.children) p.children = [];
        p.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }
  const sortFn = (a: UiPermissionTreeNode, b: UiPermissionTreeNode) =>
    a.sortOrder - b.sortOrder || a.id - b.id;
  for (const node of map.values()) {
    node.children?.sort(sortFn);
  }
  roots.sort(sortFn);
  return roots;
}
