import { describe, expect, it } from 'vitest';
import { seedDictionaries } from '../mocks/data';
import {
  addChild,
  countTags,
  filterTree,
  findNode,
  mergeTags,
  moveSibling,
  splitHighlight,
  updateNode,
} from './tags';

const industry = () => seedDictionaries()[0].tags;
const ids = (list: { id: string }[]) => list.map((n) => n.id);

describe('filterTree 搜索过滤', () => {
  it('保留命中节点和它的祖先，去掉没命中的分支', () => {
    const r = filterTree(industry(), '装备');
    expect(ids(r)).toEqual(['ind-mfg']);
    expect(ids(r[0].children!)).toEqual(['ind-mfg-eq']);
  });
  it('关键词为空时原样返回', () => {
    expect(filterTree(industry(), '  ')).toHaveLength(5);
  });
});

describe('splitHighlight 搜索高亮切段', () => {
  it('切出命中段，大小写不敏感，多处命中都切出', () => {
    expect(splitHighlight('制造业', '制造')).toEqual([
      { text: '制造', hit: true },
      { text: '业', hit: false },
    ]);
    expect(splitHighlight('UI 与 ui', 'ui').filter((p) => p.hit)).toHaveLength(2);
  });
  it('没命中时整段不高亮', () => {
    expect(splitHighlight('跨境贸易', '制造')).toEqual([{ text: '跨境贸易', hit: false }]);
  });
});

describe('moveSibling 同级拖拽排序', () => {
  it('根层：从下往上拖，放到目标之前', () => {
    const r = moveSibling(industry(), 'ind-digital', 'ind-mfg');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.parentId).toBeNull();
      expect(r.orderedIds).toEqual(['ind-digital', 'ind-mfg', 'ind-trade', 'ind-edu', 'ind-svc']);
    }
  });
  it('根层：从上往下拖，放到目标之后', () => {
    const r = moveSibling(industry(), 'ind-mfg', 'ind-trade');
    expect(r.ok && r.orderedIds).toEqual(['ind-trade', 'ind-mfg', 'ind-edu', 'ind-svc', 'ind-digital']);
  });
  it('子层：在同一个父节点下排序', () => {
    const r = moveSibling(industry(), 'ind-mfg-mat', 'ind-mfg-eq');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.parentId).toBe('ind-mfg');
      expect(r.orderedIds).toEqual(['ind-mfg-mat', 'ind-mfg-eq', 'ind-mfg-auto']);
      expect(ids(findNode(r.nodes, 'ind-mfg')!.children!)).toEqual(r.orderedIds);
    }
  });
  it('跨层级拖拽被拒绝，树不变', () => {
    const tree = industry();
    expect(moveSibling(tree, 'ind-trade', 'ind-mfg-eq')).toEqual({ ok: false, reason: 'cross-level' });
    expect(moveSibling(tree, 'ind-mfg-auto', 'ind-svc-hr')).toEqual({ ok: false, reason: 'cross-level' });
  });
  it('拖到自己或不存在的节点无效', () => {
    expect(moveSibling(industry(), 'ind-mfg', 'ind-mfg')).toEqual({ ok: false, reason: 'same-node' });
    expect(moveSibling(industry(), 'ind-mfg', 'nope')).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('mergeTags 合并', () => {
  it('引用数相加，子标签转到目标下，源标签删除', () => {
    const r = mergeTags(industry(), 'ind-svc', 'ind-mfg');
    expect(findNode(r, 'ind-svc')).toBeUndefined();
    const mfg = findNode(r, 'ind-mfg')!;
    expect(mfg.refCount).toBe(18 + 7);
    expect(ids(mfg.children!)).toEqual(['ind-mfg-eq', 'ind-mfg-auto', 'ind-mfg-mat', 'ind-svc-consult', 'ind-svc-hr']);
    expect(countTags(r)).toBe(countTags(industry()) - 1);
  });
  it('不能合并到自身或自己的下级', () => {
    expect(() => mergeTags(industry(), 'ind-mfg', 'ind-mfg')).toThrow('不能合并到自身');
    expect(() => mergeTags(industry(), 'ind-mfg', 'ind-mfg-eq')).toThrow('不能合并到自己的下级标签');
  });
});

describe('addChild / updateNode', () => {
  it('新增子标签挂在指定父节点末尾，根层也可新增', () => {
    const r = addChild(industry(), 'ind-trade', { id: 'x', label: '东南亚', status: 'enabled', refCount: 0 });
    expect(ids(findNode(r, 'ind-trade')!.children!)).toEqual(['x']);
    expect(ids(addChild(industry(), null, { id: 'y', label: '根', status: 'enabled', refCount: 0 })).at(-1)).toBe('y');
  });
  it('停用只改状态，不动其他字段', () => {
    const r = updateNode(industry(), 'ind-trade', { status: 'disabled' });
    expect(findNode(r, 'ind-trade')).toMatchObject({ label: '跨境贸易', status: 'disabled', refCount: 12 });
  });
});
