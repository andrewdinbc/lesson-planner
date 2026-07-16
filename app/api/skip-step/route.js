import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert } from '@/lib/supabase'

// Generic skip-a-step endpoint. stepKey identifies which onboarding step
// (e.g. 'class_setup', 'unit_priorities') -- reusable for any future step
// rather than bolting a bespoke "skipped" flag onto each domain table.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { stepKey } = await request.json()
    if (!stepKey) return Response.json({ error: 'stepKey required' }, { status: 400 })

    const existing = await sbSelect('teacher_step_skips', `?user_id=eq.${user.id}&step_key=eq.${encodeURIComponent(stepKey)}&select=id&limit=1`)
    if (!existing.length) {
      await sbInsert('teacher_step_skips', [{ user_id: user.id, step_key: stepKey }])
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
