import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST: a teacher submits feedback/a request (e.g. "this is missing my
// Grade 5 fractions unit"). Stored here as the source of truth, and
// cross-app pings Hyperion so it lands in Aj's Advanced Users log under
// Overwatch and gets included in his next digest -- see
// morpheus-scheduler's app/api/advanced-user-feedback/route.js.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { requestText, pageContext } = await request.json()
    if (!requestText?.trim()) return Response.json({ error: 'requestText required' }, { status: 400 })

    const [saved] = await sbInsert('curriculum_feedback_requests', [{
      user_id: user.id, user_email: user.email, page_context: pageContext || 'unit-priorities', request_text: requestText.trim(),
    }])

    // Cross-app ping to Hyperion -- fails soft, feedback is already saved
    // here regardless of whether this succeeds.
    const secret = process.env.STEERING_SYNC_SECRET
    if (secret) {
      try {
        await fetch('https://morpheus-scheduler.vercel.app/api/advanced-user-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-steering-sync-secret': secret },
          body: JSON.stringify({
            source: 'lesson-planner',
            userEmail: user.email,
            pageContext: pageContext || 'unit-priorities',
            requestText: requestText.trim(),
            requestId: saved.id,
          }),
          signal: AbortSignal.timeout(8000),
        })
      } catch {
        // fails soft
      }
    }

    return Response.json({ saved: true, id: saved.id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
