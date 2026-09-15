import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (see app/.env.example)');
}

let client: SupabaseClient | null = null;

// RLS on every table requires an x-app-key header matching the passphrase
// stored in app_config — the anon key alone (shipped in the client bundle)
// isn't enough. The client can't be created until the passphrase is known,
// so this is a lazy singleton initialized once the Passphrase Gate resolves,
// not at module load.
export function initSupabaseClient(appKey: string): SupabaseClient {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { 'x-app-key': appKey } },
  });
  return client;
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) throw new Error('Supabase client not initialized — call initSupabaseClient() first');
  return client;
}
