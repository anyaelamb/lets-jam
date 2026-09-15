import type { Category, CategoryFilter, FilterState, RatingScaleEntry, Song } from '../types';
import { categoryBounds, categoryValues, filterSongs } from '../lib/filtering';
import CategoryPicker from '../components/CategoryPicker';

interface GuidedPickerProps {
  categories: Category[];
  songs: Song[];
  ratingScale: RatingScaleEntry[];
  filters: FilterState;
  includeUntagged: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onFilterChange: (categoryId: string, filter: CategoryFilter | undefined) => void;
  onShowResults: () => void;
}

export default function GuidedPicker({
  categories,
  songs,
  ratingScale,
  filters,
  includeUntagged,
  step,
  onStepChange,
  onFilterChange,
  onShowResults,
}: GuidedPickerProps) {
  const category = categories[step];
  const isLast = step === categories.length - 1;
  const matchCount = filterSongs(songs, filters, categories, includeUntagged).length;

  if (!category) return null;

  const options = categoryValues(songs, category.id, ratingScale, category.values);
  const bounds = categoryBounds(songs, category.id);

  return (
    <div className="screen picker">
      <div className="picker-header">
        <span className="picker-progress">
          Step {step + 1} of {categories.length}
        </span>
        <div className="match-count">
          <strong>{matchCount}</strong> song{matchCount === 1 ? '' : 's'} match
        </div>
      </div>

      <h2 className="picker-category-name">{category.name}</h2>

      <div className="picker-control">
        <CategoryPicker
          category={category}
          options={options}
          bounds={bounds}
          filter={filters[category.id]}
          onChange={(f) => onFilterChange(category.id, f)}
          large
        />
      </div>

      <div className="picker-actions">
        {step > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => onStepChange(step - 1)}>
            Back
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (isLast ? onShowResults() : onStepChange(step + 1))}
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onShowResults}>
          Show Results
        </button>
      </div>
    </div>
  );
}
