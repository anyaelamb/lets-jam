import { useState } from 'react';
import type { Category, RatingScaleEntry, Song, TagValue } from '../types';
import { categoryBounds, categoryValues } from '../lib/filtering';
import CategoryValueEditor from './CategoryValueEditor';
import ChipGroup from './ChipGroup';

interface SongTagEditorProps {
  song: Song;
  categories: Category[];
  allSongs: Song[];
  ratingScale: RatingScaleEntry[];
  onClose: () => void;
  onUpdateTag: (categoryId: string, value: TagValue | null) => void;
  onUpdateUrl: (url: string) => void;
  onToggleMemorized: (memorized: boolean) => void;
  onRate: (label: string) => void;
  onDelete: () => void;
  onClearNotApplicable: (categoryId: string) => void;
}

export default function SongTagEditor({
  song,
  categories,
  allSongs,
  ratingScale,
  onClose,
  onUpdateTag,
  onUpdateUrl,
  onToggleMemorized,
  onRate,
  onDelete,
  onClearNotApplicable,
}: SongTagEditorProps) {
  const [url, setUrl] = useState(song.ultimateGuitarUrl);

  function handleDelete() {
    const confirmed = window.confirm(`Delete "${song.title}" by ${song.artist}? This can't be undone.`);
    if (confirmed) onDelete();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{song.title}</h2>
            <p className="modal-subtitle">{song.artist}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal-body">
          <section className="tag-editor-row">
            <h3>Ultimate Guitar Link</h3>
            <input
              type="url"
              className="url-input"
              value={url}
              placeholder="https://tabs.ultimate-guitar.com/…"
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => {
                if (url !== song.ultimateGuitarUrl) onUpdateUrl(url);
              }}
            />
          </section>

          <section className="tag-editor-row">
            <label className="memorized-toggle">
              <input
                type="checkbox"
                checked={song.memorized}
                onChange={(e) => onToggleMemorized(e.target.checked)}
              />
              Memorized
            </label>
          </section>

          <section className="tag-editor-row">
            <h3>{song.memorized ? 'Memorization Confidence' : 'Performance Confidence'}</h3>
            <ChipGroup
              options={ratingScale.map((r) => r.label)}
              selected={song.lastRatingLabel ? [song.lastRatingLabel] : []}
              singleSelect
              onChange={(values) => {
                if (values[0]) onRate(values[0]);
              }}
            />
            {song.lastPlayedAt && (
              <p className="modal-subtitle">Last played {new Date(song.lastPlayedAt).toLocaleDateString()}</p>
            )}
          </section>

          {categories
            .filter((category) => !category.computed)
            .map((category) => (
              <section key={category.id} className="tag-editor-row">
                <h3>{category.name}</h3>
                {song.notApplicableCategories.includes(category.id) && (
                  <p className="modal-subtitle">
                    Marked as not applicable to this song —{' '}
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => onClearNotApplicable(category.id)}
                    >
                      undo
                    </button>
                  </p>
                )}
                <CategoryValueEditor
                  category={category}
                  options={categoryValues(allSongs, category.id, undefined, category.values)}
                  bounds={categoryBounds(allSongs, category.id)}
                  value={song.tags[category.id]}
                  onChange={(value) => onUpdateTag(category.id, value)}
                  onAddValue={() => {}}
                />
              </section>
            ))}

          <section className="tag-editor-row">
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete Song
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
