import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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

  it('已停用标签带「已停用」标记文本', () => {
    render(<TagTree nodes={DEMO_TAGS} />);
    expect(screen.getAllByText(/已停用/).length).toBeGreaterThan(0);
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
});
