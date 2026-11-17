import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App 三态（截图验收对应）', () => {
  it('默认状态：加载完成后渲染标签树', async () => {
    render(<App forcedState="normal" delay={0} />);
    await waitFor(() => expect(screen.getByTestId('panel-normal')).toBeInTheDocument());
    expect(screen.getByText('行业分类')).toBeInTheDocument();
  });

  it('?state=empty：渲染空态 Empty 组件', async () => {
    render(<App forcedState="empty" delay={0} />);
    await waitFor(() => expect(screen.getByTestId('panel-empty')).toBeInTheDocument());
    expect(screen.getByText('暂无标签')).toBeInTheDocument();
  });

  it('?state=loading：渲染骨架屏', () => {
    render(<App forcedState="loading" delay={60000} />);
    expect(screen.getByTestId('panel-loading')).toBeInTheDocument();
  });

  it('?state=error：渲染报错面板并带「重试」按钮，点击重试可恢复渲染', async () => {
    render(<App forcedState="error" delay={0} />);
    await waitFor(() => expect(screen.getByTestId('panel-error')).toBeInTheDocument());
    expect(screen.getByText('重试')).toBeInTheDocument();
    await userEvent.click(screen.getByText('重试'));
    expect(screen.getByTestId('panel-error')).toBeInTheDocument();
  });
});
