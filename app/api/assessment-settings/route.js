// app/api/assessment-settings/route.js
// Deliberately separate from /api/teacher-inventories -- that route's POST
// overwrites the full onboarding row (subjects, grades, inventory scores,
// etc.), so a lightweight "change my default assessment type" save can't
// safely go through it without risking clobbering unrelated fields. This
// route only ever touches default_assessment_type.
import { sbSelect, sbUpdate, sbInsert } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=default_assessment_type&limit=1`)
    return Response.json({ default_assessment_type: rows[0]?.default_assessment_type || 'quiz' })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { default_assessment_type } = await request.json()
    const existing = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=id&limit=1`)
    if (existing.length) {
      await sbUpdate('teacher_inventories', `?user_id=eq.${user.id}`, { default_assessment_type })
    } else {
      // No onboarding row yet (teacher skipped the inventory) -- create a
      // minimal skipped row just to hold this one preference.
      await sbInsert('teacher_inventories', [{ user_id: user.id, skipped: true, default_assessment_type }])
    }
    return Response.json({ default_assessment_type })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
