import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('teacher_class_setup', `?user_id=eq.${user.id}&select=*&limit=1`)
    return Response.json({ setup: rows[0] || null })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { grades, subjects, province, customCurriculumUrl } = await request.json()
    if (!Array.isArray(grades) || !Array.isArray(subjects) || grades.length === 0 || subjects.length === 0) {
      return Response.json({ error: 'grades and subjects (non-empty arrays) required' }, { status: 400 })
    }
    const existing = await sbSelect('teacher_class_setup', `?user_id=eq.${user.id}&select=id&limit=1`)
    const row = {
      grades, subjects,
      province: province || 'BC',
      custom_curriculum_url: province && province !== 'BC' ? (customCurriculumUrl || null) : null,
      updated_at: new Date().toISOString(),
    }
    if (existing.length) {
      await sbUpdate('teacher_class_setup', `?user_id=eq.${user.id}`, row)
    } else {
      await sbInsert('teacher_class_setup', [{ user_id: user.id, ...row }])
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
