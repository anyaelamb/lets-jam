import { useState } from 'react';
import type { Category, Song, TagValue } from '../types';
import { categoryBounds, categoryValues } from '../lib/filtering';
import CategoryValueEditor from './CategoryValueEditor';

interface SongTagEditorProps {
  song: Song;
  categories: Category[];
  allSongs: Song[];
  onClose: () => void;
  onUpdateTag: (categoryId: string, value: TagValue | null) => void;
  onUpdateUrl: (url: string) => void;
}

export default function SongTagEditor({
  song,
  categories,
  allSongs,
  onClose,
  onUpdateTag,
  onUpdateUrl,
}: SongTagEditorProps) {
  const [url, setUrl] = useState(song.ultimateGuitarUrl);

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

          {categories
            .filter((category) => !category.computed)
            .map((category) => (
              <section key={category.id} className="tag-editor-row">
                <h3>{category.name}</h3>
                <CategoryValueEditor
                  category={category}
                  options={categoryValues(allSongs, category.id)}
                  bounds={categoryBounds(allSongs, category.id)}
                  value={song.tags[category.id]}
                  onChange={(value) => onUpdateTag(category.id, value)}
                  onAddValue={() => {}}
                />
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}
