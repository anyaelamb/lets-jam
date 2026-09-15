import type { Category, CategoryFilter } from '../types';
import ChipGroup from './ChipGroup';
import RangeSlider from './RangeSlider';

interface CategoryPickerProps {
  category: Category;
  options: string[];
  bounds: [number, number];
  filter: CategoryFilter | undefined;
  onChange: (filter: CategoryFilter | undefined) => void;
  large?: boolean;
}

// Filter-time picker: always OR-within-category regardless of the
// category's edit-time type (single/multi/range) — see Tag System in the brief.
export default function CategoryPicker({ category, options, bounds, filter, onChange, large }: CategoryPickerProps) {
  if (category.type === 'range') {
    const value = filter?.range ?? bounds;
    return <RangeSlider bounds={bounds} value={value} onChange={(range) => onChange({ range })} />;
  }

  const selected = filter?.values ?? [];
  return (
    <ChipGroup
      options={options}
      selected={selected}
      layout={large ? 'stacked' : 'wrap'}
      onChange={(values) => onChange(values.length ? { values } : undefined)}
    />
  );
}
