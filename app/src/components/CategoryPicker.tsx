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
  // Filters (Results screen) stays OR-within-category per the brief — this
  // is only for Guided Picker, which restricts each step to one value at a
  // time; multi-select filtering is still reachable via Filters.
  singleSelect?: boolean;
}

export default function CategoryPicker({
  category,
  options,
  bounds,
  filter,
  onChange,
  large,
  singleSelect,
}: CategoryPickerProps) {
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
      singleSelect={singleSelect}
      onChange={(values) => onChange(values.length ? { values } : undefined)}
    />
  );
}
