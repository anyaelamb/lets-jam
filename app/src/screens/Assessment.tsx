import type { RatingScaleEntry, Song } from '../types';

interface AssessmentProps {
  song: Song;
  ratingScale: RatingScaleEntry[];
  onRate: (label: string) => void;
  onToggleMemorized: (memorized: boolean) => void;
  onSkip: () => void;
  onRetag: (song: Song) => void;
  onBack: () => void;
}

export default function Assessment({
  song,
  ratingScale,
  onRate,
  onToggleMemorized,
  onSkip,
  onRetag,
  onBack,
}: AssessmentProps) {
  return (
    <div className="screen assessment">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        ← Back to results
      </button>

      <h2>{song.title}</h2>
      <p className="modal-subtitle">{song.artist}</p>

      <a className="btn btn-ghost" href={song.ultimateGuitarUrl} target="_blank" rel="noreferrer">
        Open chords / lyrics ↗
      </a>

      <label className="memorized-toggle">
        <input type="checkbox" checked={song.memorized} onChange={(e) => onToggleMemorized(e.target.checked)} />
        Memorized
      </label>

      <p className="assessment-prompt">
        {song.memorized
          ? 'How well did you play it from memory? This sets your Memorization Confidence.'
          : 'How well did you play through it (reading along)? This sets your Performance Confidence.'}
      </p>

      <div className="rating-buttons">
        {ratingScale.map((r) => (
          <button key={r.label} type="button" className="btn btn-rating" onClick={() => onRate(r.label)}>
            {r.label}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-ghost btn-skip" onClick={onSkip}>
        Didn't perform
      </button>

      {song.lastPlayedAt && (
        <p className="assessment-meta">
          Last played {new Date(song.lastPlayedAt).toLocaleDateString()} — rated {song.lastRatingLabel}
        </p>
      )}

      <button type="button" className="btn btn-link" onClick={() => onRetag(song)}>
        Re-tag this song
      </button>
    </div>
  );
}
