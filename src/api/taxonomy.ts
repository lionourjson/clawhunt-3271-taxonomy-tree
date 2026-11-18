import type { Dictionary, TagNode } from '../lib/tags';

/**
 * 标签中心接口。地址前缀从环境变量 VITE_API_BASE 读取（默认同源）。
 * mockState 只在演示和测试时使用：通过请求头告诉 MSW 返回空、加载中或报错。
 */
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export type MockState = 'empty' | 'loading' | 'error' | null;

async function request<T>(path: string, init: RequestInit = {}, mockState: MockState = null): Promise<T> {
  const url = new URL(BASE + path, window.location.origin).toString();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (mockState) headers['x-mock-state'] = mockState;
  const res = await fetch(url, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
  if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
  return body.data as T;
}

export const taxonomyApi = {
  listDictionaries: () => request<Dictionary[]>('/api/taxonomy/dictionaries'),
  listTags: (dictId: string, mockState: MockState = null) =>
    request<TagNode[]>(`/api/taxonomy/dictionaries/${dictId}/tags`, {}, mockState),
  saveOrder: (dictId: string, parentId: string | null, orderedIds: string[]) =>
    request<TagNode[]>(`/api/taxonomy/dictionaries/${dictId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ parentId, orderedIds }),
    }),
  addTag: (dictId: string, parentId: string | null, label: string) =>
    request<TagNode[]>(`/api/taxonomy/dictionaries/${dictId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ parentId, label }),
    }),
  updateTag: (dictId: string, tagId: string, patch: { label?: string; status?: TagNode['status'] }) =>
    request<TagNode[]>(`/api/taxonomy/dictionaries/${dictId}/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  mergeTags: (dictId: string, sourceId: string, targetId: string) =>
    request<TagNode[]>(`/api/taxonomy/dictionaries/${dictId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ sourceId, targetId }),
    }),
};
