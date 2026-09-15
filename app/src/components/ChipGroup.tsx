import { useState } from 'react';

interface ChipGroupProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  onAddValue?: (value: string) => void;
  emptyLabel?: string;
  singleSelect?: boolean;
  layout?: 'wrap' | 'stacked';
}

export default function ChipGroup({
  options,
  selected,
  onChange,
  onAddValue,
  emptyLabel,
  singleSelect,
  layout = 'wrap',
}: ChipGroupProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function toggle(option: string) {
    if (singleSelect) {
      onChange(selected.includes(option) ? [] : [option]);
      return;
    }
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  function commitAdd() {
    const value = draft.trim();
    if (value) {
      onAddValue?.(value);
      toggle(value);
    }
    setDraft('');
    setAdding(false);
  }

  return (
    <div className={`chip-group chip-group-${layout}`}>
      {options.length === 0 && !onAddValue && <p className="chip-group-empty">{emptyLabel ?? 'No values yet'}</p>}
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={`chip${active ? ' chip-active' : ''}`}
            onClick={() => toggle(option)}
            aria-pressed={active}
          >
            {option}
          </button>
        );
      })}
      {onAddValue && !adding && (
        <button type="button" className="chip chip-add" onClick={() => setAdding(true)}>
          + Add new value
        </button>
      )}
      {onAddValue && adding && (
        <span className="chip-add-input">
          <input
            autoFocus
            value={draft}
            placeholder="New value"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
          />
          <button type="button" onClick={commitAdd}>
            Add
          </button>
        </span>
      )}
    </div>
  );
}
