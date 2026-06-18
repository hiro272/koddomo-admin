import { createClient } from '@supabase/supabase-js'

// The anon/publishable key is safe to ship in the browser — every table is
// protected by Row Level Security, and writes are gated by is_admin().
// Env vars override these, but the fallbacks let the deploy work out of the box.
const url =
  import.meta.env.VITE_SUPABASE_URL || 'https://iobhrfiqsxanwktaoqlw.supabase.co'
const anon =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_1WjJWlk01QBUAtMt-ZMj1g_pi92miKC'

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})
