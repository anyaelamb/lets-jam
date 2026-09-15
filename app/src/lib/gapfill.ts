import type { Song } from '../types';

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

function splitByTagged(songs: Song[], categoryId: string): { untagged: string[]; tagged: string[] } {
  const untagged: string[] = [];
  const tagged: string[] = [];
  for (const song of songs) {
    if (song.tags[categoryId] == null) untagged.push(song.id);
    else tagged.push(song.id);
  }
  return { untagged, tagged };
}

// Snapshot, not persisted — per the brief, an abandoned session has no
// resume state. Starting Gap-Fill again just rebuilds this from current
// song data, so whatever got tagged last time naturally drops out.
export function buildGapFillQueue(songs: Song[], categoryId: string, mode: GapFillMode): GapFillQueue {
  if (mode === 'memorized') {
    const memorizedSplit = splitByTagged(
      songs.filter((s) => s.memorized),
      categoryId,
    );
    const restSplit = splitByTagged(
      songs.filter((s) => !s.memorized),
      categoryId,
    );
    const rawSegments: GapFillSegment[] = [
      { label: 'Memorized — filling gaps', phase: 'fill', ids: memorizedSplit.untagged },
      { label: 'Memorized — reviewing tagged songs', phase: 'review', ids: memorizedSplit.tagged },
      { label: 'Not memorized — filling gaps', phase: 'fill', ids: restSplit.untagged },
      { label: 'Not memorized — reviewing tagged songs', phase: 'review', ids: restSplit.tagged },
    ];
    return { categoryId, mode, segments: rawSegments.filter((s) => s.ids.length > 0) };
  }

  const { untagged, tagged } = splitByTagged(songs, categoryId);
  const rawSegments: GapFillSegment[] = [
    { label: 'Filling gaps', phase: 'fill', ids: untagged },
    { label: 'Reviewing tagged songs', phase: 'review', ids: tagged },
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
