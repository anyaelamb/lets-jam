import { useState } from 'react';
import type { Category, Song, TagValue } from '../types';
import type { GapFillMode } from '../lib/gapfill';
import { categoryBounds, categoryValues } from '../lib/filtering';
import CategoryValueEditor from '../components/CategoryValueEditor';

interface GapFillProps {
  category: Category;
  song: Song | null;
  allSongs: Song[];
  phase: 'fill' | 'review';
  segmentLabel: string;
  mode: GapFillMode;
  onModeChange: (mode: GapFillMode) => void;
  current: number;
  total: number;
  canGoBack: boolean;
  onCommit: (value: TagValue | null) => void;
  onSkip: () => void;
  onBack: () => void;
  onExit: () => void;
}

export default function GapFill({
  category,
  song,
  allSongs,
  phase,
  segmentLabel,
  mode,
  onModeChange,
  current,
  total,
  canGoBack,
  onCommit,
  onSkip,
  onBack,
  onExit,
}: GapFillProps) {
  // Blank in the fill phase, pre-selected with the existing value once
  // reviewing already-tagged songs — see the brief's two-phase Gap-Fill spec.
  const startingValue = song && phase === 'review' ? (song.tags[category.id] ?? null) : null;
  const [pending, setPending] = useState<TagValue | null>(startingValue);
  const autoAdvances = category.type === 'single';

  const orderToggle = (
    <div className="gapfill-order-toggle">
      <button
        type="button"
        className={`gapfill-order-btn${mode === 'gaps' ? ' gapfill-order-btn-active' : ''}`}
        onClick={() => onModeChange('gaps')}
      >
        Untagged first
      </button>
      <button
        type="button"
        className={`gapfill-order-btn${mode === 'memorized' ? ' gapfill-order-btn-active' : ''}`}
        onClick={() => onModeChange('memorized')}
      >
        Memorized first
      </button>
    </div>
  );

  if (!song) {
    return (
      <div className="screen gapfill">
        {orderToggle}
        <h2>All caught up</h2>
        <p className="modal-subtitle">Every song now has a {category.name} value — nice work.</p>
        <button type="button" className="btn btn-primary" onClick={onExit}>
          Back to Settings
        </button>
      </div>
    );
  }

  const options = categoryValues(allSongs, category.id, undefined, category.values);
  const bounds = categoryBounds(allSongs, category.id);

  function handleChange(next: TagValue | null) {
    setPending(next);
    // Single-select is one tap = one complete decision, so it advances
    // immediately. Multi-select and range need an explicit commit since
    // picking is a multi-step or continuous interaction.
    if (autoAdvances) onCommit(next);
  }

  return (
    <div className="screen gapfill picker">
      {orderToggle}

      <div className="picker-header">
        <span className="picker-progress">
          {segmentLabel} — {current} of {total}
        </span>
      </div>

      <div className="gapfill-song">
        <h2>{song.title}</h2>
        <p className="modal-subtitle">{song.artist}</p>
      </div>

      <h3 className="gapfill-category-label">{category.name}</h3>

      <div className="picker-control">
        <CategoryValueEditor
          category={category}
          options={options}
          bounds={bounds}
          value={pending ?? undefined}
          onChange={handleChange}
          onAddValue={category.id === 'memorized' ? undefined : () => {}}
          large
        />
      </div>

      <div className="picker-actions">
        {canGoBack && (
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Back
          </button>
        )}
        {!autoAdvances && (
          <button type="button" className="btn btn-primary" onClick={() => onCommit(pending)}>
            Save &amp; Next
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onSkip}>
          Skip
        </button>
        <button type="button" className="btn btn-link" onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  );
}
