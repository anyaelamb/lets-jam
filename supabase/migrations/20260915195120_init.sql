-- Song Leader App — initial schema
-- Mirrors the brief's Data Model: songs (JSONB tags, no schema migration
-- needed per new category), categories, and rating_scale as the three
-- pieces of persistent state. Staleness stays derived, never stored.

create extension if not exists pgcrypto;

-- ── songs ────────────────────────────────────────────────────────────────

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  ultimate_guitar_url text not null default '',
  memorized boolean not null default false,
  last_played_at timestamptz,
  last_rating_label text,
  tags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_tags_gin on songs using gin (tags);
create index if not exists songs_title_artist_idx on songs (lower(title), lower(artist));

create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on songs;
create trigger songs_set_updated_at
  before update on songs
  for each row execute function set_updated_at();

-- ── categories ───────────────────────────────────────────────────────────
-- id matches the app's string ids (e.g. 'tempo_feel'); sort_order is the
-- priority list the user reorders in Settings, which also drives the
-- Guided Picker sequence.

create table if not exists categories (
  id text primary key,
  name text not null,
  type text not null check (type in ('single', 'multi', 'range')),
  computed boolean not null default false,
  guided_picker_enabled boolean not null default true,
  sort_order integer not null
);

-- ── rating_scale ─────────────────────────────────────────────────────────

create table if not exists rating_scale (
  label text primary key,
  interval_days integer not null
);

-- ── seed: starting categories + rating scale (matches current fixtures) ──

insert into categories (id, name, type, computed, guided_picker_enabled, sort_order) values
  ('tempo_feel', 'Tempo / Energy Feel', 'multi', false, true, 0),
  ('mood', 'Mood', 'single', false, true, 1),
  ('memorized', 'Memorized', 'single', true, true, 2),
  ('performance_confidence', 'Performance Confidence', 'single', true, true, 3),
  ('memorization_confidence', 'Memorization Confidence', 'single', true, true, 4),
  ('genre', 'Genre', 'single', false, true, 5),
  ('age_range', 'Age Range', 'multi', false, true, 6)
on conflict (id) do nothing;

insert into rating_scale (label, interval_days) values
  ('Great', 28),
  ('Good', 14),
  ('Passable', 7),
  ('Learning', 1)
on conflict (label) do nothing;

-- ── access control ───────────────────────────────────────────────────────
-- No Supabase Auth — the brief calls for a passphrase gate on the client
-- plus DB access "scoped (e.g. a fixed key/RLS rule) so the API isn't wide
-- open even if someone finds the URL." The client sends the same passphrase
-- the user typed as an `x-app-key` header on every request; RLS checks it
-- against app_config via a SECURITY DEFINER function so the anon/public key
-- alone (visible in the client bundle) isn't sufficient on its own.

create table if not exists app_config (
  id boolean primary key default true check (id),
  passphrase text not null
);

insert into app_config (id, passphrase)
values (true, 'change-me-before-launch')
on conflict (id) do nothing;

revoke all on app_config from anon, authenticated;

create or replace function app_key_valid() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_config
    where passphrase = coalesce(current_setting('request.headers', true)::json ->> 'x-app-key', '')
  );
$$;

grant execute on function app_key_valid() to anon, authenticated;

alter table songs enable row level security;
alter table categories enable row level security;
alter table rating_scale enable row level security;

drop policy if exists "shared key access" on songs;
create policy "shared key access" on songs
  for all using (app_key_valid()) with check (app_key_valid());

drop policy if exists "shared key access" on categories;
create policy "shared key access" on categories
  for all using (app_key_valid()) with check (app_key_valid());

drop policy if exists "shared key access" on rating_scale;
create policy "shared key access" on rating_scale
  for all using (app_key_valid()) with check (app_key_valid());
