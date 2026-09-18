import type { Category, CategoryFilter, FilterState, RatingScaleEntry, Song } from '../types';
import { categoryValues, filterSongs } from '../lib/filtering';
import CategoryPicker from '../components/CategoryPicker';

interface ScatterPickerProps {
  categories: Category[];
  songs: Song[];
  ratingScale: RatingScaleEntry[];
  filters: FilterState;
  includeUntagged: boolean;
  onFilterChange: (categoryId: string, filter: CategoryFilter | undefined) => void;
  onShowResults: () => void;
  onBack: () => void;
}

export default function ScatterPicker({
  categories,
  songs,
  ratingScale,
  filters,
  includeUntagged,
  onFilterChange,
  onShowResults,
  onBack,
}: ScatterPickerProps) {
  const matchCount = filterSongs(songs, filters, categories, includeUntagged).length;

  // Every category cluster is visible and editable at once (unlike Guided
  // Picker's one-step-at-a-time flow) — after each pick, just check whether
  // the combination has already narrowed things down enough to jump ahead.
  function handleFilterChange(categoryId: string, f: CategoryFilter | undefined) {
    onFilterChange(categoryId, f);
    const nextFilters = { ...filters };
    if (f) nextFilters[categoryId] = f;
    else delete nextFilters[categoryId];
    const nextCount = filterSongs(songs, nextFilters, categories, includeUntagged).length;
    if (nextCount < 20) onShowResults();
  }

  return (
    <div className="screen scatter-picker">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        ← Back to results
      </button>

      <div className="picker-header">
        <h2>Scatter Picker</h2>
        <div className="match-count">
          <strong>{matchCount}</strong> song{matchCount === 1 ? '' : 's'} match
        </div>
      </div>
      <p className="modal-subtitle">Tap anything that looks interesting — pick across as many clusters as you like.</p>

      <div className="scatter-grid">
        {categories.map((category) => (
          <section key={category.id} className="scatter-cluster">
            <h3 className="scatter-cluster-title">{category.name}</h3>
            <CategoryPicker
              options={categoryValues(songs, category.id, ratingScale, category.values)}
              filter={filters[category.id]}
              onChange={(f) => handleFilterChange(category.id, f)}
            />
          </section>
        ))}
        {categories.length === 0 && (
          <p className="chip-group-empty">
            No categories are opted into the Scatter Picker yet — turn some on from Settings.
          </p>
        )}
      </div>

      <div className="picker-actions">
        <button type="button" className="btn btn-primary" onClick={onShowResults}>
          Show Results
        </button>
      </div>
    </div>
  );
}
