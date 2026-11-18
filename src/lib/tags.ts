/** 标签树数据类型与纯函数（无副作用，便于单测）。全部数据为虚构测试数据。 */

export type TagStatus = 'enabled' | 'disabled';

export interface TagNode {
  id: string;
  label: string;
  status: TagStatus;
  /** 被会员、资源、商机等业务对象引用的次数 */
  refCount: number;
  children?: TagNode[];
}

export interface Dictionary {
  id: string;
  name: string;
  code: string;
  tagCount: number;
}

/** 按关键词过滤：命中节点保留，祖先链保留；命中节点自身的子树原样保留。 */
export function filterTree(nodes: TagNode[], keyword: string): TagNode[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return nodes;
  const walk = (list: TagNode[]): TagNode[] => {
    const out: TagNode[] = [];
    for (const n of list) {
      const selfHit = n.label.toLowerCase().includes(kw);
      const kids = n.children ? walk(n.children) : [];
      if (selfHit) out.push(n);
      else if (kids.length > 0) out.push({ ...n, children: kids });
    }
    return out;
  };
  return walk(nodes);
}

/** 把文字按关键词切段，hit=true 的段用于高亮。大小写不敏感，多次命中都切出。 */
export function splitHighlight(text: string, keyword: string): { text: string; hit: boolean }[] {
  const kw = keyword.trim();
  if (!kw) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const k = kw.toLowerCase();
  const parts: { text: string; hit: boolean }[] = [];
  let i = 0;
  for (;;) {
    const at = lower.indexOf(k, i);
    if (at < 0) break;
    if (at > i) parts.push({ text: text.slice(i, at), hit: false });
    parts.push({ text: text.slice(at, at + k.length), hit: true });
    i = at + k.length;
  }
  if (i < text.length) parts.push({ text: text.slice(i), hit: false });
  return parts.length ? parts : [{ text, hit: false }];
}

/** 找父节点 id：根层返回 null，找不到返回 undefined。 */
export function findParentId(nodes: TagNode[], id: string, parent: string | null = null): string | null | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.children) {
      const r = findParentId(n.children, id, n.id);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

export function findNode(nodes: TagNode[], id: string): TagNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const r = findNode(n.children, id);
      if (r) return r;
    }
  }
  return undefined;
}

/** 取某个父节点下的同级列表（parentId 为 null 时取根层）。 */
export function getSiblings(nodes: TagNode[], parentId: string | null): TagNode[] {
  if (parentId === null) return nodes;
  return findNode(nodes, parentId)?.children ?? [];
}

/** 替换某个父节点下的同级列表，返回新树。 */
export function setSiblings(nodes: TagNode[], parentId: string | null, list: TagNode[]): TagNode[] {
  if (parentId === null) return list;
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: list }
      : n.children
        ? { ...n, children: setSiblings(n.children, parentId, list) }
        : n,
  );
}

export type MoveResult =
  | { ok: true; nodes: TagNode[]; parentId: string | null; orderedIds: string[] }
  | { ok: false; reason: 'same-node' | 'not-found' | 'cross-level' };

/**
 * 同级拖拽排序：只允许在同一个父节点下移动。
 * 从上往下拖时放到目标之后，从下往上拖时放到目标之前。跨层级一律拒绝。
 */
export function moveSibling(nodes: TagNode[], dragId: string, dropId: string): MoveResult {
  if (dragId === dropId) return { ok: false, reason: 'same-node' };
  const p1 = findParentId(nodes, dragId);
  const p2 = findParentId(nodes, dropId);
  if (p1 === undefined || p2 === undefined) return { ok: false, reason: 'not-found' };
  if (p1 !== p2) return { ok: false, reason: 'cross-level' };
  const list = [...getSiblings(nodes, p1)];
  const from = list.findIndex((n) => n.id === dragId);
  const to = list.findIndex((n) => n.id === dropId);
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  return { ok: true, nodes: setSiblings(nodes, p1, list), parentId: p1, orderedIds: list.map((n) => n.id) };
}

export function updateNode(nodes: TagNode[], id: string, patch: Partial<Omit<TagNode, 'id' | 'children'>>): TagNode[] {
  return nodes.map((n) =>
    n.id === id ? { ...n, ...patch } : n.children ? { ...n, children: updateNode(n.children, id, patch) } : n,
  );
}

export function addChild(nodes: TagNode[], parentId: string | null, child: TagNode): TagNode[] {
  if (parentId === null) return [...nodes, child];
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...(n.children ?? []), child] }
      : n.children
        ? { ...n, children: addChild(n.children, parentId, child) }
        : n,
  );
}

export function removeNode(nodes: TagNode[], id: string): TagNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

/** 判断 maybeChildId 是否在 ancestorId 的子树里（含自身）。 */
export function isInSubtree(nodes: TagNode[], ancestorId: string, maybeChildId: string): boolean {
  const root = findNode(nodes, ancestorId);
  if (!root) return false;
  const walk = (n: TagNode): boolean => n.id === maybeChildId || (n.children ?? []).some(walk);
  return walk(root);
}

/**
 * 合并：把 source 并入 target。target 的引用数加上 source 的引用数，
 * source 的子标签挂到 target 下，source 本身删除。target 不能是 source 子树里的节点。
 */
export function mergeTags(nodes: TagNode[], sourceId: string, targetId: string): TagNode[] {
  if (sourceId === targetId) throw new Error('不能合并到自身');
  if (isInSubtree(nodes, sourceId, targetId)) throw new Error('不能合并到自己的下级标签');
  const source = findNode(nodes, sourceId);
  const target = findNode(nodes, targetId);
  if (!source || !target) throw new Error('标签不存在');
  let next = removeNode(nodes, sourceId);
  next = updateNode(next, targetId, { refCount: target.refCount + source.refCount });
  for (const c of source.children ?? []) next = addChild(next, targetId, c);
  return next;
}

/** 展平为带层级的列表（用于合并目标下拉框）。 */
export function flatten(nodes: TagNode[], depth = 0): { id: string; label: string; depth: number }[] {
  return nodes.flatMap((n) => [{ id: n.id, label: n.label, depth }, ...flatten(n.children ?? [], depth + 1)]);
}

export function countTags(nodes: TagNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countTags(n.children ?? []), 0);
}

export function allIds(nodes: TagNode[]): string[] {
  return flatten(nodes).map((n) => n.id);
}
