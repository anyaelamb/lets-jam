import { useRef, useState } from 'react';
import type { Song } from '../types';

interface SongQueueProps {
  songs: Song[];
  onSelectSong: (song: Song) => void;
  onRemove: (songId: string) => void;
  onBack: () => void;
}

const SWIPE_THRESHOLD = 80;

export default function SongQueue({ songs, onSelectSong, onRemove, onBack }: SongQueueProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragX, setDragX] = useState(0);
  const startPos = useRef({ x: 0, y: 0 });

  function handleTouchStart(id: string, e: React.TouchEvent) {
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDragId(id);
    setDragX(0);
  }

  function handleTouchMove(id: string, e: React.TouchEvent) {
    if (dragId !== id) return;
    const dx = e.touches[0].clientX - startPos.current.x;
    const dy = e.touches[0].clientY - startPos.current.y;
    // Only track this as a swipe once it's clearly more horizontal than
    // vertical — otherwise let the browser's native scroll take over.
    if (Math.abs(dx) > Math.abs(dy)) setDragX(Math.min(0, dx));
  }

  function handleTouchEnd(id: string) {
    if (dragId !== id) return;
    if (dragX < -SWIPE_THRESHOLD) onRemove(id);
    setDragId(null);
    setDragX(0);
  }

  function handleRowClick(song: Song) {
    // Swallow the click that follows a real swipe gesture so it doesn't
    // also open the rating screen.
    if (dragId === song.id && Math.abs(dragX) > 10) return;
    onSelectSong(song);
  }

  return (
    <div className="screen song-queue">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        ← Back to results
      </button>

      <h2>Song Queue</h2>
      <p className="modal-subtitle">Tap a song to rate it. Swipe left (or tap ×) to remove it without rating.</p>

      <ul className="song-list queue-list">
        {songs.map((song) => {
          const dx = dragId === song.id ? dragX : 0;
          return (
            <li key={song.id} className="song-row queue-row">
              <div className="queue-row-delete-bg">Remove</div>
              <button
                type="button"
                className="song-row-main queue-row-main"
                style={{ transform: `translateX(${dx}px)` }}
                onTouchStart={(e) => handleTouchStart(song.id, e)}
                onTouchMove={(e) => handleTouchMove(song.id, e)}
                onTouchEnd={() => handleTouchEnd(song.id)}
                onClick={() => handleRowClick(song)}
              >
                <span className="song-title">{song.title}</span>
                <span className="song-artist">{song.artist}</span>
              </button>
              <button
                type="button"
                className="icon-button queue-row-remove"
                onClick={() => onRemove(song.id)}
                aria-label={`Remove ${song.title} from queue`}
              >
                ×
              </button>
            </li>
          );
        })}
        {songs.length === 0 && (
          <li className="song-list-empty">Queue is empty — tap songs on Results to add them.</li>
        )}
      </ul>
    </div>
  );
}
