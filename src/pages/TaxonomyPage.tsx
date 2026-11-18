import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Dialog, Empty, Input, MessagePlugin, Select, Skeleton } from 'tdesign-react';
import { taxonomyApi, type MockState } from '../api/taxonomy';
import DictionaryList from '../components/DictionaryList';
import NodeContextMenu, { type MenuAction } from '../components/NodeContextMenu';
import TagTree from '../components/TagTree';
import {
  allIds,
  filterTree,
  findNode,
  findParentId,
  flatten,
  isInSubtree,
  moveSibling,
  type Dictionary,
  type TagNode,
} from '../lib/tags';

type TreeStatus = 'loading' | 'error' | 'ready';
type DialogState = { kind: 'edit' | 'addChild' | 'addRoot' | 'merge'; nodeId: string | null } | null;

function readMockState(v: string | null): MockState {
  return v === 'empty' || v === 'loading' || v === 'error' ? v : null;
}

/**
 * /admin/taxonomy 标签管理页：左侧字典列表，右侧标签树。
 * 标签树支持展开、搜索高亮、同级拖拽排序（拖完调用保存接口）、右键菜单（编辑/新增子标签/停用/合并），
 * 以及空态、加载、报错三种状态。接口目前由 MSW 模拟。
 */
export default function TaxonomyPage() {
  const [params, setParams] = useSearchParams();
  const mockState = readMockState(params.get('state'));
  const activeDictId = params.get('dict');

  const [dicts, setDicts] = useState<Dictionary[]>([]);
  const [dictsLoading, setDictsLoading] = useState(true);
  const [tree, setTree] = useState<TagNode[]>([]);
  const [status, setStatus] = useState<TreeStatus>('loading');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState('');
  const [mergeTarget, setMergeTarget] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const dictId = activeDictId ?? dicts[0]?.id ?? null;

  const refreshDicts = useCallback(() => {
    taxonomyApi
      .listDictionaries()
      .then(setDicts)
      .catch(() => setDicts([]))
      .finally(() => setDictsLoading(false));
  }, []);

  useEffect(() => {
    refreshDicts();
  }, [refreshDicts]);

  useEffect(() => {
    if (!dictId) return;
    let alive = true;
    setStatus('loading');
    setError('');
    setKeyword('');
    setExpanded(new Set());
    taxonomyApi
      .listTags(dictId, mockState)
      .then((data) => {
        if (!alive) return;
        setTree(data);
        setStatus('ready');
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [dictId, mockState, reload]);

  const visible = useMemo(() => filterTree(tree, keyword), [tree, keyword]);
  // 搜索时自动展开命中节点的祖先链，否则用手动展开状态
  const effectiveExpanded = useMemo(
    () => (keyword.trim() ? new Set(allIds(visible)) : expanded),
    [keyword, visible, expanded],
  );

  const selectDict = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('dict', id);
    setParams(next);
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** 同级拖拽：跨层级直接拒绝；同级先乐观更新，再调用保存接口，失败回滚。 */
  const drop = async (dropId: string) => {
    const from = dragId;
    setDragId(null);
    if (!from || !dictId || from === dropId) return;
    const result = moveSibling(tree, from, dropId);
    if (!result.ok) {
      if (result.reason === 'cross-level') MessagePlugin.warning('只能在同一层级内拖拽排序');
      return;
    }
    const before = tree;
    setTree(result.nodes);
    try {
      const saved = await taxonomyApi.saveOrder(dictId, result.parentId, result.orderedIds);
      setTree(saved);
      MessagePlugin.success('排序已保存');
    } catch (e) {
      setTree(before);
      MessagePlugin.error(`排序保存失败，已恢复原顺序：${(e as Error).message}`);
    }
  };

  const openMenu = (nodeId: string, x: number, y: number) => setMenu({ nodeId, x, y });

  const onMenuAction = async (action: MenuAction) => {
    if (!menu || !dictId) return;
    const node = findNode(tree, menu.nodeId);
    setMenu(null);
    if (!node) return;
    if (action === 'toggleStatus') {
      const nextStatus = node.status === 'enabled' ? 'disabled' : 'enabled';
      try {
        setTree(await taxonomyApi.updateTag(dictId, node.id, { status: nextStatus }));
        MessagePlugin.success(nextStatus === 'disabled' ? `已停用「${node.label}」` : `已启用「${node.label}」`);
      } catch (e) {
        MessagePlugin.error((e as Error).message);
      }
      return;
    }
    setInputValue(action === 'edit' ? node.label : '');
    setMergeTarget(undefined);
    setDialog({ kind: action === 'edit' ? 'edit' : action === 'addChild' ? 'addChild' : 'merge', nodeId: node.id });
  };

  const dialogNode = dialog?.nodeId ? findNode(tree, dialog.nodeId) : undefined;

  const confirmDialog = async () => {
    if (!dialog || !dictId) return;
    setBusy(true);
    try {
      if (dialog.kind === 'edit' && dialogNode) {
        setTree(await taxonomyApi.updateTag(dictId, dialogNode.id, { label: inputValue }));
        MessagePlugin.success('标签已更新');
      } else if (dialog.kind === 'addChild' && dialogNode) {
        setTree(await taxonomyApi.addTag(dictId, dialogNode.id, inputValue));
        setExpanded((prev) => new Set(prev).add(dialogNode.id));
        MessagePlugin.success('子标签已新增');
      } else if (dialog.kind === 'addRoot') {
        setTree(await taxonomyApi.addTag(dictId, null, inputValue));
        MessagePlugin.success('标签已新增');
      } else if (dialog.kind === 'merge' && dialogNode && mergeTarget) {
        const target = findNode(tree, mergeTarget);
        setTree(await taxonomyApi.mergeTags(dictId, dialogNode.id, mergeTarget));
        MessagePlugin.success(`已将「${dialogNode.label}」合并到「${target?.label ?? ''}」`);
      } else {
        return;
      }
      setDialog(null);
      refreshDicts();
    } catch (e) {
      MessagePlugin.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const mergeOptions = dialogNode
    ? flatten(tree)
        .filter((n) => !isInSubtree(tree, dialogNode.id, n.id))
        .map((n) => ({ label: `${'　'.repeat(n.depth)}${n.label}`, value: n.id }))
    : [];

  const dialogTitle =
    dialog?.kind === 'edit'
      ? `编辑标签「${dialogNode?.label ?? ''}」`
      : dialog?.kind === 'addChild'
        ? `在「${dialogNode?.label ?? ''}」下新增子标签`
        : dialog?.kind === 'addRoot'
          ? '新增标签'
          : `合并「${dialogNode?.label ?? ''}」到…`;

  const activeDict = dicts.find((d) => d.id === dictId);
  const parentOfMenu = menu ? findParentId(tree, menu.nodeId) : undefined;

  return (
    <div className="page">
      <header className="page-header">
        <h1>标签管理</h1>
        <span className="page-path">/admin/taxonomy</span>
      </header>
      <div className="page-body">
        <aside className="dict-panel">
          <div className="panel-title">字典</div>
          <DictionaryList dictionaries={dicts} loading={dictsLoading} activeId={dictId} onSelect={selectDict} />
        </aside>
        <section className="tree-panel" aria-label="标签树面板">
          <div className="tree-toolbar">
            <strong>{activeDict?.name ?? '—'}</strong>
            <Input
              className="tree-search"
              placeholder="搜索标签"
              clearable
              value={keyword}
              onChange={(v) => setKeyword(String(v ?? ''))}
              disabled={status !== 'ready'}
              data-testid="tag-search"
            />
            <Button
              variant="outline"
              disabled={status !== 'ready'}
              onClick={() => {
                setInputValue('');
                setDialog({ kind: 'addRoot', nodeId: null });
              }}
            >
              新增标签
            </Button>
          </div>
          <p className="tree-hint">右键标签可编辑、新增子标签、停用或合并；拖动标签可在同一层级内排序，松手后自动保存。</p>

          {status === 'loading' ? (
            <div data-testid="panel-loading" aria-busy="true">
              <Skeleton rowCol={[{ width: '60%' }, 1, 1, { width: '80%' }, 1]} animation="gradient" />
            </div>
          ) : status === 'error' ? (
            <div data-testid="panel-error" className="state-box">
              <p className="state-error">加载失败：{error}</p>
              <Button onClick={() => setReload((r) => r + 1)}>重试</Button>
            </div>
          ) : tree.length === 0 ? (
            <div data-testid="panel-empty" className="state-box">
              <Empty description="这个字典下还没有标签" />
              <Button
                style={{ marginTop: 12 }}
                onClick={() => {
                  setInputValue('');
                  setDialog({ kind: 'addRoot', nodeId: null });
                }}
              >
                新增第一个标签
              </Button>
            </div>
          ) : (
            <div data-testid="panel-normal">
              {keyword.trim() && visible.length === 0 ? (
                <div data-testid="search-empty" className="state-box">
                  没有找到包含「{keyword}」的标签
                </div>
              ) : (
                <TagTree
                  nodes={visible}
                  keyword={keyword}
                  expanded={effectiveExpanded}
                  onToggle={toggle}
                  onDragStartNode={setDragId}
                  onDropOnNode={drop}
                  onContextMenuNode={openMenu}
                />
              )}
            </div>
          )}
        </section>
      </div>

      {menu && parentOfMenu !== undefined && (
        <NodeContextMenu
          x={menu.x}
          y={menu.y}
          nodeLabel={findNode(tree, menu.nodeId)?.label ?? ''}
          disabled={findNode(tree, menu.nodeId)?.status === 'disabled'}
          onAction={onMenuAction}
          onClose={() => setMenu(null)}
        />
      )}

      <Dialog
        header={dialogTitle}
        visible={!!dialog}
        confirmBtn={{ content: '确定', loading: busy, disabled: dialog?.kind === 'merge' ? !mergeTarget : !inputValue.trim() }}
        cancelBtn="取消"
        onConfirm={confirmDialog}
        onClose={() => setDialog(null)}
        onCancel={() => setDialog(null)}
        destroyOnClose
      >
        {dialog?.kind === 'merge' ? (
          <div>
            <p className="dialog-note">
              合并后「{dialogNode?.label}」会被删除，它的引用数（{dialogNode?.refCount ?? 0}）和子标签转到目标标签下。
            </p>
            <Select
              placeholder="选择目标标签"
              value={mergeTarget}
              options={mergeOptions}
              onChange={(v) => setMergeTarget(v as string)}
              filterable
              data-testid="merge-target"
            />
          </div>
        ) : (
          <Input
            placeholder="标签名称（1–20 个字）"
            value={inputValue}
            maxlength={20}
            onChange={(v) => setInputValue(String(v ?? ''))}
            autofocus
            data-testid="dialog-input"
          />
        )}
      </Dialog>
    </div>
  );
}
