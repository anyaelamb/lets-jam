import type { Category, CategoryFilter, FilterState, RatingScaleEntry, Song } from '../types';
import { categoryBounds, categoryValues } from '../lib/filtering';
import CategoryPicker from '../components/CategoryPicker';

interface FiltersPanelProps {
  categories: Category[];
  songs: Song[];
  ratingScale: RatingScaleEntry[];
  filters: FilterState;
  includeUntagged: boolean;
  matchCount: number;
  onFilterChange: (categoryId: string, filter: CategoryFilter | undefined) => void;
  onIncludeUntaggedChange: (value: boolean) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export default function FiltersPanel({
  categories,
  songs,
  ratingScale,
  filters,
  includeUntagged,
  matchCount,
  onFilterChange,
  onIncludeUntaggedChange,
  onClearAll,
  onClose,
}: FiltersPanelProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Filters</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal-body">
          <label className="include-untagged-toggle">
            <input
              type="checkbox"
              checked={includeUntagged}
              onChange={(e) => onIncludeUntaggedChange(e.target.checked)}
            />
            <span>
              Include untagged songs
              <small>Show songs missing a value in a selected category, as long as nothing contradicts it.</small>
            </span>
          </label>

          {categories.map((category) => (
            <section key={category.id} className="tag-editor-row">
              <h3>{category.name}</h3>
              <CategoryPicker
                category={category}
                options={categoryValues(songs, category.id, ratingScale, category.values)}
                bounds={categoryBounds(songs, category.id)}
                filter={filters[category.id]}
                onChange={(f) => onFilterChange(category.id, f)}
              />
            </section>
          ))}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClearAll}>
            Clear all filters
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Show {matchCount} song{matchCount === 1 ? '' : 's'}
          </button>
        </footer>
      </div>
    </div>
  );
}
