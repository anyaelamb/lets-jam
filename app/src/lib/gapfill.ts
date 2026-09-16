import type { RatingScaleEntry, Song } from '../types';
import { confidenceScore } from './filtering';

export type GapFillMode = 'gaps' | 'memorized';

export interface GapFillSegment {
  label: string;
  phase: 'fill' | 'review';
  ids: string[];
}

export interface GapFillQueue {
  categoryId: string;
  mode: GapFillMode;
  segments: GapFillSegment[];
}

function splitByTagged(songs: Song[], categoryId: string): { untagged: Song[]; tagged: Song[] } {
  const untagged: Song[] = [];
  const tagged: Song[] = [];
  for (const song of songs) {
    if (song.tags[categoryId] == null) untagged.push(song);
    else tagged.push(song);
  }
  return { untagged, tagged };
}

// Fill segments (songs still missing the category being gap-filled) are
// ordered by existing Performance Confidence, highest first — the songs
// you already know best are the fastest, most confident judgment calls, so
// working through those first speeds up tagging the rest.
function orderFillSongs(songs: Song[], ratingScale: RatingScaleEntry[]): string[] {
  const scored = [...songs].sort((a, b) => {
    const as = confidenceScore(a, 'performance_confidence', ratingScale);
    const bs = confidenceScore(b, 'performance_confidence', ratingScale);
    if (as == null && bs == null) return 0;
    if (as == null) return 1;
    if (bs == null) return -1;
    return bs - as;
  });
  return scored.map((s) => s.id);
}

// Snapshot, not persisted — per the brief, an abandoned session has no
// resume state. Starting Gap-Fill again just rebuilds this from current
// song data, so whatever got tagged last time naturally drops out.
export function buildGapFillQueue(
  songs: Song[],
  categoryId: string,
  mode: GapFillMode,
  ratingScale: RatingScaleEntry[],
): GapFillQueue {
  // A memorized song's Performance Confidence is permanently "Great" (see
  // withComputedTags) — there's nothing to establish or review for it, so
  // it never belongs in this category's queue at all.
  const eligible = categoryId === 'performance_confidence' ? songs.filter((s) => !s.memorized) : songs;

  if (mode === 'memorized') {
    const memorizedSplit = splitByTagged(
      eligible.filter((s) => s.memorized),
      categoryId,
    );
    const restSplit = splitByTagged(
      eligible.filter((s) => !s.memorized),
      categoryId,
    );
    const rawSegments: GapFillSegment[] = [
      { label: 'Memorized — filling gaps', phase: 'fill', ids: orderFillSongs(memorizedSplit.untagged, ratingScale) },
      {
        label: 'Memorized — reviewing tagged songs',
        phase: 'review',
        ids: memorizedSplit.tagged.map((s) => s.id),
      },
      { label: 'Not memorized — filling gaps', phase: 'fill', ids: orderFillSongs(restSplit.untagged, ratingScale) },
      {
        label: 'Not memorized — reviewing tagged songs',
        phase: 'review',
        ids: restSplit.tagged.map((s) => s.id),
      },
    ];
    return { categoryId, mode, segments: rawSegments.filter((s) => s.ids.length > 0) };
  }

  const { untagged, tagged } = splitByTagged(eligible, categoryId);
  const rawSegments: GapFillSegment[] = [
    { label: 'Filling gaps', phase: 'fill', ids: orderFillSongs(untagged, ratingScale) },
    { label: 'Reviewing tagged songs', phase: 'review', ids: tagged.map((s) => s.id) },
  ];
  return { categoryId, mode, segments: rawSegments.filter((s) => s.ids.length > 0) };
}

export function gapFillTotal(queue: GapFillQueue): number {
  return queue.segments.reduce((sum, s) => sum + s.ids.length, 0);
}

export interface GapFillPosition {
  songId: string | null;
  phase: 'fill' | 'review';
  segmentLabel: string;
}

export function gapFillAt(queue: GapFillQueue, index: number): GapFillPosition {
  let offset = 0;
  for (const segment of queue.segments) {
    if (index < offset + segment.ids.length) {
      return { songId: segment.ids[index - offset], phase: segment.phase, segmentLabel: segment.label };
    }
    offset += segment.ids.length;
  }
  return { songId: null, phase: 'review', segmentLabel: '' };
}
