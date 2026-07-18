import { getCurrentUser } from '@/lib/session'
import { sbInsert } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

// Per Aj's 2026-07-17 request: replace the old "send feedback to Aj for
// manual review" flow with something that applies automatically. A
// teacher's typed preference gets inserted directly into steering_documents
// (category: actionable_resources, source_type: auto_preference) -- the
// same table buildSteeringContext() already reads on every AI generation
// call across the app. No human review step: the moment this saves, it's
// live in the background source material for future generations.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { preferenceText, pageContext } = await request.json()
    if (!preferenceText?.trim()) return Response.json({ error: 'preferenceText required' }, { status: 400 })

    const text = preferenceText.trim()
    const title = `Standing preference — ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`

    const [saved] = await sbInsert('steering_documents', [{
      user_id: user.id,
      title,
      full_text: text,
      category: 'actionable_resources',
      source_type: 'auto_preference',
      subject: pageContext || 'unit-priorities',
      author: user.email || null,
    }])

    return Response.json({ saved: true, id: saved.id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
