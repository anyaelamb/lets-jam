// One-time bulk import of song_import.csv into the songs table.
// Uses the service_role key (scripts/.env, gitignored) to bypass RLS —
// never used in the shipped app, which only ever sees the anon key.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

function loadEnv(file) {
  const text = readFileSync(file, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnv(path.join(here, '.env'));
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in scripts/.env');
  process.exit(1);
}

// Minimal RFC4180 parser — handles quoted fields with embedded commas and
// "" as an escaped quote. song_import.csv only needs the comma-in-quotes
// case (e.g. "Crosby, Stills, Nash & Young") but this handles both safely.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const csvText = readFileSync(path.join(root, 'song_import.csv'), 'utf8');
const rows = parseCsv(csvText);
const [header, ...dataRows] = rows;
const artistIdx = header.indexOf('artist');
const titleIdx = header.indexOf('title');
const urlIdx = header.indexOf('ultimate_guitar_url');

const songs = dataRows.map((r) => ({
  title: r[titleIdx],
  artist: r[artistIdx],
  ultimate_guitar_url: r[urlIdx] ?? '',
}));

console.log(`Parsed ${songs.length} songs from song_import.csv`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { count: existingCount, error: countError } = await supabase
  .from('songs')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error('Failed to check existing row count:', countError.message);
  process.exit(1);
}

if (existingCount > 0) {
  console.error(
    `songs table already has ${existingCount} row(s) — refusing to import again and risk duplicates. ` +
      `Truncate the table first if you really want to re-run this.`,
  );
  process.exit(1);
}

const BATCH_SIZE = 100;
let inserted = 0;
for (let i = 0; i < songs.length; i += BATCH_SIZE) {
  const batch = songs.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from('songs').insert(batch);
  if (error) {
    console.error(`Batch starting at row ${i} failed:`, error.message);
    console.error(`${inserted} songs were inserted before the failure.`);
    process.exit(1);
  }
  inserted += batch.length;
  console.log(`Inserted ${inserted} / ${songs.length}`);
}

const { count: finalCount, error: finalError } = await supabase
  .from('songs')
  .select('*', { count: 'exact', head: true });

if (finalError) {
  console.error('Import finished but final count check failed:', finalError.message);
  process.exit(1);
}

console.log(`Done. songs table now has ${finalCount} rows.`);
