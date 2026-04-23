/** 将文件路径列表转为前端可用的目录树（posix 风格分段） */

export interface CoverageFileTreeNode {
  name: string;
  /** 从根到当前节点的路径，如 `examples/vite-vue3/src` */
  path: string;
  type: 'dir' | 'file';
  children?: CoverageFileTreeNode[];
}

export function buildCoverageFileTree(filePaths: string[]): CoverageFileTreeNode {
  const root: CoverageFileTreeNode = {
    name: '',
    path: '',
    type: 'dir',
    children: [],
  };

  const sorted = [...new Set(filePaths)].sort((a, b) => a.localeCompare(b));

  for (const full of sorted) {
    const normalized = full.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let cur = root;
    let acc = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isFile = i === segments.length - 1;
      acc = acc ? `${acc}/${seg}` : seg;
      if (!cur.children) cur.children = [];
      let next = cur.children.find((c) => c.name === seg);
      if (!next) {
        next = {
          name: seg,
          path: acc,
          type: isFile ? 'file' : 'dir',
          children: isFile ? undefined : [],
        };
        cur.children.push(next);
      } else if (isFile) {
        next.type = 'file';
      }
      cur = next;
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node: CoverageFileTreeNode): void {
  if (!node.children?.length) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const c of node.children) {
    sortTree(c);
  }
}
