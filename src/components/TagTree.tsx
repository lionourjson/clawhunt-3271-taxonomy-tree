import { useMemo, useState } from 'react';
import { Input, Tag } from 'tdesign-react';
import type { TagNode } from '../lib/tags';
import { filterTree, moveNode } from '../lib/tags';

interface TagTreeProps {
  nodes: TagNode[];
  onNodesChange?: (nodes: TagNode[]) => void;
}

/** 标签树：展开 / 搜索过滤 / 拖拽排序（HTML5 DnD）；已停用标签灰色显示并带「已停用」标记 */
export default function TagTree({ nodes, onNodesChange }: TagTreeProps) {
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['ind', 'ind-mfg', 'svc']));
  const [dragId, setDragId] = useState<string | null>(null);

  const visible = useMemo(() => filterTree(nodes, keyword), [nodes, keyword]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const drop = (dropId: string) => {
    if (dragId && dragId !== dropId) {
      onNodesChange?.(moveNode(nodes, dragId, dropId, 'after'));
    }
    setDragId(null);
  };

  const renderList = (list: TagNode[], depth: number) => (
    <ul style={{ listStyle: 'none', paddingLeft: depth * 18, margin: 0 }}>
      {list.map((n) => (
        <li
          key={n.id}
          data-testid={`tree-node-${n.id}`}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();  // 嵌套树：阻止冒泡到祖先节点，dragId 才是真正拖的那个
            setDragId(n.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.stopPropagation();
            drop(n.id);
          }}
          style={{ padding: '4px 0' }}
        >
          <span
            style={{ cursor: n.children ? 'pointer' : 'default', marginRight: 6, userSelect: 'none' }}
            onClick={() => n.children && toggle(n.id)}
            data-testid={`toggle-${n.id}`}
          >
            {n.children ? (expanded.has(n.id) ? '▾' : '▸') : '·'}
          </span>
          <span style={n.disabled ? { color: '#a8a8a8' } : undefined}>{n.label}</span>
          {n.disabled && <Tag theme="default" style={{ marginLeft: 6 }}>已停用</Tag>}
          {n.children && expanded.has(n.id) && renderList(n.children, depth + 1)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="tag-tree-panel" data-testid="tag-tree-panel">
      <Input
        data-testid="tag-search"
        placeholder="搜索标签"
        clearable
        value={keyword}
        onChange={(v: unknown) => setKeyword(String(v ?? ''))}
        style={{ marginBottom: 12 }}
      />
      {renderList(visible, 0)}
      {keyword && visible.length === 0 && <div data-testid="search-empty">未找到匹配的标签</div>}
    </div>
  );
}
