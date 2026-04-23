export interface CoverageTreeItem {
  id: string
  label: string
  isFile: boolean
  filePath?: string
  children?: CoverageTreeItem[]
}

function sortTree(nodes: CoverageTreeItem[]) {
  nodes.sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1
    }
    return a.label.localeCompare(b.label)
  })
  for (const n of nodes) {
    if (n.children?.length) {
      sortTree(n.children)
    }
  }
}

/** 由文件路径列表构建 el-tree 数据（目录在前、同层按名排序） */
export function buildCoverageFileTree(filePaths: string[]): CoverageTreeItem[] {
  const sorted = [...new Set(filePaths)].filter(Boolean).sort((a, b) => a.localeCompare(b))
  const root: CoverageTreeItem[] = []
  for (const fullPath of sorted) {
    const segments = fullPath.split('/').filter(Boolean)
    let level = root
    let acc = ''
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!
      acc = acc ? `${acc}/${seg}` : seg
      const isLast = i === segments.length - 1
      if (isLast) {
        level.push({
          id: fullPath,
          label: seg,
          isFile: true,
          filePath: fullPath,
        })
      } else {
        let dir = level.find((n) => n.label === seg && !n.isFile)
        if (!dir) {
          dir = { id: `dir:${acc}`, label: seg, isFile: false, children: [] }
          level.push(dir)
        }
        level = dir.children!
      }
    }
  }
  sortTree(root)
  return root
}
