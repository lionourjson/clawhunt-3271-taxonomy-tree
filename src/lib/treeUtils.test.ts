import { describe, expect, it } from 'vitest';
import { filterTree, moveNode, DEMO_TAGS, type TagNode } from './tags';

describe('filterTree（搜索过滤）', () => {
  it('命中叶子时保留其祖先链', () => {
    const out = filterTree(DEMO_TAGS, '智能装备');
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('行业分类');
    expect(out[0].children?.[0].label).toBe('制造业');
    expect(out[0].children?.[0].children?.[0].label).toBe('智能装备');
  });

  it('大小写不敏感，且未命中时返回空数组', () => {
    expect(filterTree(DEMO_TAGS, 'DESIGN')).toHaveLength(1);
    expect(filterTree(DEMO_TAGS, '不存在的标签')).toHaveLength(0);
  });

  it('空关键词返回原树', () => {
    expect(filterTree(DEMO_TAGS, '  ')).toBe(DEMO_TAGS);
  });
});

describe('moveNode（拖拽排序）', () => {
  const tree: TagNode[] = [
    { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ];

  it('同级 after 移动：A 拖到 B 之后', () => {
    const out = moveNode(tree, 'a', 'b', 'after');
    expect(out.map((n) => n.id)).toEqual(['b', 'a', 'c']);
  });

  it('同级 before 移动：C 拖到 A 之前', () => {
    const out = moveNode(tree, 'c', 'a', 'before');
    expect(out.map((n) => n.id)).toEqual(['c', 'a', 'b']);
  });

  it('inside 移动：B 拖进 A 的子级', () => {
    const out = moveNode(tree, 'b', 'a', 'inside');
    expect(out[0].id).toBe('a');
    expect(out[0].children?.map((n) => n.id)).toEqual(['a1', 'b']);
  });

  it('跨层级移动：子节点 A1 拖到根级 B 之后', () => {
    const out = moveNode(tree, 'a1', 'b', 'after');
    expect(out[0].children).toBeUndefined();
    expect(out.map((n) => n.id)).toEqual(['a', 'b', 'a1', 'c']);
  });

  it('拖到自身时不改变树', () => {
    expect(moveNode(tree, 'a', 'a', 'after')).toEqual(tree);
  });
});

describe('fetchTags（接口桩）', () => {
  it('empty 态返回空数组；error 态拒绝', async () => {
    const { fetchTags } = await import('./tags');
    await expect(fetchTags('empty', 0)).resolves.toEqual([]);
    await expect(fetchTags('error', 0)).rejects.toThrow('接口异常');
  });
});
