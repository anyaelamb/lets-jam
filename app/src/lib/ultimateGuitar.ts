import type { Song } from '../types';

// Public UG links carry artist and title in the path —
// /tab/<artist-slug>/<title-slug>-<type>[-ver-N]-<id> — so they can be read
// straight off the URL. (Fetching the page instead isn't an option: UG
// blocks cross-origin requests from the browser.) Personal tabs
// (/user/tab/view?h=…) have no names in the URL, so those return null.
const TYPE_SUFFIX =
  /-(chords|tabs?|bass|ukulele|drums|official|power|video|pro|guitar-pro)(-ver-\d+)?-\d+$/;

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);

function titleCase(slug: string): string {
  const words = slug.split('-').filter(Boolean);
  return words
    .map((word, i) =>
      i > 0 && i < words.length - 1 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseUltimateGuitarUrl(url: string, existingSongs: Song[]): { title: string; artist: string } | null {
  let path: string;
  try {
    const parsed = new URL(url.trim());
    if (!/(^|\.)ultimate-guitar\.com$/.test(parsed.hostname)) return null;
    path = parsed.pathname;
  } catch {
    return null;
  }

  const match = path.match(/^\/tab\/([^/]+)\/([^/]+?)\/?$/);
  if (!match) return null;
  const [, artistSlug, rawTitleSlug] = match;
  const titleSlug = rawTitleSlug.replace(TYPE_SUFFIX, '');
  if (!titleSlug) return null;

  // Slugs lose punctuation and capitalization ("ac-dc", "florence-the-machine"),
  // so prefer the library's own spelling when the artist is already in it.
  const knownArtist = existingSongs.find((s) => slugOf(s.artist) === artistSlug)?.artist;

  return { title: titleCase(titleSlug), artist: knownArtist ?? titleCase(artistSlug) };
}
