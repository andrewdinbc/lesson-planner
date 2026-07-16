import { checkLink } from '@/lib/link-check'
import { sbSelect, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'

const ADMIN_EMAIL = 'andrewsinbc3@gmail.com'
const ADMIN_USER_ID = '7844844f-f54f-43c1-ae44-94ec37e97778'

async function requireAdmin(request) {
  const syncSecret = request.headers.get('x-steering-sync-secret')
  if (syncSecret && process.env.STEERING_SYNC_SECRET && syncSecret === process.env.STEERING_SYNC_SECRET) {
    return { id: ADMIN_USER_ID, email: ADMIN_EMAIL }
  }
  const user = await getCurrentUser()
  if (user && user.email === ADMIN_EMAIL) return user
  return null
}

// Re-validates an EXISTING web-source doc's link (link rot happens after
// the fact -- a site that worked at add-time can go down months later).
// Doesn't re-scrape/re-summarize content, just updates the status badge.
export async function POST(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const [doc] = await sbSelect('steering_documents', `?id=eq.${id}&select=source_url&limit=1`)
    if (!doc?.source_url) return Response.json({ error: 'Document not found or has no URL' }, { status: 404 })

    const result = await checkLink(doc.source_url)
    await sbUpdate('steering_documents', `?id=eq.${id}`, {
      link_status: result.ok ? 'ok' : 'broken',
      http_status_code: result.statusCode,
      last_checked_at: new Date().toISOString(),
    })

    return Response.json({ id, ...result })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
