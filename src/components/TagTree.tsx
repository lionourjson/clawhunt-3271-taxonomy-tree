import { useMemo, useState } from 'react';
import { Input, Tree } from 'tdesign-react';
import type { TagNode } from '../lib/tags';
import { filterTree, moveNode } from '../lib/tags';

interface TagTreeProps {
  nodes: TagNode[];
  onNodesChange?: (nodes: TagNode[]) => void;
}

/** 标签树：展开 / 搜索过滤 / 拖拽排序；已停用标签灰色显示并带「已停用」标记 */
export default function TagTree({ nodes, onNodesChange }: TagTreeProps) {
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState<string[]>(['ind']);

  const visible = useMemo(() => filterTree(nodes, keyword), [nodes, keyword]);

  const handleDrop = (ctx: { dragNode: { id?: string }; targetNode: { id?: string }; dropPosition?: number }) => {
    const dragId = ctx?.dragNode?.id;
    const dropId = ctx?.targetNode?.id;
    if (!dragId || !dropId || dragId === dropId) return;
    const position = ctx?.dropPosition === -1 ? 'before' : ctx?.dropPosition === 1 ? 'after' : 'inside';
    onNodesChange?.(moveNode(nodes, dragId, dropId, position));
  };

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
      <Tree
        data-testid="tag-tree"
        data={visible as never}
        draggable
        expandLevel={0}
        expanded={expanded}
        onExpand={(ids: unknown) => setExpanded((ids as string[]) ?? [])}
        onDrop={handleDrop as never}
        transition
      />
      {keyword && visible.length === 0 && (
        <div data-testid="search-empty">未找到匹配的标签</div>
      )}
    </div>
  );
}
