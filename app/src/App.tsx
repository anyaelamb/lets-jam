import { useEffect, useMemo, useState } from 'react';
import type {
  Category,
  CategoryFilter,
  CategoryType,
  FilterState,
  RatingScaleEntry,
  Song,
  SortCriterion,
  TagValue,
} from './types';
import {
  addCategory,
  addRatingEntry,
  deleteCategoryValue,
  getCategories,
  getRatingScale,
  getSongs,
  rateSong,
  removeRatingEntry,
  renameCategory,
  renameCategoryValue,
  reorderCategories,
  retireCategory,
  setCategoryGuidedPickerEnabled,
  setMemorized,
  updateRatingEntry,
  updateSongTag,
  updateSongUrl,
} from './data/store';
import { initSupabaseClient } from './data/supabaseClient';
import { filterSongs, sortSongs } from './lib/filtering';
import { buildGapFillQueue, gapFillAt, gapFillTotal, type GapFillMode, type GapFillQueue } from './lib/gapfill';
import Splash from './screens/Splash';
import PassphraseGate from './screens/PassphraseGate';
import GuidedPicker from './screens/GuidedPicker';
import Results from './screens/Results';
import FiltersPanel from './screens/FiltersPanel';
import SortPanel from './screens/SortPanel';
import Assessment from './screens/Assessment';
import GapFill from './screens/GapFill';
import Settings from './screens/Settings';
import SongTagEditor from './components/SongTagEditor';
import './App.css';

type Screen =
  | 'loading'
  | 'passphrase'
  | 'splash'
  | 'picker'
  | 'results'
  | 'assessment'
  | 'gapfill'
  | 'settings';

const IDLE_MS = 60 * 60 * 1000;
const LAST_ACTIVE_KEY = 'songapp:lastActiveAt';

// RLS enforces this server-side (see the migration) — this is just the
// client-side "don't ask again for a while" convenience the brief calls for.
const PASSPHRASE_KEY = 'songapp:passphrase';
const PASSPHRASE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function shouldResume(): boolean {
  try {
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    return !!lastActive && Date.now() - Number(lastActive) < IDLE_MS;
  } catch {
    return false;
  }
}

function markActive() {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable — resume-detection just degrades to "always splash"
  }
}

function loadStoredPassphrase(): string | null {
  try {
    const raw = localStorage.getItem(PASSPHRASE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: string; setAt: number };
    if (Date.now() - parsed.setAt > PASSPHRASE_TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function storePassphrase(value: string) {
  try {
    localStorage.setItem(PASSPHRASE_KEY, JSON.stringify({ value, setAt: Date.now() }));
  } catch {
    // localStorage unavailable — the gate just shows again next load
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [categories, setCategories] = useState<Category[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [ratingScale, setRatingScale] = useState<RatingScaleEntry[]>([]);

  const [filters, setFilters] = useState<FilterState>({});
  const [includeUntagged, setIncludeUntagged] = useState(false);
  const [showStaleness, setShowStaleness] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>([{ key: 'staleness', direction: 'desc' }]);
  const [pickerStep, setPickerStep] = useState(0);

  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [tagEditorSongId, setTagEditorSongId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const [gapFillQueue, setGapFillQueue] = useState<GapFillQueue | null>(null);
  const [gapFillIndex, setGapFillIndex] = useState(0);
  const [gapFillMode, setGapFillMode] = useState<GapFillMode>('gaps');

  // Captured once at first render, before any effect can mark the session
  // active — otherwise StrictMode's double-invoked mount effect would see
  // the timestamp its own first run just wrote and always "resume".
  const [initialResume] = useState(shouldResume);
  const [initialPassphrase] = useState(loadStoredPassphrase);

  async function loadAppData() {
    const [s, c, r] = await Promise.all([getSongs(), getCategories(), getRatingScale()]);
    setSongs(s);
    setCategories(c);
    setRatingScale(r);
    setScreen(initialResume ? 'results' : 'splash');
    markActive();
  }

  useEffect(() => {
    if (initialPassphrase) {
      initSupabaseClient(initialPassphrase);
      loadAppData();
    } else {
      setScreen('passphrase');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPassphrase]);

  // A wrong passphrase isn't rejected with an error — RLS just filters every
  // row to nothing — so "did this work" is judged by whether categories (a
  // table that's never legitimately empty) actually came back.
  async function handlePassphraseSubmit(passphrase: string): Promise<boolean> {
    initSupabaseClient(passphrase);
    try {
      const categoriesCheck = await getCategories();
      if (categoriesCheck.length === 0) return false;
    } catch {
      return false;
    }
    storePassphrase(passphrase);
    await loadAppData();
    return true;
  }

  useEffect(() => {
    const interval = setInterval(markActive, 30_000);
    return () => clearInterval(interval);
  }, []);

  function goScreen(next: Screen) {
    markActive();
    setScreen(next);
  }

  const filteredSongs = useMemo(
    () => filterSongs(songs, filters, categories, includeUntagged),
    [songs, filters, categories, includeUntagged],
  );
  const sortedSongs = useMemo(
    () => sortSongs(filteredSongs, sortCriteria, ratingScale),
    [filteredSongs, sortCriteria, ratingScale],
  );

  const activeSong = songs.find((s) => s.id === activeSongId) ?? null;
  const tagEditorSong = songs.find((s) => s.id === tagEditorSongId) ?? null;

  const gapFillCategory = gapFillQueue ? (categories.find((c) => c.id === gapFillQueue.categoryId) ?? null) : null;
  const gapFillPosition = gapFillQueue
    ? gapFillAt(gapFillQueue, gapFillIndex)
    : { songId: null, phase: 'fill' as const, segmentLabel: '' };
  const gapFillSong = gapFillPosition.songId ? (songs.find((s) => s.id === gapFillPosition.songId) ?? null) : null;
  const gapFillQueueTotal = gapFillQueue ? gapFillTotal(gapFillQueue) : 0;

  const guidedPickerCategories = categories.filter((c) => c.guidedPickerEnabled !== false);

  function applySongUpdate(updated: Song) {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function startGuidedPicker() {
    setFilters({});
    setShowStaleness(false);
    setPickerStep(0);
    goScreen('picker');
  }

  function showAllSongs() {
    setFilters({});
    setShowStaleness(false);
    goScreen('results');
  }

  function handleFilterChange(categoryId: string, filter: CategoryFilter | undefined) {
    setFilters((prev) => {
      const next = { ...prev };
      if (filter) next[categoryId] = filter;
      else delete next[categoryId];
      return next;
    });
  }

  function handleClearFilters() {
    setFilters({});
    setShowStaleness(false);
  }

  // Staleness only applies to memorized songs, so showing it means showing
  // only memorized songs — this couples the toggle to the Memorized filter
  // in both directions rather than leaving them silently out of sync.
  function handleToggleStaleness(next: boolean) {
    setShowStaleness(next);
    setFilters((prev) => {
      const nextFilters = { ...prev };
      if (next) nextFilters.memorized = { values: ['Memorized'] };
      else delete nextFilters.memorized;
      return nextFilters;
    });
  }

  function handleSelectSong(song: Song) {
    window.open(song.ultimateGuitarUrl, '_blank', 'noopener');
    setActiveSongId(song.id);
    goScreen('assessment');
  }

  async function handleRate(label: string) {
    if (!activeSong) return;
    const updated = await rateSong(activeSong.id, label);
    applySongUpdate(updated);
    goScreen('results');
  }

  function handleSkipAssessment() {
    goScreen('results');
  }

  async function handleToggleMemorized(memorized: boolean) {
    if (!activeSong) return;
    const updated = await setMemorized(activeSong.id, memorized);
    applySongUpdate(updated);
  }

  async function handleUpdateTag(songId: string, categoryId: string, value: TagValue | null) {
    const updated = await updateSongTag(songId, categoryId, value);
    applySongUpdate(updated);
  }

  async function handleUpdateUrl(songId: string, url: string) {
    const updated = await updateSongUrl(songId, url);
    applySongUpdate(updated);
  }

  function startGapFill(categoryId: string) {
    setGapFillMode('gaps');
    setGapFillQueue(buildGapFillQueue(songs, categoryId, 'gaps'));
    setGapFillIndex(0);
    goScreen('gapfill');
  }

  function handleGapFillModeChange(mode: GapFillMode) {
    if (!gapFillQueue) return;
    setGapFillMode(mode);
    setGapFillQueue(buildGapFillQueue(songs, gapFillQueue.categoryId, mode));
    setGapFillIndex(0);
  }

  async function handleGapFillCommit(value: TagValue | null) {
    if (!gapFillQueue || !gapFillSong) return;
    // "Memorized" is backed by the real memorized boolean, not a raw tag —
    // withComputedTags regenerates tags.memorized from it on every read, so
    // writing through updateSongTag would just get silently overwritten.
    const updated =
      gapFillQueue.categoryId === 'memorized'
        ? await setMemorized(gapFillSong.id, value === 'Memorized')
        : await updateSongTag(gapFillSong.id, gapFillQueue.categoryId, value);
    applySongUpdate(updated);
    setGapFillIndex((i) => i + 1);
  }

  function handleGapFillSkip() {
    setGapFillIndex((i) => i + 1);
  }

  function handleGapFillBack() {
    setGapFillIndex((i) => Math.max(0, i - 1));
  }

  function handleGapFillExit() {
    setGapFillQueue(null);
    setGapFillIndex(0);
    setGapFillMode('gaps');
    goScreen('settings');
  }

  async function handleAddCategory(name: string, type: CategoryType) {
    const updated = await addCategory(name, type);
    setCategories(updated);
  }

  async function handleRenameCategory(id: string, name: string) {
    const updated = await renameCategory(id, name);
    setCategories(updated);
  }

  async function handleRetireCategory(id: string) {
    const updated = await retireCategory(id);
    setCategories(updated);
  }

  async function handleReorderCategories(orderedIds: string[]) {
    const updated = await reorderCategories(orderedIds);
    setCategories(updated);
  }

  async function handleToggleGuidedPicker(id: string, enabled: boolean) {
    const updated = await setCategoryGuidedPickerEnabled(id, enabled);
    setCategories(updated);
  }

  async function handleRenameValue(categoryId: string, oldValue: string, newValue: string) {
    const updated = await renameCategoryValue(categoryId, oldValue, newValue);
    setSongs(updated);
  }

  async function handleDeleteValue(categoryId: string, value: string) {
    const updated = await deleteCategoryValue(categoryId, value);
    setSongs(updated);
  }

  async function handleAddRating(label: string, intervalDays: number) {
    const updated = await addRatingEntry(label, intervalDays);
    setRatingScale(updated);
  }

  async function handleUpdateRating(oldLabel: string, next: RatingScaleEntry) {
    const result = await updateRatingEntry(oldLabel, next);
    setRatingScale(result.ratingScale);
    setSongs(result.songs);
  }

  async function handleRemoveRating(label: string) {
    const updated = await removeRatingEntry(label);
    setRatingScale(updated);
  }

  if (screen === 'loading') {
    return <div className="screen loading">Loading your library…</div>;
  }

  return (
    <div className="app">
      {screen === 'passphrase' && <PassphraseGate onSubmit={handlePassphraseSubmit} />}

      {screen === 'splash' && <Splash onFindSong={startGuidedPicker} onShowAll={showAllSongs} />}

      {screen === 'picker' && (
        <GuidedPicker
          categories={guidedPickerCategories}
          songs={songs}
          ratingScale={ratingScale}
          filters={filters}
          includeUntagged={includeUntagged}
          step={pickerStep}
          onStepChange={setPickerStep}
          onFilterChange={handleFilterChange}
          onShowResults={() => goScreen('results')}
        />
      )}

      {screen === 'results' && (
        <Results
          songs={sortedSongs}
          totalCount={songs.length}
          ratingScale={ratingScale}
          showStaleness={showStaleness}
          onToggleStaleness={handleToggleStaleness}
          onOpenFilters={() => setShowFilters(true)}
          onOpenSort={() => setShowSort(true)}
          onOpenSettings={() => goScreen('settings')}
          onStartOver={startGuidedPicker}
          onSelectSong={handleSelectSong}
          onOpenTagEditor={(song) => setTagEditorSongId(song.id)}
        />
      )}

      {screen === 'settings' && (
        <Settings
          categories={categories}
          songs={songs}
          ratingScale={ratingScale}
          onBack={() => goScreen('results')}
          onAddCategory={handleAddCategory}
          onRenameCategory={handleRenameCategory}
          onRetireCategory={handleRetireCategory}
          onReorderCategories={handleReorderCategories}
          onToggleGuidedPicker={handleToggleGuidedPicker}
          onRenameValue={handleRenameValue}
          onDeleteValue={handleDeleteValue}
          onStartGapFill={startGapFill}
          onAddRating={handleAddRating}
          onUpdateRating={handleUpdateRating}
          onRemoveRating={handleRemoveRating}
          onSelectSong={handleSelectSong}
        />
      )}

      {screen === 'gapfill' && gapFillCategory && (
        <GapFill
          key={gapFillSong?.id ?? 'gapfill-done'}
          category={gapFillCategory}
          song={gapFillSong}
          allSongs={songs}
          phase={gapFillPosition.phase}
          segmentLabel={gapFillPosition.segmentLabel}
          mode={gapFillMode}
          onModeChange={handleGapFillModeChange}
          current={gapFillIndex + 1}
          total={gapFillQueueTotal}
          canGoBack={gapFillIndex > 0}
          onCommit={handleGapFillCommit}
          onSkip={handleGapFillSkip}
          onBack={handleGapFillBack}
          onExit={handleGapFillExit}
        />
      )}

      {screen === 'assessment' && activeSong && (
        <Assessment
          song={activeSong}
          ratingScale={ratingScale}
          onRate={handleRate}
          onToggleMemorized={handleToggleMemorized}
          onSkip={handleSkipAssessment}
          onRetag={(song) => setTagEditorSongId(song.id)}
          onBack={() => goScreen('results')}
        />
      )}

      {showFilters && (
        <FiltersPanel
          categories={categories}
          songs={songs}
          ratingScale={ratingScale}
          filters={filters}
          includeUntagged={includeUntagged}
          matchCount={filteredSongs.length}
          onFilterChange={handleFilterChange}
          onIncludeUntaggedChange={setIncludeUntagged}
          onClearAll={handleClearFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {showSort && (
        <SortPanel
          categories={categories}
          criteria={sortCriteria}
          onChange={setSortCriteria}
          onClose={() => setShowSort(false)}
        />
      )}

      {tagEditorSong && (
        <SongTagEditor
          key={tagEditorSong.id}
          song={tagEditorSong}
          categories={categories}
          allSongs={songs}
          onClose={() => setTagEditorSongId(null)}
          onUpdateTag={(categoryId, value) => handleUpdateTag(tagEditorSong.id, categoryId, value)}
          onUpdateUrl={(url) => handleUpdateUrl(tagEditorSong.id, url)}
        />
      )}
    </div>
  );
}
