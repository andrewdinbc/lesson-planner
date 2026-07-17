// app/api/split-class-settings/route.js
// Deliberately separate from /api/teacher-inventories for the same reason
// as /api/assessment-settings -- a lightweight "am I teaching a split
// (A/B year) class, and which year is it right now" toggle shouldn't risk
// clobbering the rest of the onboarding row.
import { sbSelect, sbUpdate, sbInsert } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=split_class_enabled,active_rotation_year&limit=1`)
    const row = rows[0]
    return Response.json({
      split_class_enabled: row?.split_class_enabled || false,
      active_rotation_year: row?.active_rotation_year || 'A',
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { split_class_enabled, active_rotation_year } = await request.json()
    const patch = {}
    if (typeof split_class_enabled === 'boolean') patch.split_class_enabled = split_class_enabled
    if (active_rotation_year === 'A' || active_rotation_year === 'B') patch.active_rotation_year = active_rotation_year

    const existing = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=id&limit=1`)
    if (existing.length) {
      await sbUpdate('teacher_inventories', `?user_id=eq.${user.id}`, patch)
    } else {
      await sbInsert('teacher_inventories', [{ user_id: user.id, skipped: true, ...patch }])
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
