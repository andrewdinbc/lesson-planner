// lib/supabase.js — direct REST fetch (no @supabase/supabase-js SDK),
// matching this codebase's import-validator convention. Auth uses Supabase's
// GoTrue REST endpoints directly; session token is stored in an httpOnly
// cookie we manage ourselves.

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ── Data access (service role — server-side only, RLS still applies via
//    explicit user_id filters we add ourselves at the call site) ──
function serviceHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function sbSelect(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { headers: serviceHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Supabase select ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sbInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: serviceHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Supabase insert ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sbUpdate(table, query, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: 'PATCH',
    headers: serviceHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Supabase update ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sbDelete(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { method: 'DELETE', headers: serviceHeaders() })
  if (!res.ok) throw new Error(`Supabase delete ${table} failed: ${res.status} ${await res.text()}`)
  return true
}

// ── Auth (GoTrue REST, direct fetch) ──
export async function signUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Sign up failed')
  return data
}

export async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Sign in failed')
  return data // { access_token, refresh_token, user, ... }
}

export async function getUserFromToken(accessToken) {
  if (!accessToken) return null
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}
