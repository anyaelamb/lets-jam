import type { TagValue } from '../types';
import ChipGroup from './ChipGroup';

interface CategoryValueEditorProps {
  options: string[];
  value: TagValue | undefined;
  onChange: (value: TagValue | null) => void;
  onAddValue?: (value: string) => void;
  large?: boolean;
}

// Edit-time picker: every category is single-select, unlike filter-time
// CategoryPicker which is always OR-within-category. Shared by the tag
// editor, Add Song, and Gap-Fill so all three offer the same "+ Add new
// value" affordance from the same code path.
export default function CategoryValueEditor({
  options,
  value,
  onChange,
  onAddValue,
  large,
}: CategoryValueEditorProps) {
  const selected = value == null ? [] : [value];
  return (
    <ChipGroup
      options={options}
      selected={selected}
      singleSelect
      layout={large ? 'stacked' : 'wrap'}
      onChange={(values) => onChange(values.length === 0 ? null : values[0])}
      onAddValue={onAddValue}
      emptyLabel="No values yet — add the first one below"
    />
  );
}
