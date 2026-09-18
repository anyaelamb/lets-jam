-- Opt-in flag for the new Scatter Picker screen, separate from
-- guided_picker_enabled — a category can appear in one, both, or neither.
-- Defaults to false (opt-in) so the screen doesn't start out crowded with
-- every existing category's cluster.
alter table categories add column if not exists scatter_picker_enabled boolean not null default false;
