-- Atomic JSONB tag writes. A plain "fetch tags, merge client-side, write the
-- whole column back" risks clobbering a concurrent edit from another device
-- (the brief calls for two-device sync) — these do the merge/delete inside
-- the UPDATE itself, so two simultaneous writes to different keys on the
-- same song never race.

create or replace function update_song_tag(p_song_id uuid, p_category_id text, p_value jsonb)
returns songs
language sql
as $$
  update songs
  set tags = tags || jsonb_build_object(p_category_id, p_value)
  where id = p_song_id
  returning *;
$$;

create or replace function delete_song_tag(p_song_id uuid, p_category_id text)
returns songs
language sql
as $$
  update songs
  set tags = tags - p_category_id
  where id = p_song_id
  returning *;
$$;

grant execute on function update_song_tag(uuid, text, jsonb) to anon, authenticated;
grant execute on function delete_song_tag(uuid, text) to anon, authenticated;
