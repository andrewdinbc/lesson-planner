// utils/supabase/client.js
// Browser-side Supabase client for pages that query tables directly with
// the SDK's .from() chain (app/dashboard, app/micro-units/new). This file
// was referenced by both but never created - the root cause of a
// production build outage that silently blocked every deploy since
// 2026-07-13 (all deploys after this point failed, so Vercel kept serving
// a stale build from before that). Every other part of this codebase uses
// the direct-REST-fetch convention in lib/supabase.js instead; this file
// exists only because these two pages were written against the SDK
// pattern and it's lower-risk to supply the missing client than rewrite
// their query logic.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
