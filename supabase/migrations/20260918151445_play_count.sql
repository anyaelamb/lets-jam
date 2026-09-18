-- Tracks how many times a song has been rated (Assessment, the Tag Editor's
-- rating chips, or Gap-Fill establishing Performance Confidence — all three
-- already treat "rated" as the same act of playing the song). Incrementing
-- lives in the RPC itself rather than the client so it's atomic regardless
-- of which of those call sites triggers it, and safe under concurrent calls.
alter table songs add column if not exists play_count integer not null default 0;

create or replace function rate_song(p_song_id uuid, p_rating_label text)
returns songs
language sql
as $$
  update songs
  set last_played_at = now(), last_rating_label = p_rating_label, play_count = play_count + 1
  where id = p_song_id
  returning *;
$$;

grant execute on function rate_song(uuid, text) to anon, authenticated;
