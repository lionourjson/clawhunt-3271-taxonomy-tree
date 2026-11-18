import { describe, expect, it } from 'vitest';
import { taxonomyApi } from '../api/taxonomy';
import { findNode } from '../lib/tags';

/** 模拟接口契约测试：页面依赖的 6 个接口，真实后端照这个契约实现即可。 */
describe('标签中心模拟接口', () => {
  it('字典列表带标签总数', async () => {
    const dicts = await taxonomyApi.listDictionaries();
    expect(dicts.map((d) => d.name)).toEqual(['行业分类', '服务类目', '资源类型', '活动主题']);
    expect(dicts[0].tagCount).toBe(10);
    expect(dicts[3].tagCount).toBe(0);
  });

  it('保存同级排序后，再次读取得到新顺序', async () => {
    await taxonomyApi.saveOrder('dict-industry', 'ind-mfg', ['ind-mfg-mat', 'ind-mfg-eq', 'ind-mfg-auto']);
    const tags = await taxonomyApi.listTags('dict-industry');
    expect(findNode(tags, 'ind-mfg')!.children!.map((n) => n.id)).toEqual(['ind-mfg-mat', 'ind-mfg-eq', 'ind-mfg-auto']);
  });

  it('排序数据和同级标签对不上时拒绝保存（防止跨层级写入）', async () => {
    await expect(taxonomyApi.saveOrder('dict-industry', null, ['ind-mfg', 'ind-mfg-eq'])).rejects.toThrow(
      '排序数据与同级标签不一致',
    );
  });

  it('新增标签：同级重名返回 409', async () => {
    await expect(taxonomyApi.addTag('dict-industry', 'ind-mfg', '新材料')).rejects.toThrow('同级已有同名标签');
    const tags = await taxonomyApi.addTag('dict-industry', 'ind-mfg', '航空航天');
    expect(findNode(tags, 'ind-mfg')!.children!.map((n) => n.label)).toContain('航空航天');
  });

  it('停用和改名', async () => {
    let tags = await taxonomyApi.updateTag('dict-industry', 'ind-trade', { status: 'disabled' });
    expect(findNode(tags, 'ind-trade')!.status).toBe('disabled');
    tags = await taxonomyApi.updateTag('dict-industry', 'ind-trade', { label: '跨境电商' });
    expect(findNode(tags, 'ind-trade')!.label).toBe('跨境电商');
  });

  it('合并：引用数相加，源标签删除；合并到下级被拒绝', async () => {
    const tags = await taxonomyApi.mergeTags('dict-industry', 'ind-trade', 'ind-digital');
    expect(findNode(tags, 'ind-trade')).toBeUndefined();
    expect(findNode(tags, 'ind-digital')!.refCount).toBe(27);
    await expect(taxonomyApi.mergeTags('dict-industry', 'ind-mfg', 'ind-mfg-eq')).rejects.toThrow('不能合并到自己的下级标签');
  });

  it('x-mock-state 可强制返回空和报错', async () => {
    expect(await taxonomyApi.listTags('dict-industry', 'empty')).toEqual([]);
    await expect(taxonomyApi.listTags('dict-industry', 'error')).rejects.toThrow('标签服务暂时不可用（模拟错误）');
  });
});
