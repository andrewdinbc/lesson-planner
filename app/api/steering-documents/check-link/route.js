import { checkLink } from '@/lib/link-check'
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

// Quick preview check -- lets the admin verify a link works BEFORE
// committing to the full scrape+AI-summarize+add flow, which is more
// expensive. Doesn't add anything, just checks.
export async function POST(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { url } = await request.json()
    if (!url) return Response.json({ error: 'url required' }, { status: 400 })
    const result = await checkLink(url)
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
