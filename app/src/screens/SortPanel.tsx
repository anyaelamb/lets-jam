import type { Category, SortCriterion } from '../types';

interface SortPanelProps {
  categories: Category[];
  criteria: SortCriterion[];
  onChange: (criteria: SortCriterion[]) => void;
  onClose: () => void;
}

function keyLabel(key: string, categories: Category[]): string {
  if (key === 'staleness') return 'Staleness';
  if (key === 'title') return 'Title';
  if (key === 'artist') return 'Artist';
  return categories.find((c) => c.id === key)?.name ?? key;
}

function directionLabel(key: string, direction: 'asc' | 'desc'): string {
  if (key === 'staleness') return direction === 'desc' ? 'Most overdue first' : 'Least overdue first';
  if (key === 'performance_confidence' || key === 'memorization_confidence') {
    return direction === 'desc' ? 'Most confident first' : 'Least confident first';
  }
  if (key === 'memorized') return direction === 'asc' ? 'Memorized first' : 'Not memorized first';
  if (key === 'title' || key === 'artist') return direction === 'asc' ? 'A → Z' : 'Z → A';
  return direction === 'asc' ? 'Low → High' : 'High → Low';
}

export default function SortPanel({ categories, criteria, onChange, onClose }: SortPanelProps) {
  const allKeys = ['staleness', 'title', 'artist', ...categories.map((c) => c.id)];
  const activeKeys = new Set(criteria.map((c) => c.key));
  const availableKeys = allKeys.filter((k) => !activeKeys.has(k));

  function addCriterion(key: string) {
    if (!key) return;
    onChange([...criteria, { key, direction: key === 'staleness' ? 'desc' : 'asc' }]);
  }

  function removeCriterion(key: string) {
    onChange(criteria.filter((c) => c.key !== key));
  }

  function toggleDirection(key: string) {
    onChange(criteria.map((c) => (c.key === key ? { ...c, direction: c.direction === 'asc' ? 'desc' : 'asc' } : c)));
  }

  function move(index: number, delta: number) {
    const next = [...criteria];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Sort</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal-body">
          {criteria.length === 0 && <p className="chip-group-empty">No sort criteria — results are unordered.</p>}
          <ol className="sort-criteria-list">
            {criteria.map((c, i) => (
              <li key={c.key} className="sort-criterion">
                <span className="sort-criterion-order">{i + 1}</span>
                <span className="sort-criterion-label">{keyLabel(c.key, categories)}</span>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => toggleDirection(c.key)}>
                  {directionLabel(c.key, c.direction)}
                </button>
                <span className="sort-criterion-reorder">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === criteria.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </span>
                <button type="button" className="icon-button" onClick={() => removeCriterion(c.key)} aria-label="Remove">
                  ×
                </button>
              </li>
            ))}
          </ol>

          {availableKeys.length > 0 && (
            <div className="sort-add">
              <select defaultValue="" onChange={(e) => addCriterion(e.target.value)}>
                <option value="" disabled>
                  + Add sort criterion
                </option>
                {availableKeys.map((k) => (
                  <option key={k} value={k}>
                    {keyLabel(k, categories)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
