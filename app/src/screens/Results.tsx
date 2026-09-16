import type { Category, CategoryFilter, FilterState, RatingScaleEntry, Song } from '../types';
import { formatStaleness, stalenessDays } from '../lib/staleness';

interface ResultsProps {
  songs: Song[];
  totalCount: number;
  ratingScale: RatingScaleEntry[];
  categories: Category[];
  filters: FilterState;
  includeUntagged: boolean;
  showStaleness: boolean;
  onToggleStaleness: (next: boolean) => void;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  onOpenSettings: () => void;
  onStartOver: () => void;
  onSelectSong: (song: Song) => void;
  onOpenTagEditor: (song: Song) => void;
  canEdit: boolean;
}

function filterLabel(category: Category, filter: CategoryFilter): string {
  if (category.type === 'range' && filter.range) {
    return `${category.name}: ${filter.range[0]}–${filter.range[1]}`;
  }
  if (filter.values && filter.values.length > 0) {
    return `${category.name}: ${filter.values.join(', ')}`;
  }
  return category.name;
}

export default function Results({
  songs,
  totalCount,
  ratingScale,
  categories,
  filters,
  includeUntagged,
  showStaleness,
  onToggleStaleness,
  onOpenFilters,
  onOpenSort,
  onOpenSettings,
  onStartOver,
  onSelectSong,
  onOpenTagEditor,
  canEdit,
}: ResultsProps) {
  const activeFilterLabels = categories
    .filter((c) => filters[c.id])
    .map((c) => filterLabel(c, filters[c.id]));

  return (
    <div className="screen results">
      <div className="results-toolbar">
        <button type="button" className="btn btn-ghost" onClick={onOpenFilters}>
          Filters
        </button>
        <button type="button" className="btn btn-ghost" onClick={onOpenSort}>
          Sort
        </button>
        <button type="button" className="btn btn-ghost" onClick={onStartOver}>
          Start Over
        </button>
        {canEdit && (
          <button type="button" className="hamburger-button" onClick={onOpenSettings} aria-label="Settings">
            ☰
          </button>
        )}
      </div>

      {activeFilterLabels.length > 0 && (
        <button type="button" className="active-filters" onClick={onOpenFilters}>
          {activeFilterLabels.map((label) => (
            <span key={label} className="active-filter-chip">
              {label}
            </span>
          ))}
          {includeUntagged && <span className="active-filter-chip active-filter-chip-muted">+ untagged included</span>}
        </button>
      )}

      <div className="results-subbar">
        <p className="results-count">
          {songs.length} of {totalCount} songs
        </p>
        {canEdit && (
          <label className="staleness-toggle">
            <input
              type="checkbox"
              checked={showStaleness}
              onChange={(e) => onToggleStaleness(e.target.checked)}
            />
            Show staleness (memorized only)
          </label>
        )}
      </div>

      <ul className="song-list">
        {songs.map((song) => {
          // Non-memorized songs have no staleness — nothing to decay if
          // you're reading it off the chart — so they just show no badge.
          const days = showStaleness ? stalenessDays(song, ratingScale) : null;
          const staleness = days != null ? formatStaleness(days) : null;
          return (
            <li key={song.id} className="song-row">
              <button type="button" className="song-row-main" onClick={() => onSelectSong(song)}>
                <span className="song-title">{song.title}</span>
                <span className="song-artist">{song.artist}</span>
              </button>
              {staleness && (
                <span className={`staleness-badge ${staleness.overdue ? 'staleness-overdue' : 'staleness-fresh'}`}>
                  {staleness.text}
                </span>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="icon-button song-row-menu"
                  onClick={() => onOpenTagEditor(song)}
                  aria-label={`Edit tags for ${song.title}`}
                >
                  ⋮
                </button>
              )}
            </li>
          );
        })}
        {songs.length === 0 && <li className="song-list-empty">No songs match these filters.</li>}
      </ul>
    </div>
  );
}
