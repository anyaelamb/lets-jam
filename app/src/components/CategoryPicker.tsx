import type { CategoryFilter } from '../types';
import ChipGroup from './ChipGroup';

interface CategoryPickerProps {
  options: string[];
  filter: CategoryFilter | undefined;
  onChange: (filter: CategoryFilter | undefined) => void;
  large?: boolean;
  // Filters (Results screen) stays OR-within-category per the brief — this
  // is only for Guided Picker, which restricts each step to one value at a
  // time; multi-select filtering is still reachable via Filters.
  singleSelect?: boolean;
}

export default function CategoryPicker({ options, filter, onChange, large, singleSelect }: CategoryPickerProps) {
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
