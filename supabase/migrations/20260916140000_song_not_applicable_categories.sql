-- A song's tag being blank has always meant "not yet decided" — Gap-Fill
-- treats every blank as something still owed an answer. There's no way to
-- record "I looked at this and it genuinely doesn't fit this category"
-- without writing a real value, which would then behave like any other
-- value in Filters (excluded unless explicitly included). This column lets
-- a song opt out of a category's Gap-Fill queue while its tag stays
-- genuinely blank for filtering purposes — nothing in songMatchesFilters
-- or categoryValues needs to change.
alter table songs add column not_applicable_categories jsonb not null default '[]'::jsonb;
