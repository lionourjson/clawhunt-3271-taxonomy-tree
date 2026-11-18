import { delay, http, HttpResponse } from 'msw';
import {
  addChild,
  countTags,
  findNode,
  findParentId,
  getSiblings,
  mergeTags,
  setSiblings,
  updateNode,
  type TagNode,
} from '../lib/tags';
import { seedDictionaries, type DictSeed } from './data';

/**
 * MSW 模拟接口：真实后端完成前，页面只依赖这些接口契约（见 README「集成点」）。
 * 请求头 x-mock-state 可强制标签接口返回 empty / loading / error，用于验收截图和测试。
 */
let db: DictSeed[] = seedDictionaries();
let seq = 0;

export function resetDb(): void {
  db = seedDictionaries();
  seq = 0;
}

const LATENCY = 300;

function dict(id: string): DictSeed | undefined {
  return db.find((d) => d.id === id);
}

function fail(status: number, message: string) {
  return HttpResponse.json({ message }, { status });
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
}

export const handlers = [
  http.get('*/api/taxonomy/dictionaries', async () => {
    await delay(LATENCY);
    return HttpResponse.json({
      data: db.map((d) => ({ id: d.id, name: d.name, code: d.code, tagCount: countTags(d.tags) })),
    });
  }),

  http.get('*/api/taxonomy/dictionaries/:dictId/tags', async ({ params, request }) => {
    const mode = request.headers.get('x-mock-state');
    if (mode === 'loading') {
      await delay('infinite');
    }
    await delay(LATENCY);
    if (mode === 'error') return fail(500, '标签服务暂时不可用（模拟错误）');
    if (mode === 'empty') return HttpResponse.json({ data: [] });
    const d = dict(String(params.dictId));
    if (!d) return fail(404, '字典不存在');
    return HttpResponse.json({ data: d.tags });
  }),

  /** 同级排序保存：orderedIds 必须正好是 parentId 下现有的全部子标签。 */
  http.put('*/api/taxonomy/dictionaries/:dictId/order', async ({ params, request }) => {
    await delay(LATENCY);
    const d = dict(String(params.dictId));
    if (!d) return fail(404, '字典不存在');
    const body = (await request.json()) as { parentId: string | null; orderedIds: string[] };
    const current = getSiblings(d.tags, body.parentId);
    if (!sameSet(current.map((n) => n.id), body.orderedIds)) return fail(422, '排序数据与同级标签不一致');
    const byId = new Map(current.map((n) => [n.id, n]));
    d.tags = setSiblings(d.tags, body.parentId, body.orderedIds.map((id) => byId.get(id) as TagNode));
    return HttpResponse.json({ data: d.tags });
  }),

  /** 新增标签：parentId 为 null 时加在根层。 */
  http.post('*/api/taxonomy/dictionaries/:dictId/tags', async ({ params, request }) => {
    await delay(LATENCY);
    const d = dict(String(params.dictId));
    if (!d) return fail(404, '字典不存在');
    const body = (await request.json()) as { parentId: string | null; label: string };
    const label = (body.label ?? '').trim();
    if (!label || label.length > 20) return fail(422, '标签名称需为 1–20 个字');
    if (getSiblings(d.tags, body.parentId).some((n) => n.label === label)) return fail(409, '同级已有同名标签');
    seq += 1;
    const id = `${body.parentId ?? d.code}-new${seq}`;
    d.tags = addChild(d.tags, body.parentId, { id, label, status: 'enabled', refCount: 0 });
    return HttpResponse.json({ data: d.tags, created: id });
  }),

  /** 编辑名称或启用/停用。 */
  http.patch('*/api/taxonomy/dictionaries/:dictId/tags/:tagId', async ({ params, request }) => {
    await delay(LATENCY);
    const d = dict(String(params.dictId));
    const tagId = String(params.tagId);
    if (!d || !findNode(d.tags, tagId)) return fail(404, '标签不存在');
    const body = (await request.json()) as { label?: string; status?: TagNode['status'] };
    const patch: Partial<TagNode> = {};
    if (body.label !== undefined) {
      const label = body.label.trim();
      if (!label || label.length > 20) return fail(422, '标签名称需为 1–20 个字');
      const parent = findParentId(d.tags, tagId) ?? null;
      if (getSiblings(d.tags, parent).some((n) => n.id !== tagId && n.label === label)) return fail(409, '同级已有同名标签');
      patch.label = label;
    }
    if (body.status !== undefined) patch.status = body.status;
    d.tags = updateNode(d.tags, tagId, patch);
    return HttpResponse.json({ data: d.tags });
  }),

  /** 合并：source 并入 target。 */
  http.post('*/api/taxonomy/dictionaries/:dictId/merge', async ({ params, request }) => {
    await delay(LATENCY);
    const d = dict(String(params.dictId));
    if (!d) return fail(404, '字典不存在');
    const body = (await request.json()) as { sourceId: string; targetId: string };
    try {
      d.tags = mergeTags(d.tags, body.sourceId, body.targetId);
    } catch (e) {
      return fail(422, (e as Error).message);
    }
    return HttpResponse.json({ data: d.tags });
  }),
];
