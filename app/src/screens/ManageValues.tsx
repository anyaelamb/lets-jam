import { useState } from 'react';
import type { Category, Song } from '../types';
import { categoryValues } from '../lib/filtering';

interface ManageValuesProps {
  category: Category;
  songs: Song[];
  onRename: (oldValue: string, newValue: string) => void;
  onDelete: (value: string) => void;
  onClose: () => void;
}

function songsWithValue(songs: Song[], categoryId: string, value: string): number {
  return songs.filter((song) => {
    const v = song.tags[categoryId];
    return v === value || (Array.isArray(v) && (v as string[]).includes(value));
  }).length;
}

export default function ManageValues({ category, songs, onRename, onDelete, onClose }: ManageValuesProps) {
  const values = categoryValues(songs, category.id);

  function handleDelete(value: string) {
    const count = songsWithValue(songs, category.id, value);
    const confirmed = window.confirm(
      `Delete "${value}" from ${category.name}? It'll be removed from ${count} song${count === 1 ? '' : 's'} — this can't be undone.`,
    );
    if (confirmed) onDelete(value);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{category.name} values</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">
          {values.length === 0 && (
            <p className="modal-subtitle">No values yet — they'll show up here once a song is tagged.</p>
          )}
          {values.map((value) => (
            <ValueRow key={value} value={value} onRename={onRename} onDelete={handleDelete} />
          ))}
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

function ValueRow({
  value,
  onRename,
  onDelete,
}: {
  value: string;
  onRename: (oldValue: string, newValue: string) => void;
  onDelete: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className="value-row">
      <input
        className="value-row-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          if (trimmed && trimmed !== value) onRename(value, trimmed);
          else setDraft(value);
        }}
      />
      <button type="button" className="icon-button" onClick={() => onDelete(value)} aria-label={`Delete ${value}`}>
        ×
      </button>
    </div>
  );
}
