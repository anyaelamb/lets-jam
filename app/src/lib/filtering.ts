import type { Category, FilterState, RatingScaleEntry, Song, SortCriterion } from '../types';
import { stalenessDays } from './staleness';

export function categoryBounds(songs: Song[], categoryId: string): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const song of songs) {
    const v = song.tags[categoryId];
    if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number') {
      min = Math.min(min, v[0]);
      max = Math.max(max, v[1] as number);
    }
  }
  if (!isFinite(min) || !isFinite(max)) return [0, 100];
  return [min, max];
}

// The one category with its own dedicated picker entry point (the Genre
// Picker) — locked against retirement in Settings, and always excluded
// from the Scatter Picker regardless of its own toggle, since it already
// has a faster, purpose-built way to get to it.
export const GENRE_CATEGORY_ID = 'genre_2';

// Fixed youngest-to-oldest order for Age Range's chips — matches how the
// buckets were defined when the category switched from a numeric slider to
// a multi-select. A custom bucket added later just sorts after these four
// rather than breaking the ordering.
const AGE_GROUP_ORDER = ['Kiddos', 'Gen Alpha', 'Millennials', 'GenX Plus'];

export function categoryValues(
  songs: Song[],
  categoryId: string,
  ratingScale?: RatingScaleEntry[],
  registeredValues?: string[],
): string[] {
  const set = new Set<string>(registeredValues ?? []);

  // Performance/Memorization Confidence have no independent value list of
  // their own to register (see Settings) — every rating-scale label is
  // always a valid option, even for a song that's never been rated, so
  // Gap-Fill has something to offer instead of an empty picker.
  if (isConfidenceCategory(categoryId) && ratingScale) {
    ratingScale.forEach((r) => set.add(r.label));
  }

  for (const song of songs) {
    const v = song.tags[categoryId];
    if (typeof v === 'string') set.add(v);
    else if (Array.isArray(v) && typeof v[0] === 'string') {
      (v as string[]).forEach((x) => set.add(x));
    }
  }
  const values = Array.from(set);

  // Performance/Memorization Confidence mirror rating-scale quality, not
  // alphabetical order — Great/Good/Passable/Learning reads naturally,
  // "Good, Great, Learning, Passable" doesn't.
  if (isConfidenceCategory(categoryId) && ratingScale) {
    const rank = new Map(ratingScale.map((r, i) => [r.label, i]));
    return values.sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
  }

  if (categoryId === 'age_range') {
    const rank = new Map(AGE_GROUP_ORDER.map((label, i) => [label, i]));
    return values.sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
  }

  return values.sort((a, b) => a.localeCompare(b));
}

export function songMatchesFilters(
  song: Song,
  filters: FilterState,
  categories: Category[],
  includeUntagged: boolean,
): boolean {
  for (const category of categories) {
    const f = filters[category.id];
    if (!f) continue;
    const tagValue = song.tags[category.id];

    if (category.type === 'range') {
      if (!f.range) continue;
      if (tagValue == null) {
        if (!includeUntagged) return false;
        continue;
      }
      const [songMin, songMax] = tagValue as [number, number];
      const [selMin, selMax] = f.range;
      if (!(songMin <= selMax && songMax >= selMin)) return false;
    } else {
      if (!f.values || f.values.length === 0) continue;
      if (tagValue == null) {
        if (!includeUntagged) return false;
        continue;
      }
      const songValues = Array.isArray(tagValue) ? (tagValue as string[]) : [tagValue as string];
      if (!f.values.some((v) => songValues.includes(v))) return false;
    }
  }
  return true;
}

export function filterSongs(
  songs: Song[],
  filters: FilterState,
  categories: Category[],
  includeUntagged: boolean,
): Song[] {
  return songs.filter((s) => songMatchesFilters(s, filters, categories, includeUntagged));
}

function tagSortValue(song: Song, categoryId: string): string | number | null {
  const v = song.tags[categoryId];
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    if (typeof v[0] === 'number') return v[0] as number;
    return (v as string[])[0] ?? null;
  }
  return null;
}

function isConfidenceCategory(categoryId: string): boolean {
  return categoryId === 'performance_confidence' || categoryId === 'memorization_confidence';
}

export function confidenceScore(song: Song, key: string, ratingScale: RatingScaleEntry[]): number | null {
  const value = song.tags[key];
  if (typeof value !== 'string') return null;
  const idx = ratingScale.findIndex((r) => r.label === value);
  if (idx === -1) return null;
  return ratingScale.length - idx; // higher score = better rating
}

// Pre-compensates for sortSongs' direction flip so a "not applicable" value
// (null) always sorts last, regardless of whether the criterion is asc or
// desc — otherwise "most overdue first" would put non-memorized songs
// (which have no staleness) at the very top instead of out of the way.
function nullsLast(aIsNull: boolean, direction: 'asc' | 'desc'): number {
  const base = aIsNull ? 1 : -1;
  return direction === 'asc' ? base : -base;
}

function compareByKey(a: Song, b: Song, key: string, direction: 'asc' | 'desc', ratingScale: RatingScaleEntry[]): number {
  if (key === 'staleness') {
    const as = stalenessDays(a, ratingScale);
    const bs = stalenessDays(b, ratingScale);
    if (as == null && bs == null) return 0;
    if (as == null) return nullsLast(true, direction);
    if (bs == null) return nullsLast(false, direction);
    return as - bs;
  }
  if (isConfidenceCategory(key)) {
    const as = confidenceScore(a, key, ratingScale);
    const bs = confidenceScore(b, key, ratingScale);
    if (as == null && bs == null) return 0;
    if (as == null) return nullsLast(true, direction);
    if (bs == null) return nullsLast(false, direction);
    return as - bs;
  }
  if (key === 'title') return a.title.localeCompare(b.title);
  if (key === 'artist') return a.artist.localeCompare(b.artist);

  const av = tagSortValue(a, key);
  const bv = tagSortValue(b, key);
  if (av == null && bv == null) return 0;
  if (av == null) return nullsLast(true, direction);
  if (bv == null) return nullsLast(false, direction);
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv));
}

export function sortSongs(songs: Song[], criteria: SortCriterion[], ratingScale: RatingScaleEntry[]): Song[] {
  if (criteria.length === 0) return songs;
  return [...songs].sort((a, b) => {
    for (const c of criteria) {
      const cmp = compareByKey(a, b, c.key, c.direction, ratingScale);
      if (cmp !== 0) return c.direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}
