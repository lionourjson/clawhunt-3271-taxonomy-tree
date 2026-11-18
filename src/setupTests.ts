import '@testing-library/jest-dom/vitest';

// jsdom 缺失 matchMedia / ResizeObserver，TDesign 组件依赖它们
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

// MSW：测试里用同一套模拟接口，每个用例结束后恢复初始数据
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MessagePlugin } from 'tdesign-react';
import { server } from './mocks/node';
import { resetDb } from './mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  MessagePlugin.closeAll();
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());
