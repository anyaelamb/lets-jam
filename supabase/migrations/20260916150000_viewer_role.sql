-- A second, read-only passphrase so the app can be shared with someone who
-- should only browse/filter/sort — never rate, tag, add, delete, or touch
-- Settings. Enforced here at the database level (RLS), not just by hiding
-- buttons client-side, so the restriction holds even if someone bypasses
-- the UI.

alter table app_config add column if not exists viewer_passphrase text;

update app_config set viewer_passphrase = 'viewonly' where viewer_passphrase is null;

create or replace function app_key_can_read() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_config
    where coalesce(current_setting('request.headers', true)::json ->> 'x-app-key', '') in (passphrase, viewer_passphrase)
  );
$$;

create or replace function app_key_can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_config
    where passphrase = coalesce(current_setting('request.headers', true)::json ->> 'x-app-key', '')
  );
$$;

-- Lets the client tell, right after unlocking, which role a passphrase
-- grants — 'admin' | 'viewer' | null (the general categories-empty check
-- already distinguishes "valid key at all" from "wrong key").
create or replace function app_key_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (
      select 1 from app_config
      where passphrase = coalesce(current_setting('request.headers', true)::json ->> 'x-app-key', '')
    ) then 'admin'
    when exists (
      select 1 from app_config
      where viewer_passphrase = coalesce(current_setting('request.headers', true)::json ->> 'x-app-key', '')
    ) then 'viewer'
    else null
  end;
$$;

grant execute on function app_key_can_read() to anon, authenticated;
grant execute on function app_key_can_write() to anon, authenticated;
grant execute on function app_key_role() to anon, authenticated;

-- Split the old single "any valid key does anything" policy into read
-- (either key) vs. write (admin key only). update_song_tag/delete_song_tag
-- are SECURITY INVOKER (the default), so their internal UPDATE still runs
-- as the caller and is subject to these same policies — no separate check
-- needed there.

drop policy if exists "shared key access" on songs;
create policy "read access" on songs for select using (app_key_can_read());
create policy "write access insert" on songs for insert with check (app_key_can_write());
create policy "write access update" on songs for update using (app_key_can_write()) with check (app_key_can_write());
create policy "write access delete" on songs for delete using (app_key_can_write());

drop policy if exists "shared key access" on categories;
create policy "read access" on categories for select using (app_key_can_read());
create policy "write access insert" on categories for insert with check (app_key_can_write());
create policy "write access update" on categories for update using (app_key_can_write()) with check (app_key_can_write());
create policy "write access delete" on categories for delete using (app_key_can_write());

drop policy if exists "shared key access" on rating_scale;
create policy "read access" on rating_scale for select using (app_key_can_read());
create policy "write access insert" on rating_scale for insert with check (app_key_can_write());
create policy "write access update" on rating_scale for update using (app_key_can_write()) with check (app_key_can_write());
create policy "write access delete" on rating_scale for delete using (app_key_can_write());
