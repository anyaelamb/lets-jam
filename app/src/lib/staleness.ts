import type { RatingScaleEntry, Song } from '../types';

export function intervalForRating(ratingScale: RatingScaleEntry[], label: string | null): number {
  if (!label) return 0;
  return ratingScale.find((r) => r.label === label)?.intervalDays ?? 0;
}

// Staleness only means anything for a memorized song — it's about memory
// decay since last practice. A song you're reading off the chart doesn't
// "go stale" the same way, so it has no staleness at all (null), not a
// fresh/overdue value. Days overdue (negative = not yet due); a never-played
// memorized song is treated as maximally stale so it surfaces first in a
// most-overdue-first sort.
export function stalenessDays(song: Song, ratingScale: RatingScaleEntry[]): number | null {
  if (!song.memorized) return null;
  if (!song.lastPlayedAt) return Infinity;
  const interval = intervalForRating(ratingScale, song.lastRatingLabel);
  const dueAt = new Date(song.lastPlayedAt).getTime() + interval * 24 * 60 * 60 * 1000;
  return (Date.now() - dueAt) / (24 * 60 * 60 * 1000);
}

export function formatStaleness(days: number): { text: string; overdue: boolean } {
  if (!isFinite(days)) return { text: 'Never played', overdue: true };
  const rounded = Math.round(days);
  if (rounded > 0) return { text: `${rounded}d overdue`, overdue: true };
  if (rounded === 0) return { text: 'Due today', overdue: true };
  return { text: `${Math.abs(rounded)}d fresh`, overdue: false };
}
