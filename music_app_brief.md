# Song Leader App — Technical Brief

## Purpose

A tool to support live song-leading and repertoire memory. At its core, this is **one filtering/tagging engine** applied to a personal song library. The same filter mechanism serves two use cases:

- **Live picker**: filter by mood/energy/audience tags to find the next right song fast
- **Repertoire maintenance**: sort by staleness (time since last played) to see what needs attention

There is no separate "practice mode" or "show mode" as distinct app states — it's the same song list, with filter and sort controls, used differently depending on what the user needs in the moment.

## Platform & Architecture

- **PWA (Progressive Web App)**, installable to home screen, works on phone/tablet/laptop
- **Local-first storage**: all core functions (browse, filter, view song, assessment) work with zero connection — since network availability shouldn't determine whether the app is usable
- **Backend**: Supabase (Postgres) — hosted DB, auto-sync across devices, no custom server to maintain
- **Sync**: automatic whenever online, no manual "sync now" step
- **Two-device support**: same data synced across phone + tablet (or any device), no per-device silos

## Access Control

- No user accounts / login system
- Simple **passphrase gate** on first visit
- Passphrase persists in local storage for **30 days**, then re-prompts
- Underlying Supabase access should still be scoped (e.g. a fixed key/RLS rule) so the API isn't wide open even if someone finds the URL — but no user-facing auth flow beyond the passphrase

## Data Model

### Song

- `title` (string)
- `artist` (string)

  **Spotify integration was dropped (decided 2026-09-15).** The original plan pulled Spotify metadata at add-time via the Web API. By the time this was revisited, Spotify's Nov 2024 and Feb 2026 API changes had stripped it down to almost nothing useful: `audio-features`/`audio-analysis` (tempo, energy, danceability, valence) are gone for any app created after Nov 27, 2024 with no path back; `popularity`, `available_markets`, and `external_ids` (which carried ISRC) were all removed from the track object in Feb 2026. What would've been left — title, artist, album, release date, duration, explicit flag — doesn't add anything `song_import.csv` doesn't already give us, and doesn't justify the Client Credentials Flow, a token-exchange backend, or the mashup/medley/placeholder-artist matching problem described below. `title`/`artist` are entered directly (from the CSV at import time, or typed in the Add Song flow) rather than autofilled from a match.
- `ultimate_guitar_url` (external link to chords/lyrics — the single source of truth for playing the song)
- `tags` (map of category → value(s); see Tag System below)

  This is a single field holding one entry per category — not a fixed set of columns. Each category the user has created (see Tag System) becomes a key; the value shape depends on that category's type (single value, list of values, or a range). A song that hasn't been tagged in a given category simply has no key for it yet (this is the "gap" state Gap-Fill mode targets), rather than requiring a schema migration when a new category is added.

  **Implementation note:** store this as a JSONB column in Postgres (Supabase), not as one database column per tag category. Adding a new category costs nothing at the database level — no existing rows are touched, since a song simply lacks that key until it's tagged. A column-per-category design would require a schema migration (`ALTER TABLE`) every time the user invents a new category, which conflicts directly with the "no code change needed" requirement. At this library's scale (~600 songs), query performance is a non-issue either way — this is purely an architectural-flexibility decision, not a performance one. Example:

  ```json
  {
    "title": "Wagon Wheel",
    "artist": "Old Crow Medicine Show",
    "tags": {
      "genre": "country",
      "tempo_feel": ["upbeat", "anthem"],
      "age_range": [25, 60],
      "mood": "kumbaya"
    }
  }
  ```

- `memorized` (boolean, manually toggled by user)
- `last_played_at` (timestamp, updated by the assessment screen)
- `staleness_interval` (derived from most recent rating — see Staleness below)

### Search result display

Search/filter results show **only title and artist** as a tappable row:
- **Tapping the row does two things at once**: navigates to the Assessment screen (Screen 6) for that song, **and** opens its `ultimate_guitar_url` (in a new tab/window, since this is a PWA — the app itself stays open on the Assessment screen underneath). The intent is that the user plays the song from the Ultimate Guitar tab, then switches back to the app — which is already sitting on the Assessment screen, ready for them to rate it — rather than having to navigate there separately after playing
- A three-dot overflow menu opens the full tag view/edit for that song
- No other metadata is shown in the list — speed over completeness

## Tag System

Tags are organized into **categories**, and the category list itself is user-extensible (no code change needed to add a new one).

Each category has a **type**:
- **Single-select** (edit-time): song has exactly one value, e.g. Genre
- **Multi-select** (edit-time): song can have several values, e.g. Tempo-feel (a song can be led at different energy levels)
- **Range**: e.g. Age range

New categories and their types are created in Settings (see Screen 7 below). **New values within an existing category can be added inline, on the fly, from any tagging screen** — Gap-Fill, the Add-Song walkthrough, and the three-dot tag editor all support a "+ Add new value" option alongside the existing choices. A value typed in this way is immediately available everywhere else (other songs' tag pickers, Settings' value list, filter screens) — there's no separate step required to "register" it first. This matches the intent that the tag vocabulary should emerge naturally through use, not require stopping to configure things upfront.

Starting categories (expect more to be added over time as they're discovered in use):
- Age range (range)
- Tempo/energy feel (multi-select)
- Genre (single-select)
- Mood (single-select) — e.g. anthem, groovy, kumbaya

**Filtering behavior is independent of edit-time type.** At filter time, you can always select multiple values within a single category (OR within category) and combine across categories (AND across categories) — regardless of whether that category is single- or multi-select for editing purposes. Example: Tempo is single-select when tagging a song, but at filter time you can select "Slow" OR "Moody" OR "Sad Boi" simultaneously.

**Category priority order** is manually set by the user in a Settings screen (not auto-calculated). This order drives the sequence of the guided step-by-step filter screen (see below).

## Core Screens

### 1. Splash / Home Screen (conditional cold-open)

If the app has been closed/backgrounded for **more than an hour**, opening it lands on a playful splash screen rather than dropping straight into the last view:

- Title/tagline: **"Let's Jam"** (or similar — playful, not corporate)
- Primary button: **"Find the perfect song"** → launches the Guided Picker (Screen 2)
- Smaller, secondary button: **"Show All Songs"** — jumps straight to the Results screen (Screen 3) with **no filters applied** — i.e. the full unfiltered song list, for when the user just wants to browse or already knows what they want without going through the guided flow

If the app was used within the last hour, it should resume wherever the user left off rather than showing the splash again — the splash is specifically a "welcome back" moment for a fresh session, not something shown on every open.

### 2. Guided Picker

Works like a multiple-choice survey, one question per screen:

- Shows **one tag category at a time**, in the user-defined priority order (see Settings)
- Displays the category's options in a way appropriate to its type:
  - **Single-select / multi-select categories**: all available values shown as selectable option chips (not a free-text field) — matching the category's edit-time type doesn't matter for filtering itself, since filtering is always OR-within-category / AND-across-category regardless (see Tag System)
  - **Range categories**: a **double-ended (dual-handle) slider**, defaulting to the full min–max range currently present across the song database for that category (e.g. if songs are tagged Age Range anywhere from 5 to 70, the slider defaults spanning 5–70, not pre-narrowed). The user can drag either handle to narrow the range, or type exact numbers into two accompanying input fields — typing a number moves the corresponding slider handle to match, and dragging a handle updates the number field to match. Both are just two ways of setting the same two values
- A **live "matching song count"** is visible on screen at all times, updating immediately as the user selects/deselects values — so the user always knows how many songs are left before deciding whether to keep narrowing
- Two actions are always available: **"Next"** (move to the next category in priority order, keeping the current selections) and **"Show Results"** (stop narrowing now and jump straight to the Results screen, from wherever the user currently is in the sequence)
- The user can also skip a category entirely (no selection) and hit Next, if that category isn't relevant to what they're looking for right now
- Finishing the sequence (or hitting "Show Results" early) always lands on the Results screen (Screen 3), carrying forward whatever filters were selected so far

### 3. Results Screen

This is the single song-list screen — it's what the Guided Picker feeds into, and it's also reachable directly (unfiltered) from the splash screen's secondary button. There's only one list screen in the app; it just arrives with different filters/sort already applied depending on how the user got there.

- The song list itself: see "Search result display" above — title/artist rows, each tap opening both the Assessment screen and the Ultimate Guitar link, plus a three-dot menu for tag edit
- **Three controls at the top of the screen:**
  - **Filters** — opens the exhaustive filter view: every category directly accessible at once (not the guided one-at-a-time flow), so the user can jump to any category and adjust freely. This replaces what was earlier called "Free Filter/Browse" — it's not a separate screen, it's an overlay/panel reachable from here.

    **Include-untagged toggle:** a single global toggle within the Filters view controls how songs with a blank value in a *currently selected* filter category are treated — this is a filter-behavior setting, not song data. **Off (default):** strict matching — a song must have an explicit matching value in every selected category to appear in results; a blank in any selected category excludes the song. **On:** a song that matches on every category where it *does* have a value, but is blank in one or more of the selected categories, is still included — missing data doesn't disqualify it, only an actual mismatched value does. Example: filtering on Genre=Country and Mood=Anthem, with the toggle on, a song tagged Genre=Country but with no Mood value yet would still show up (since it doesn't contradict the Mood filter, it's just untagged there); with the toggle off, it would be excluded
  - **Sort** — opens sort options, supporting **multiple stacked sort criteria** (e.g. primary sort by staleness, secondary sort by age range) rather than a single sort field at a time. Staleness (most-overdue-first) is the most important sort option to support well.
  - **Start Over** — returns to the Guided Picker from the beginning, discarding current filters, for when the user wants to re-narrow from scratch rather than adjust what's already selected

### 4. Gap-Fill Mode

- Pick a tag category (typically one just added)
- App queues every song **missing** a value for that category first, shown one at a time with just that category's picker
- User picks a value, app auto-advances to the next untagged song
- A **Skip button** is available on every song — leaves that song's value for this category untouched (still a gap) and moves to the next song, for when the user doesn't want to decide right now
- **Once every currently-untagged song has been gone through (or skipped), the session doesn't just end — it continues into the already-tagged songs for that same category**, so the user can review and update existing values if their understanding of the category has evolved since they first tagged them. Same one-at-a-time picker, same Skip option, just now showing the song's current value pre-selected rather than blank
- **No resume/interrupt state** — if the session is abandoned partway (whether still in the untagged portion or already into the review-existing-tags portion), the next gap-fill run for that category restarts from the top of the remaining untagged set (no progress memory needed)

### 5. Add Song Flow

No Spotify search step — see the note on dropping Spotify integration in Data Model above.

1. User enters `title` and `artist` directly
2. **Dedup check**: normalized title+artist match against the existing library; if a likely duplicate is found, surface it and let the user confirm they still want to add a new record (rather than silently blocking — titles/artists can legitimately collide, e.g. covers)
3. User is immediately walked through **all tag categories**, one at a time, using the same one-tag-at-a-time UI as Gap-Fill, to fully tag the new song
4. User adds the `ultimate_guitar_url` manually

### 6. Assessment Screen

- Reached automatically whenever a song is tapped from any filtered or sorted list (see "Search result display" above) — the same screen and same behavior every time, regardless of why the user was looking at that song
- Also shows the `ultimate_guitar_url` link directly on this screen (in addition to it having already opened in a new tab on tap), in case the user needs to reopen it
- **One-tap rating button** — minimal friction, single primary action
- Rating scale is a **user-editable settings table** (label → staleness interval), not hardcoded. Starting values:
  - Perfect → 6 weeks
  - Great → 4 weeks
  - Good → 2 weeks
  - Clunky → 1 week
  - Learning → 1 day
- What the rating *means* depends on the song's `memorized` flag:
  - If `memorized = true`: rating reflects how well they played it **from memory**
  - If `memorized = false`: rating reflects how well they **played through it** (reading/following along)
- Rating a song updates `last_played_at` to now and resets the staleness clock per the interval table
- A secondary, smaller **"re-tag this song"** button re-enters the full one-tag-at-a-time walkthrough for that song (optional, not required every time)
- `memorized` itself is a **manual toggle** — not auto-inferred from rating history

### 7. Settings

- **Find a Song**: a search box (title/artist substring match) for jumping straight to a specific song's tag editor without browsing/filtering through Results first — useful once the library is at ~600 songs. Distinct from Results' filter/sort browsing; this is a direct lookup.
- **Tag category management**: create new categories, set each category's type (single-select / multi-select / range), rename or retire categories
- **Value management per category**: view/edit the list of existing values for a given category (e.g. see all current Genre options)
- Reorder tag category priority (drives Guided Picker sequence)
- Edit the rating scale (labels + associated staleness intervals) — add/remove/rename entries, change interval values

## Staleness Mechanic

Staleness is a **computed tag**, not a manually-set one — this is the one exception to "tags are static until edited":

- Computed from `last_played_at` + the interval associated with the song's most recent rating
- Recalculates automatically in the background (e.g. daily, or on read) — the app should not require the user to manually update it
- Ranked in the Guided Picker's priority list like any other category, but its value is always system-derived

## Import & Bulk Data Strategy

### Song list + Ultimate Guitar links import (one-time, at build time)

A single pre-built file, `song_import.csv`, is provided for this import — Claude Code should use this as the sole import source rather than any raw source files. It has already been through the parsing, deduplication, and UG-link-matching steps described below, so no re-parsing of a raw song list or raw HTML export is needed.

Columns:

| column | description |
|---|---|
| `artist` | clean display artist name (proper casing, e.g. "BØRNS," "Beyoncé") |
| `title` | clean display song title, with any "(ver N)" chord-chart-version suffix already stripped |
| `ultimate_guitar_url` | working link to the chord chart, where one was found — **empty string for the small number of songs with no saved tab** |

**All 606 songs have a populated `ultimate_guitar_url`** — full coverage. **13 of these link to the user's private/personal tabs** on Ultimate Guitar (URL pattern `/user/tab/view?h=...&tab_id=...` rather than the public `/tab/artist/title-type-id` pattern) — these take priority over a public chord chart wherever the user has both, since a personal tab reflects their own preferred arrangement. Import logic:

- One song record per row — no further deduplication needed, this file is already collapsed to one row per unique (artist, title) pair, version-agnostic
- Every row has a populated `ultimate_guitar_url`, so no fallback/empty-link handling is needed for this import — but the song record's `ultimate_guitar_url` field should remain editable later, since the user will continue adding/changing links as the library grows post-launch
- With Spotify integration dropped (see Data Model), the import is now just this one step: load `song_import.csv` directly into the `songs` table (`artist`, `title`, `ultimate_guitar_url`), no metadata-matching pass, no match-quality report needed

*(How this file was produced, for reference: originally two source files — a raw tab-delimited song list and an HTML export of the user's Ultimate Guitar "My Tabs" page — were parsed separately and merged on a normalized alphanumeric match key, since UG's own slug-generation punctuation rules aren't consistent enough to re-derive reliably from artist/title text alone. That merge is already done; Claude Code does not need to repeat it.)*

## Explicitly Out of Scope / Deferred

- User accounts / multi-user support
- Automated live scraping of Ultimate Guitar (blocked by auth; solved instead via the one-time `song_import.csv` file described above)
- Any distinction between "practice mode" and "show mode" as separate app states — it's one filter/sort engine throughout
- Resume/interrupt state for Gap-Fill or Add-Song tag walkthroughs
- Spotify integration entirely — dropped; see the note in Data Model
