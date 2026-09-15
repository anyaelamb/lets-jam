import { useState } from 'react';
import type { Category, Song, TagValue } from '../types';
import { categoryBounds, categoryValues } from '../lib/filtering';
import CategoryValueEditor from '../components/CategoryValueEditor';

interface AddSongProps {
  categories: Category[];
  songs: Song[];
  onSave: (input: { title: string; artist: string; ultimateGuitarUrl: string; tags: Record<string, TagValue> }) => void;
  onCancel: () => void;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export default function AddSong({ categories, songs, onSave, onCancel }: AddSongProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<Record<string, TagValue>>({});

  const taggableCategories = categories.filter((c) => !c.computed);

  function setTag(categoryId: string, value: TagValue | null) {
    setTags((prev) => {
      const next = { ...prev };
      if (value == null) delete next[categoryId];
      else next[categoryId] = value;
      return next;
    });
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedArtist = artist.trim();
    if (!trimmedTitle || !trimmedArtist) return;

    const duplicate = songs.find(
      (s) => normalize(s.title) === normalize(trimmedTitle) && normalize(s.artist) === normalize(trimmedArtist),
    );
    if (duplicate) {
      const confirmed = window.confirm(
        `"${duplicate.title}" by ${duplicate.artist} is already in the library. Add this as a separate song anyway?`,
      );
      if (!confirmed) return;
    }

    onSave({ title: trimmedTitle, artist: trimmedArtist, ultimateGuitarUrl: url.trim(), tags });
  }

  return (
    <div className="screen add-song">
      <button type="button" className="btn btn-ghost" onClick={onCancel}>
        ← Back to settings
      </button>

      <h2>Add Song</h2>

      <section className="tag-editor-row">
        <h3>Title</h3>
        <input
          className="url-input"
          value={title}
          placeholder="Song title"
          onChange={(e) => setTitle(e.target.value)}
        />
      </section>

      <section className="tag-editor-row">
        <h3>Artist</h3>
        <input
          className="url-input"
          value={artist}
          placeholder="Artist"
          onChange={(e) => setArtist(e.target.value)}
        />
      </section>

      <section className="tag-editor-row">
        <h3>Ultimate Guitar Link</h3>
        <input
          type="url"
          className="url-input"
          value={url}
          placeholder="https://tabs.ultimate-guitar.com/…"
          onChange={(e) => setUrl(e.target.value)}
        />
      </section>

      {taggableCategories.map((category) => (
        <section key={category.id} className="tag-editor-row">
          <h3>{category.name}</h3>
          <CategoryValueEditor
            category={category}
            options={categoryValues(songs, category.id, undefined, category.values)}
            bounds={categoryBounds(songs, category.id)}
            value={tags[category.id]}
            onChange={(value) => setTag(category.id, value)}
            onAddValue={() => {}}
          />
        </section>
      ))}

      <button
        type="button"
        className="btn btn-primary btn-large"
        disabled={!title.trim() || !artist.trim()}
        onClick={handleSave}
      >
        Save Song
      </button>
    </div>
  );
}
