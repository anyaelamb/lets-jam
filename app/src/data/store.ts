import type { Category, CategoryType, RatingScaleEntry, Song, TagValue } from '../types';
import { getSupabaseClient } from './supabaseClient';

// Supabase-backed implementation of the data-access layer. Every screen
// talks to this module only — this file is the entire surface area that
// changed when the app moved off in-memory fixtures onto the real database.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSongRow(row: any): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    ultimateGuitarUrl: row.ultimate_guitar_url,
    memorized: row.memorized,
    lastPlayedAt: row.last_played_at,
    lastRatingLabel: row.last_rating_label,
    tags: row.tags ?? {},
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCategoryRow(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    computed: row.computed,
    guidedPickerEnabled: row.guided_picker_enabled,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRatingRow(row: any): RatingScaleEntry {
  return { label: row.label, intervalDays: row.interval_days };
}

// Three computed tags, derived at read time (like Staleness) so there's no
// separate write path to keep in sync — they can never drift from
// memorized/lastRatingLabel:
// - "Memorized" is just memorized as a filterable yes/no, independent of
//   how well the song is actually going — lets a Guided Picker step ask
//   "memorized songs only" without also constraining confidence level.
// - A memorized song is always "Great" Performance Confidence (you know it
//   cold regardless of how a read-through would go); its rating instead
//   goes to Memorization Confidence, since that's what you're actually
//   assessing after playing it from memory.
// - An unmemorized song has no Memorization Confidence (not applicable —
//   you're not playing it from memory), and its rating goes to Performance
//   Confidence, since that's what a read-through assesses.
function withComputedTags(song: Song): Song {
  const tags = { ...song.tags };
  tags.memorized = song.memorized ? 'Memorized' : 'Not memorized';

  if (song.memorized) {
    tags.performance_confidence = 'Great';
    if (song.lastRatingLabel) tags.memorization_confidence = song.lastRatingLabel;
    else delete tags.memorization_confidence;
  } else {
    if (song.lastRatingLabel) tags.performance_confidence = song.lastRatingLabel;
    else delete tags.performance_confidence;
    delete tags.memorization_confidence;
  }

  return { ...song, tags };
}

function slugify(name: string, existingIds: string[]): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  let id = base || 'category';
  let n = 2;
  while (existingIds.includes(id)) {
    id = `${base}_${n}`;
    n += 1;
  }
  return id;
}

export async function getSongs(): Promise<Song[]> {
  const { data, error } = await getSupabaseClient().from('songs').select('*');
  if (error) throw error;
  return data.map(mapSongRow).map(withComputedTags);
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabaseClient().from('categories').select('*').order('sort_order');
  if (error) throw error;
  return data.map(mapCategoryRow);
}

export async function getRatingScale(): Promise<RatingScaleEntry[]> {
  const { data, error } = await getSupabaseClient()
    .from('rating_scale')
    .select('*')
    .order('interval_days', { ascending: false });
  if (error) throw error;
  return data.map(mapRatingRow);
}

export async function rateSong(songId: string, ratingLabel: string): Promise<Song> {
  const { data, error } = await getSupabaseClient()
    .from('songs')
    .update({ last_played_at: new Date().toISOString(), last_rating_label: ratingLabel })
    .eq('id', songId)
    .select()
    .single();
  if (error) throw error;
  return withComputedTags(mapSongRow(data));
}

export async function setMemorized(songId: string, memorized: boolean): Promise<Song> {
  const { data, error } = await getSupabaseClient()
    .from('songs')
    .update({ memorized })
    .eq('id', songId)
    .select()
    .single();
  if (error) throw error;
  return withComputedTags(mapSongRow(data));
}

// "Memorized" is backed by the real memorized boolean, not a raw tag —
// withComputedTags regenerates tags.memorized from it on every read, so a
// generic tag write here would just get silently overwritten. Callers must
// route memorized-category writes through setMemorized instead.
export async function updateSongTag(songId: string, categoryId: string, value: TagValue | null): Promise<Song> {
  const client = getSupabaseClient();
  const { data, error } =
    value == null
      ? await client.rpc('delete_song_tag', { p_song_id: songId, p_category_id: categoryId })
      : await client.rpc('update_song_tag', { p_song_id: songId, p_category_id: categoryId, p_value: value });
  if (error) throw error;
  return withComputedTags(mapSongRow(data));
}

export async function addSong(input: {
  title: string;
  artist: string;
  ultimateGuitarUrl: string;
  tags: Record<string, TagValue>;
}): Promise<Song[]> {
  const { error } = await getSupabaseClient().from('songs').insert({
    title: input.title.trim(),
    artist: input.artist.trim(),
    ultimate_guitar_url: input.ultimateGuitarUrl.trim(),
    tags: input.tags,
  });
  if (error) throw error;
  return getSongs();
}

export async function updateSongUrl(songId: string, url: string): Promise<Song> {
  const { data, error } = await getSupabaseClient()
    .from('songs')
    .update({ ultimate_guitar_url: url })
    .eq('id', songId)
    .select()
    .single();
  if (error) throw error;
  return withComputedTags(mapSongRow(data));
}

// --- Settings: category management ---

export async function addCategory(name: string, type: CategoryType): Promise<Category[]> {
  const client = getSupabaseClient();
  const { data: existing, error: fetchError } = await client.from('categories').select('id, sort_order');
  if (fetchError) throw fetchError;

  const id = slugify(
    name,
    existing.map((c: { id: string }) => c.id),
  );
  const nextSortOrder =
    existing.length > 0 ? Math.max(...existing.map((c: { sort_order: number }) => c.sort_order)) + 1 : 0;

  const { error: insertError } = await client.from('categories').insert({
    id,
    name: name.trim(),
    type,
    computed: false,
    guided_picker_enabled: true,
    sort_order: nextSortOrder,
  });
  if (insertError) throw insertError;
  return getCategories();
}

export async function renameCategory(categoryId: string, name: string): Promise<Category[]> {
  const { error } = await getSupabaseClient().from('categories').update({ name: name.trim() }).eq('id', categoryId);
  if (error) throw error;
  return getCategories();
}

// Retiring drops the category from the active list — Guided Picker, Filters,
// Sort, and the tag editor all stop offering it. Songs keep whatever value
// they already had under that key; nothing touches song data, matching the
// JSONB "a key nobody reads is just inert" model.
export async function retireCategory(categoryId: string): Promise<Category[]> {
  const { error } = await getSupabaseClient().from('categories').delete().eq('id', categoryId);
  if (error) throw error;
  return getCategories();
}

export async function reorderCategories(orderedIds: string[]): Promise<Category[]> {
  const client = getSupabaseClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => client.from('categories').update({ sort_order: index }).eq('id', id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  return getCategories();
}

export async function setCategoryGuidedPickerEnabled(categoryId: string, enabled: boolean): Promise<Category[]> {
  const { error } = await getSupabaseClient()
    .from('categories')
    .update({ guided_picker_enabled: enabled })
    .eq('id', categoryId);
  if (error) throw error;
  return getCategories();
}

export async function renameCategoryValue(categoryId: string, oldValue: string, newValue: string): Promise<Song[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('songs').select('id, tags');
  if (error) throw error;

  const writes = data.flatMap((row: { id: string; tags: Record<string, TagValue> }) => {
    const v = row.tags?.[categoryId];
    if (v == null) return [];
    if (typeof v === 'string' && v === oldValue) {
      return [client.rpc('update_song_tag', { p_song_id: row.id, p_category_id: categoryId, p_value: newValue })];
    }
    if (Array.isArray(v) && (v as string[]).includes(oldValue)) {
      const nextValues = Array.from(new Set((v as string[]).map((x) => (x === oldValue ? newValue : x))));
      return [
        client.rpc('update_song_tag', { p_song_id: row.id, p_category_id: categoryId, p_value: nextValues }),
      ];
    }
    return [];
  });

  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  return getSongs();
}

export async function deleteCategoryValue(categoryId: string, value: string): Promise<Song[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('songs').select('id, tags');
  if (error) throw error;

  const writes = data.flatMap((row: { id: string; tags: Record<string, TagValue> }) => {
    const v = row.tags?.[categoryId];
    if (v == null) return [];
    if (typeof v === 'string' && v === value) {
      return [client.rpc('delete_song_tag', { p_song_id: row.id, p_category_id: categoryId })];
    }
    if (Array.isArray(v) && (v as string[]).includes(value)) {
      const nextValues = (v as string[]).filter((x) => x !== value);
      return nextValues.length === 0
        ? [client.rpc('delete_song_tag', { p_song_id: row.id, p_category_id: categoryId })]
        : [client.rpc('update_song_tag', { p_song_id: row.id, p_category_id: categoryId, p_value: nextValues })];
    }
    return [];
  });

  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  return getSongs();
}

// --- Settings: rating scale management ---

export async function addRatingEntry(label: string, intervalDays: number): Promise<RatingScaleEntry[]> {
  const { error } = await getSupabaseClient()
    .from('rating_scale')
    .insert({ label: label.trim(), interval_days: intervalDays });
  if (error) throw error;
  return getRatingScale();
}

export async function updateRatingEntry(
  oldLabel: string,
  next: RatingScaleEntry,
): Promise<{ ratingScale: RatingScaleEntry[]; songs: Song[] }> {
  const client = getSupabaseClient();
  const trimmedLabel = next.label.trim();

  const { error: updateError } = await client
    .from('rating_scale')
    .update({ label: trimmedLabel, interval_days: next.intervalDays })
    .eq('label', oldLabel);
  if (updateError) throw updateError;

  if (trimmedLabel !== oldLabel) {
    const { error: cascadeError } = await client
      .from('songs')
      .update({ last_rating_label: trimmedLabel })
      .eq('last_rating_label', oldLabel);
    if (cascadeError) throw cascadeError;
  }

  const [ratingScale, songs] = await Promise.all([getRatingScale(), getSongs()]);
  return { ratingScale, songs };
}

export async function removeRatingEntry(label: string): Promise<RatingScaleEntry[]> {
  const { error } = await getSupabaseClient().from('rating_scale').delete().eq('label', label);
  if (error) throw error;
  return getRatingScale();
}
