import type { RatingScaleEntry, Song } from '../types';
import { formatStaleness, stalenessDays } from '../lib/staleness';

interface ResultsProps {
  songs: Song[];
  totalCount: number;
  ratingScale: RatingScaleEntry[];
  showStaleness: boolean;
  onToggleStaleness: (next: boolean) => void;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  onOpenSettings: () => void;
  onStartOver: () => void;
  onSelectSong: (song: Song) => void;
  onOpenTagEditor: (song: Song) => void;
}

export default function Results({
  songs,
  totalCount,
  ratingScale,
  showStaleness,
  onToggleStaleness,
  onOpenFilters,
  onOpenSort,
  onOpenSettings,
  onStartOver,
  onSelectSong,
  onOpenTagEditor,
}: ResultsProps) {
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
        <button type="button" className="hamburger-button" onClick={onOpenSettings} aria-label="Settings">
          ☰
        </button>
      </div>

      <div className="results-subbar">
        <p className="results-count">
          {songs.length} of {totalCount} songs
        </p>
        <label className="staleness-toggle">
          <input
            type="checkbox"
            checked={showStaleness}
            onChange={(e) => onToggleStaleness(e.target.checked)}
          />
          Show staleness (memorized only)
        </label>
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
              <button
                type="button"
                className="icon-button song-row-menu"
                onClick={() => onOpenTagEditor(song)}
                aria-label={`Edit tags for ${song.title}`}
              >
                ⋮
              </button>
            </li>
          );
        })}
        {songs.length === 0 && <li className="song-list-empty">No songs match these filters.</li>}
      </ul>
    </div>
  );
}
