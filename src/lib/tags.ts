/** 标签树数据类型与纯函数（可单测的树过滤/移动逻辑） */

export interface TagNode {
  id: string;
  label: string;
  disabled?: boolean;
  children?: TagNode[];
}

/** 演示用虚构标签数据（全部为自拟测试数据，无真实企业/客户信息） */
export const DEMO_TAGS: TagNode[] = [
  {
    id: 'ind',
    label: '行业分类',
    children: [
      { id: 'ind-mfg', label: '制造业', children: [
        { id: 'ind-mfg-eq', label: '智能装备' },
        { id: 'ind-mfg-auto', label: '汽车零部件' },
      ] },
      { id: 'ind-trade', label: '跨境贸易' },
      { id: 'ind-edu', label: '教育培训', disabled: true },
    ],
  },
  {
    id: 'svc',
    label: '服务类目',
    children: [
      { id: 'svc-design', label: '设计服务' },
      { id: 'svc-dev', label: '软件开发' },
    ],
  },
  { id: 'eco', label: '生态合作' },
];

/**
 * 按关键词过滤树：命中节点保留，其祖先链保留（保证可展开到达），未命中的叶子剔除。
 */
export function filterTree(nodes: TagNode[], keyword: string): TagNode[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return nodes;
  const walk = (list: TagNode[]): TagNode[] => {
    const out: TagNode[] = [];
    for (const n of list) {
      const children = n.children ? walk(n.children) : undefined;
      const selfHit = n.label.toLowerCase().includes(kw);
      if (selfHit || (children && children.length > 0)) {
        out.push({ ...n, children: children && children.length > 0 ? children : n.children });
      }
    }
    return out;
  };
  return walk(nodes);
}

/**
 * 拖拽排序：把 dragId 节点移动到 dropId 的相邻位置（before/after，限同层）或作为其子节点（inside）。
 */
export function moveNode(
  nodes: TagNode[],
  dragId: string,
  dropId: string,
  position: 'before' | 'after' | 'inside',
): TagNode[] {
  const removed = removeNode(nodes, dragId);
  if (!removed.node) return nodes;
  return insertNode(removed.list, dropId, removed.node, position);
}

function removeNode(list: TagNode[], id: string): { list: TagNode[]; node: TagNode | null } {
  let picked: TagNode | null = null;
  const out: TagNode[] = [];
  for (const n of list) {
    if (n.id === id) {
      picked = n;
      continue;
    }
    if (n.children) {
      const sub = removeNode(n.children, id);
      if (sub.node) picked = sub.node;
      out.push({ ...n, children: sub.list });
    } else {
      out.push(n);
    }
  }
  return { list: out, node: picked };
}

function insertNode(list: TagNode[], dropId: string, node: TagNode, position: 'before' | 'after' | 'inside'): TagNode[] {
  const out: TagNode[] = [];
  for (const n of list) {
    if (n.id === dropId) {
      if (position === 'before') {
        out.push(node, n);
      } else if (position === 'after') {
        out.push(n, node);
      } else {
        out.push({ ...n, children: [...(n.children ?? []), node] });
      }
      continue;
    }
    out.push(
      n.children ? { ...n, children: insertNode(n.children, dropId, node, position) } : n,
    );
  }
  return out;
}

/** 模拟接口桩：真实环境替换为 GET /api/tags 调用（见 README 集成点说明） */
export type ForcedState = 'normal' | 'empty' | 'loading' | 'error';

export function fetchTags(forced: ForcedState, delayMs: number): Promise<TagNode[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (forced === 'error') {
        reject(new Error('接口异常（演示）'));
        return;
      }
      resolve(forced === 'empty' ? [] : DEMO_TAGS);
    }, delayMs);
  });
}
