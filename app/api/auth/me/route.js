import { getCurrentUser } from '@/lib/session'

// Lightweight session check for client-side pages to call on mount --
// lets pages redirect to /login immediately instead of rendering broken
// forms/empty states and only surfacing "Not authenticated" deep inside
// a specific feature (e.g. the calendar upload), which is confusing and
// easy to miss the real cause of.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ authenticated: false }, { status: 401 })
  return Response.json({ authenticated: true, email: user.email })
}
