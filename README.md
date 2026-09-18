# Let's Jam 🎸

A song-leader PWA: browse/filter/sort a song library, get guided to a pick
several ways (step-by-step, straight to genre, or a scatter-style multi-pick
screen), rate songs after playing them, and queue songs up during a show.

Frontend is React + TypeScript + Vite. Backend is Supabase (Postgres +
row-level security, no Supabase Auth — access is a passphrase checked
server-side). This repo is disconnected from the original author's Supabase
project and Vercel deployment — forking it does not give you access to
either. To run your own copy, you need your own Supabase project.

## 1. Create a Supabase project

Free tier is fine. Create one at [supabase.com](https://supabase.com), then
grab two things from **Project Settings → API**:
- Project URL
- `anon` public key

And one more from **Project Settings → API → Project API keys**:
- `service_role` key (secret — only used by the one-off script in
  `scripts/`, never by the deployed app)

## 2. Apply the database schema

Everything — tables, row-level security policies, functions — lives in
`supabase/migrations/`, in order. Easiest path: open your project's
**SQL Editor** in the Supabase dashboard and run each file in this repo's
`supabase/migrations/` folder once, in filename order (they're
timestamp-prefixed, so sorted = chronological):

```
20260915195120_init.sql
20260915200741_tag_rpc.sql
20260915213000_category_registered_values.sql
20260916140000_song_not_applicable_categories.sql
20260916150000_viewer_role.sql
20260918071459_scatter_picker.sql
```

(Or, if you have the Supabase CLI: `npx supabase link --project-ref <ref>`
then `npx supabase db push` from the repo root.)

This creates an initial category/rating-scale set to get started with —
edit, rename, add, or remove categories freely from the app's Settings
screen afterward. It also seeds a placeholder admin passphrase; see step 4.

## 3. Configure the app

```
cp app/.env.example app/.env.local
```

Fill in:
```
VITE_SUPABASE_URL=<your project URL>
VITE_SUPABASE_ANON_KEY=<your anon key>
```

## 4. Set your passphrase(s)

The app is gated by a passphrase (checked server-side via RLS, not
Supabase Auth). The migration seeds a placeholder. In the SQL Editor:

```sql
update app_config set passphrase = 'your-admin-passphrase';
```

There's also an optional read-only viewer passphrase (browse/filter/sort
only, no editing) — defaults to `viewonly`:

```sql
update app_config set viewer_passphrase = 'your-viewer-passphrase';
```

## 5. (Optional) Import starter songs

`song_import.csv` in the repo root has ~600 songs (artist, title, Ultimate
Guitar link) to seed the library with, if you want a starting point instead
of an empty list:

```
cp scripts/.env.example scripts/.env
```

Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from step 1), then:

```
cd scripts
npm install
node import-songs.mjs
```

It refuses to run if the `songs` table isn't empty, so it's safe to skip
if you'd rather add songs from scratch through the app's "Add Song" screen.

## 6. Run it

```
cd app
npm install
npm run dev
```

## 7. (Optional) Deploy

Connect the repo to your own Vercel project, set its **Root Directory** to
`app` (in Project Settings → General — the app lives in a subfolder, not
the repo root), and set the same two `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` env vars there. Vercel auto-detects the Vite
build once the root directory is set.
