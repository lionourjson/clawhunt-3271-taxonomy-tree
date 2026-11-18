import { Skeleton } from 'tdesign-react';
import type { Dictionary } from '../lib/tags';

interface Props {
  dictionaries: Dictionary[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** 左侧字典列表：点击切换，右侧加载对应字典的标签树。 */
export default function DictionaryList({ dictionaries, loading, activeId, onSelect }: Props) {
  if (loading) {
    return (
      <div data-testid="dict-loading" style={{ padding: 12 }}>
        <Skeleton rowCol={[1, 1, 1]} animation="gradient" />
      </div>
    );
  }
  return (
    <nav aria-label="字典列表">
      <ul className="dict-list">
        {dictionaries.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className={`dict-item${d.id === activeId ? ' is-active' : ''}`}
              aria-current={d.id === activeId ? 'true' : undefined}
              data-testid={`dict-${d.id}`}
              onClick={() => onSelect(d.id)}
            >
              <span>{d.name}</span>
              <span className="dict-count">{d.tagCount}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
