-- A category's selectable values were purely derived from what songs
-- currently carry in their tags — fine for "vocabulary emerges from use",
-- but it meant there was no way to pre-register a value (e.g. the Age Range
-- buckets, or anything typed from the Settings "Values" screen) before any
-- song actually used it. This adds a small explicit registry per category
-- that the app merges with the derived-from-usage list.
alter table categories add column values jsonb not null default '[]'::jsonb;

update categories
set values = '["Kiddos", "Gen Alpha", "Millennials", "GenX Plus"]'::jsonb
where id = 'age_range';
