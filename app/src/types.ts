export type CategoryType = 'single' | 'multi' | 'range';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  // Derived at read time (like Staleness) rather than manually tagged —
  // excluded from the tag editor, but filterable/sortable like any category.
  computed?: boolean;
  // Whether this category gets its own Guided Picker step. Defaults to true
  // when unset — still usable in Filters/Sort either way.
  guidedPickerEnabled?: boolean;
}

export type TagValue = string | string[] | [number, number];

export interface RatingScaleEntry {
  label: string;
  intervalDays: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  ultimateGuitarUrl: string;
  memorized: boolean;
  lastPlayedAt: string | null;
  lastRatingLabel: string | null;
  tags: Record<string, TagValue>;
}

export interface CategoryFilter {
  values?: string[];
  range?: [number, number];
}

export type FilterState = Record<string, CategoryFilter>;

export interface SortCriterion {
  key: string;
  direction: 'asc' | 'desc';
}
