import { useEffect } from 'react';

export type MenuAction = 'edit' | 'addChild' | 'toggleStatus' | 'merge';

interface Props {
  x: number;
  y: number;
  nodeLabel: string;
  disabled: boolean;
  onAction: (action: MenuAction) => void;
  onClose: () => void;
}

/** 节点右键菜单：编辑、新增子标签、停用（已停用时显示启用）、合并。点外面或按 Esc 关闭。 */
export default function NodeContextMenu({ x, y, nodeLabel, disabled, onAction, onClose }: Props) {
  useEffect(() => {
    const close = () => onClose();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('click', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const items: { action: MenuAction; text: string }[] = [
    { action: 'edit', text: '编辑' },
    { action: 'addChild', text: '新增子标签' },
    { action: 'toggleStatus', text: disabled ? '启用' : '停用' },
    { action: 'merge', text: '合并' },
  ];

  return (
    <div
      role="menu"
      aria-label={`${nodeLabel} 的操作`}
      className="ctx-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <button key={it.action} type="button" role="menuitem" className="ctx-item" onClick={() => onAction(it.action)}>
          {it.text}
        </button>
      ))}
    </div>
  );
}
