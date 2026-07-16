import { sbSelect, sbUpdate } from '@/lib/supabase'

export const runtime = 'nodejs'

// Cross-app endpoint: lets Hyperion's Advanced Users page (under
// Overwatch) pull the live feedback request log. Secret-gated, same
// pattern as /api/steering-documents/context.
export async function GET(request) {
  const syncSecret = request.headers.get('x-steering-sync-secret')
  if (!syncSecret || !process.env.STEERING_SYNC_SECRET || syncSecret !== process.env.STEERING_SYNC_SECRET) {
    return Response.json({ error: 'Not authorized' }, { status: 401 })
  }
  try {
    const rows = await sbSelect('curriculum_feedback_requests', '?select=*&order=created_at.desc&limit=100')
    return Response.json({ requests: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// Lets Hyperion mark a request as reviewed/resolved once Aj has looked at it.
export async function POST(request) {
  const syncSecret = request.headers.get('x-steering-sync-secret')
  if (!syncSecret || !process.env.STEERING_SYNC_SECRET || syncSecret !== process.env.STEERING_SYNC_SECRET) {
    return Response.json({ error: 'Not authorized' }, { status: 401 })
  }
  try {
    const { id, status } = await request.json()
    if (!id || !status) return Response.json({ error: 'id and status required' }, { status: 400 })
    await sbUpdate('curriculum_feedback_requests', `?id=eq.${id}`, { status })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
