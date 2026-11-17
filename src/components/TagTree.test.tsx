import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TagTree from './TagTree';
import { DEMO_TAGS } from '../lib/tags';

describe('TagTree 组件渲染', () => {
  it('渲染全部顶层与子级标签', () => {
    render(<TagTree nodes={DEMO_TAGS} />);
    expect(screen.getByText('行业分类')).toBeInTheDocument();
    expect(screen.getByText('制造业')).toBeInTheDocument();
    expect(screen.getByText('智能装备')).toBeInTheDocument();
    expect(screen.getByText('生态合作')).toBeInTheDocument();
  });

  it('已停用标签带「已停用」标记', () => {
    render(<TagTree nodes={DEMO_TAGS} />);
    expect(screen.getAllByText('已停用').length).toBeGreaterThan(0);
  });

  it('搜索过滤：输入关键词后只显示匹配节点', async () => {
    render(<TagTree nodes={DEMO_TAGS} />);
    const input = screen.getByTestId('tag-search').querySelector('input')!;
    await userEvent.type(input, '智能装备');
    expect(screen.getByText('智能装备')).toBeInTheDocument();
    expect(screen.queryByText('软件开发')).not.toBeInTheDocument();
  });

  it('搜索无结果时显示空提示', async () => {
    render(<TagTree nodes={DEMO_TAGS} />);
    const input = screen.getByTestId('tag-search').querySelector('input')!;
    await userEvent.type(input, '不存在的标签XYZ');
    expect(screen.getByTestId('search-empty')).toBeInTheDocument();
  });

  it('展开/折叠交互：点击切换符号折叠后可再展开', async () => {
    render(<TagTree nodes={DEMO_TAGS} />);
    // 初始全展开（设计服务可见）；点击 toggle-svc 折叠后隐藏，再点一次恢复
    expect(screen.getByText('设计服务')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('toggle-svc'));
    expect(screen.queryByText('设计服务')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('toggle-svc'));
    expect(screen.getByText('设计服务')).toBeInTheDocument();
  });
});

describe('TagTree 拖拽排序', () => {
  it('HTML5 拖放事件触发 moveNode 并回调 onNodesChange', () => {
    const onChange = vi.fn();
    render(<TagTree nodes={DEMO_TAGS} onNodesChange={onChange} />);
    const src = screen.getByTestId('tree-node-ind');
    const dst = screen.getByTestId('tree-node-eco');
    fireEvent.dragStart(src);
    fireEvent.drop(dst);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
