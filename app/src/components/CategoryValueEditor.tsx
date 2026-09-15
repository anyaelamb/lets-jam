import type { Category, TagValue } from '../types';
import ChipGroup from './ChipGroup';
import RangeSlider from './RangeSlider';

interface CategoryValueEditorProps {
  category: Category;
  options: string[];
  bounds: [number, number];
  value: TagValue | undefined;
  onChange: (value: TagValue | null) => void;
  onAddValue?: (value: string) => void;
  large?: boolean;
}

// Edit-time picker: respects the category's real type (single-select stays
// single-select), unlike filter-time CategoryPicker which is always
// OR-within-category. Shared by the tag editor and Gap-Fill so both offer
// the same "+ Add new value" affordance from the same code path.
export default function CategoryValueEditor({
  category,
  options,
  bounds,
  value,
  onChange,
  onAddValue,
  large,
}: CategoryValueEditorProps) {
  if (category.type === 'range') {
    return (
      <RangeSlider
        bounds={bounds}
        value={(value as [number, number] | undefined) ?? bounds}
        onChange={(range) => onChange(range)}
      />
    );
  }

  const selected = value == null ? [] : Array.isArray(value) ? (value as string[]) : [value as string];
  return (
    <ChipGroup
      options={options}
      selected={selected}
      singleSelect={category.type === 'single'}
      layout={large ? 'stacked' : 'wrap'}
      onChange={(values) => onChange(values.length === 0 ? null : category.type === 'single' ? values[0] : values)}
      onAddValue={onAddValue}
      emptyLabel="No values yet — add the first one below"
    />
  );
}
