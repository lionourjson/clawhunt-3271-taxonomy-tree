import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { taxonomyApi } from '../api/taxonomy';
import { findNode } from '../lib/tags';
import { server } from '../mocks/node';

function renderAt(url = '/admin/taxonomy') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );
}

const row = (id: string) => screen.getByTestId(`tree-node-${id}`);
const rootOrder = () =>
  within(screen.getByRole('tree'))
    .getAllByRole('treeitem')
    .filter((el) => el.getAttribute('aria-level') === '1')
    .map((el) => el.dataset.testid?.replace('tree-node-', ''));

async function ready(url?: string) {
  renderAt(url);
  await screen.findByTestId('tree-node-ind-mfg');
}

function drag(fromId: string, toId: string) {
  fireEvent.dragStart(row(fromId));
  fireEvent.dragOver(row(toId));
  fireEvent.drop(row(toId));
}

describe('路由', () => {
  it('页面在 /admin/taxonomy；根路径跳转过去', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: '标签管理' })).toBeInTheDocument();
    expect(screen.getByText('/admin/taxonomy')).toBeInTheDocument();
  });
});

describe('左侧字典列表', () => {
  it('列出全部字典并默认选中第一个', async () => {
    await ready();
    const nav = screen.getByRole('navigation', { name: '字典列表' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '行业分类10',
      '服务类目6',
      '资源类型5',
      '活动主题0',
    ]);
    expect(screen.getByTestId('dict-dict-industry')).toHaveAttribute('aria-current', 'true');
  });

  it('切换字典后右侧加载对应的标签树', async () => {
    await ready();
    fireEvent.click(screen.getByTestId('dict-dict-service'));
    expect(await screen.findByTestId('tree-node-svc-dev')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-node-ind-mfg')).not.toBeInTheDocument();
    expect(screen.getByTestId('dict-dict-service')).toHaveAttribute('aria-current', 'true');
  });
});

describe('展开', () => {
  it('点击箭头展开子标签，再点收起', async () => {
    await ready();
    expect(screen.queryByTestId('tree-node-ind-mfg-eq')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('toggle-ind-mfg'));
    expect(screen.getByTestId('tree-node-ind-mfg-eq')).toBeInTheDocument();
    expect(row('ind-mfg')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByTestId('toggle-ind-mfg'));
    expect(screen.queryByTestId('tree-node-ind-mfg-eq')).not.toBeInTheDocument();
  });
});

describe('搜索高亮', () => {
  it('命中的关键字用 mark 高亮，祖先自动展开，没命中的隐藏', async () => {
    await ready();
    await userEvent.type(screen.getByPlaceholderText('搜索标签'), '装备');
    const hits = await screen.findAllByTestId('kw-hit');
    expect(hits.map((h) => h.tagName)).toEqual(['MARK']);
    expect(hits[0]).toHaveTextContent('装备');
    expect(row('ind-mfg-eq')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-node-ind-trade')).not.toBeInTheDocument();
  });

  it('没有结果时给出提示', async () => {
    await ready();
    await userEvent.type(screen.getByPlaceholderText('搜索标签'), '不存在的词');
    expect(await screen.findByTestId('search-empty')).toHaveTextContent('没有找到包含「不存在的词」的标签');
  });
});

describe('状态标签与引用数', () => {
  it('每个节点显示状态和引用数，停用节点置灰并标「已停用」', async () => {
    await ready();
    expect(screen.getByTestId('ref-ind-mfg')).toHaveTextContent('引用 18');
    expect(screen.getByTestId('status-ind-mfg')).toHaveTextContent('启用');
    expect(screen.getByTestId('status-ind-edu')).toHaveTextContent('已停用');
    expect(row('ind-edu')).toHaveClass('is-disabled');
    expect(row('ind-edu')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('同级拖拽排序', () => {
  it('同级拖拽后调用保存接口，提示「排序已保存」，后端顺序同步', async () => {
    await ready();
    drag('ind-digital', 'ind-mfg');
    expect(await screen.findByText('排序已保存')).toBeInTheDocument();
    expect(rootOrder()).toEqual(['ind-digital', 'ind-mfg', 'ind-trade', 'ind-edu', 'ind-svc']);
    const saved = await taxonomyApi.listTags('dict-industry');
    expect(saved.map((n) => n.id)).toEqual(['ind-digital', 'ind-mfg', 'ind-trade', 'ind-edu', 'ind-svc']);
  });

  it('子层同级拖拽同样保存', async () => {
    await ready();
    fireEvent.click(screen.getByTestId('toggle-ind-mfg'));
    drag('ind-mfg-mat', 'ind-mfg-eq');
    expect(await screen.findByText('排序已保存')).toBeInTheDocument();
    const saved = await taxonomyApi.listTags('dict-industry');
    expect(findNode(saved, 'ind-mfg')!.children!.map((n) => n.id)).toEqual(['ind-mfg-mat', 'ind-mfg-eq', 'ind-mfg-auto']);
  });

  it('跨层级拖拽被拒绝：提示只能同级，顺序不变，不调用保存', async () => {
    let saveCalls = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PUT') saveCalls += 1;
    });
    await ready();
    fireEvent.click(screen.getByTestId('toggle-ind-mfg'));
    drag('ind-trade', 'ind-mfg-eq');
    expect(await screen.findByText('只能在同一层级内拖拽排序')).toBeInTheDocument();
    expect(rootOrder()).toEqual(['ind-mfg', 'ind-trade', 'ind-edu', 'ind-svc', 'ind-digital']);
    expect(saveCalls).toBe(0);
    server.events.removeAllListeners();
  });

  it('保存失败时回滚到原顺序并提示', async () => {
    server.use(
      http.put('*/api/taxonomy/dictionaries/:dictId/order', () =>
        HttpResponse.json({ message: '网络异常' }, { status: 500 }),
      ),
    );
    await ready();
    drag('ind-digital', 'ind-mfg');
    expect(await screen.findByText('排序保存失败，已恢复原顺序：网络异常')).toBeInTheDocument();
    expect(rootOrder()).toEqual(['ind-mfg', 'ind-trade', 'ind-edu', 'ind-svc', 'ind-digital']);
  });
});

describe('右键菜单', () => {
  it('右键节点弹出四项菜单：编辑、新增子标签、停用、合并', async () => {
    await ready();
    fireEvent.contextMenu(row('ind-trade'), { clientX: 200, clientY: 160 });
    const menu = screen.getByRole('menu', { name: '跨境贸易 的操作' });
    expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['编辑', '新增子标签', '停用', '合并']);
  });

  it('已停用的节点菜单里显示「启用」', async () => {
    await ready();
    fireEvent.contextMenu(row('ind-edu'));
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: '启用' })).toBeInTheDocument();
  });

  it('停用：节点变灰并标「已停用」', async () => {
    await ready();
    fireEvent.contextMenu(row('ind-trade'));
    fireEvent.click(screen.getByRole('menuitem', { name: '停用' }));
    await waitFor(() => expect(screen.getByTestId('status-ind-trade')).toHaveTextContent('已停用'));
    expect(row('ind-trade')).toHaveClass('is-disabled');
  });

  it('新增子标签：在对话框里输入名称，确定后出现在父节点下', async () => {
    await ready();
    fireEvent.contextMenu(row('ind-trade'));
    fireEvent.click(screen.getByRole('menuitem', { name: '新增子标签' }));
    await userEvent.type(await screen.findByPlaceholderText('标签名称（1–20 个字）'), '东南亚');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    expect(await screen.findByText('东南亚')).toBeInTheDocument();
    expect(row('ind-trade')).toHaveAttribute('aria-expanded', 'true');
  });

  it('编辑：改名后树上显示新名称', async () => {
    await ready();
    fireEvent.contextMenu(row('ind-trade'));
    fireEvent.click(screen.getByRole('menuitem', { name: '编辑' }));
    const input = await screen.findByPlaceholderText('标签名称（1–20 个字）');
    await userEvent.clear(input);
    await userEvent.type(input, '跨境电商');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => expect(row('ind-trade')).toHaveTextContent('跨境电商'));
  });

  it('合并：打开对话框，说明合并后果并提供目标标签选择', async () => {
    await ready();
    fireEvent.contextMenu(row('ind-trade'));
    fireEvent.click(screen.getByRole('menuitem', { name: '合并' }));
    expect(await screen.findByText(/合并后「跨境贸易」会被删除，它的引用数（12）/)).toBeInTheDocument();
    // 还没选目标时「确定」不可点（TDesign 禁用按钮带 disabled 属性）
    expect(screen.getByText('确定').closest('.t-dialog__confirm')).toHaveAttribute('disabled');
    expect(screen.getByPlaceholderText('选择目标标签')).toBeInTheDocument();
  });
});

describe('空态、加载、报错', () => {
  it('空态：显示空提示和「新增第一个标签」', async () => {
    renderAt('/admin/taxonomy?state=empty');
    const box = await screen.findByTestId('panel-empty');
    expect(box).toHaveTextContent('这个字典下还没有标签');
    expect(within(box).getByRole('button', { name: '新增第一个标签' })).toBeInTheDocument();
  });

  it('真实的空字典也显示空态', async () => {
    await ready();
    fireEvent.click(screen.getByTestId('dict-dict-empty'));
    expect(await screen.findByTestId('panel-empty')).toBeInTheDocument();
  });

  it('加载：请求未返回时显示骨架屏', async () => {
    renderAt('/admin/taxonomy?state=loading');
    expect(await screen.findByTestId('panel-loading')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.getByTestId('panel-loading')).toBeInTheDocument();
  });

  it('报错：显示错误原因和重试按钮，点重试会重新请求', async () => {
    let calls = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/tags')) calls += 1;
    });
    renderAt('/admin/taxonomy?state=error');
    const box = await screen.findByTestId('panel-error');
    expect(box).toHaveTextContent('加载失败：标签服务暂时不可用（模拟错误）');
    const before = calls;
    fireEvent.click(within(box).getByRole('button', { name: '重试' }));
    await screen.findByTestId('panel-error');
    await waitFor(() => expect(calls).toBe(before + 1));
    server.events.removeAllListeners();
  });
});
