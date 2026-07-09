import { getCurrentUser } from '../../../lib/session'

// Forwards micro-unit creation to Mastery Studio (math-mastery), which
// lives on a separate Supabase project - this is a proxy, not a direct DB
// write, authenticated cross-app via MICRO_UNIT_SYNC_SECRET (same value
// must be set on both this app and math-mastery's Vercel env vars).

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()

  const secret = process.env.MICRO_UNIT_SYNC_SECRET
  if (!secret) {
    return Response.json({ error: 'MICRO_UNIT_SYNC_SECRET not configured on this app - cross-app sync to Mastery Studio unavailable.' }, { status: 500 })
  }

  try {
    const res = await fetch('https://math-mastery-three.vercel.app/api/micro-units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-micro-unit-sync-secret': secret },
      body: JSON.stringify({ ...body, teacherEmail: user.email }),
    })
    const data = await res.json()
    if (!res.ok) return Response.json({ error: data.error || 'Mastery Studio rejected the request' }, { status: res.status })
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: 'Could not reach Mastery Studio: ' + e.message }, { status: 502 })
  }
}
