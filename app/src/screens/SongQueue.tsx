import type { Song } from '../types';

interface SongQueueProps {
  songs: Song[];
  onSelectSong: (song: Song) => void;
  onRemove: (songId: string) => void;
  onBack: () => void;
}

export default function SongQueue({ songs, onSelectSong, onRemove, onBack }: SongQueueProps) {
  return (
    <div className="screen song-queue">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        ← Back to results
      </button>

      <h2>Song Queue</h2>
      <p className="modal-subtitle">Tap a song to rate it, or tap × to remove it without rating.</p>

      <ul className="song-list queue-list">
        {songs.map((song) => (
          <li key={song.id} className="song-row">
            <button type="button" className="song-row-main" onClick={() => onSelectSong(song)}>
              <span className="song-title">{song.title}</span>
              <span className="song-artist">{song.artist}</span>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => onRemove(song.id)}
              aria-label={`Remove ${song.title} from queue`}
            >
              ×
            </button>
          </li>
        ))}
        {songs.length === 0 && (
          <li className="song-list-empty">Queue is empty — tap songs on Results to add them.</li>
        )}
      </ul>
    </div>
  );
}
