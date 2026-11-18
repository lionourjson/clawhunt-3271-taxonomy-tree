import { Tag } from 'tdesign-react';
import { splitHighlight, type TagNode } from '../lib/tags';

interface TagTreeProps {
  nodes: TagNode[];
  keyword: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDragStartNode: (id: string) => void;
  onDropOnNode: (id: string) => void;
  onContextMenuNode: (id: string, x: number, y: number) => void;
}

function Label({ text, keyword }: { text: string; keyword: string }) {
  return (
    <>
      {splitHighlight(text, keyword).map((p, i) =>
        p.hit ? (
          <mark key={i} className="kw-hit" data-testid="kw-hit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * 标签树（受控）：展开状态、拖拽、右键菜单都交给页面处理。
 * 每个节点显示：展开箭头、名称（搜索命中处高亮）、状态标签、引用数。已停用的节点整行置灰。
 */
export default function TagTree(props: TagTreeProps) {
  const { nodes, keyword, expanded, onToggle, onDragStartNode, onDropOnNode, onContextMenuNode } = props;

  const renderList = (list: TagNode[], level: number) => (
    <ul role={level === 1 ? 'tree' : 'group'} aria-label={level === 1 ? '标签树' : undefined} className="tag-tree-list">
      {list.map((n) => {
        const hasKids = !!n.children && n.children.length > 0;
        const open = hasKids && expanded.has(n.id);
        const disabled = n.status === 'disabled';
        return (
          <li key={n.id} role="none">
            <div
              role="treeitem"
              aria-level={level}
              aria-expanded={hasKids ? open : undefined}
              aria-disabled={disabled || undefined}
              data-testid={`tree-node-${n.id}`}
              className={`tag-row${disabled ? ' is-disabled' : ''}`}
              style={{ paddingLeft: 8 + (level - 1) * 22 }}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer?.setData('text/plain', n.id);
                onDragStartNode(n.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDropOnNode(n.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenuNode(n.id, e.clientX, e.clientY);
              }}
            >
              <button
                type="button"
                className="tag-toggle"
                data-testid={`toggle-${n.id}`}
                aria-label={hasKids ? (open ? `收起 ${n.label}` : `展开 ${n.label}`) : undefined}
                disabled={!hasKids}
                onClick={() => hasKids && onToggle(n.id)}
              >
                {hasKids ? (open ? '▾' : '▸') : ''}
              </button>
              <span className="tag-label">
                <Label text={n.label} keyword={keyword} />
              </span>
              {disabled ? (
                <Tag size="small" theme="default" variant="light" data-testid={`status-${n.id}`}>
                  已停用
                </Tag>
              ) : (
                <Tag size="small" theme="success" variant="light" data-testid={`status-${n.id}`}>
                  启用
                </Tag>
              )}
              <span className="tag-ref" data-testid={`ref-${n.id}`}>
                引用 {n.refCount}
              </span>
            </div>
            {open && n.children && renderList(n.children, level + 1)}
          </li>
        );
      })}
    </ul>
  );

  return renderList(nodes, 1);
}
