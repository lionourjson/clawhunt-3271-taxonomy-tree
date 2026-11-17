import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Loading, Skeleton } from 'tdesign-react';
import TagTree from './components/TagTree';
import { fetchTags, type ForcedState, type TagNode } from './lib/tags';

/** 三态与延迟由 URL 参数驱动（用于验收截图）：?state=empty|loading|error&delay=600 */
function readForcedState(): { forced: ForcedState; delay: number } {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get('state');
  const forced: ForcedState =
    raw === 'empty' || raw === 'loading' || raw === 'error' ? raw : 'normal';
  return { forced, delay: Number(p.get('delay') ?? 600) };
}

export default function App() {
  const { forced, delay } = readForcedState();
  const [nodes, setNodes] = useState<TagNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadFlag, setReloadFlag] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTags(forced, delay)
      .then((data) => {
        setNodes(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [forced, delay]);

  useEffect(() => {
    load();
  }, [load, reloadFlag]);

  return (
    <div style={{ maxWidth: 520, margin: '24px auto', fontFamily: 'system-ui' }}>
      <h2 style={{ fontSize: 18 }}>管理后台 · 标签管理</h2>
      {loading ? (
        <div data-testid="panel-loading">
          <Skeleton rowCol={[{ width: '70%' }, 1, 1, { width: '50%' }]} animation="gradient" />
        </div>
      ) : error ? (
        <div data-testid="panel-error" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#d54941' }}>加载失败：{error}</p>
          <Button onClick={() => setReloadFlag((f) => f + 1)}>重试</Button>
        </div>
      ) : nodes.length === 0 ? (
        <div data-testid="panel-empty">
          <Empty description="暂无标签" />
        </div>
      ) : (
        <div data-testid="panel-normal">
          <TagTree nodes={nodes} onNodesChange={setNodes} />
        </div>
      )}
      <p style={{ color: '#999', fontSize: 12, marginTop: 16 }}>
        当前状态：{forced}（截图用 URL 参数控制；真实接入见 README 集成点）
      </p>
    </div>
  );
}
