// app/api/qr-assessment/route.js
// CRUD for the QR-submission assessment "backbone" (qr_assessment_configs).
// This is the origination point when a teacher picks "QR-code student
// submission" as an assessment type for a unit -- creates the record that
// other TeacherAssist suite apps (Student Portfolio) are meant to read to
// actually generate/scan QR codes and run AI marking. No student PII here.
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'

export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const unitPriorityId = searchParams.get('unit_priority_id')
  try {
    const query = unitPriorityId
      ? `?user_id=eq.${user.id}&unit_priority_id=eq.${unitPriorityId}&select=*`
      : `?user_id=eq.${user.id}&select=*&order=created_at.desc`
    const rows = await sbSelect('qr_assessment_configs', query)
    return Response.json({ configs: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, unit_priority_id, subject, unit_name, title, instructions, rubric_text, due_date, status } = body

    if (id) {
      const patch = {}
      if (title !== undefined) patch.title = title
      if (instructions !== undefined) patch.instructions = instructions
      if (rubric_text !== undefined) patch.rubric_text = rubric_text
      if (due_date !== undefined) patch.due_date = due_date
      if (status !== undefined) patch.status = status
      patch.updated_at = new Date().toISOString()
      await sbUpdate('qr_assessment_configs', `?id=eq.${id}&user_id=eq.${user.id}`, patch)
      return Response.json({ ok: true, id })
    }

    if (!title) return Response.json({ error: 'title is required' }, { status: 400 })
    const [row] = await sbInsert('qr_assessment_configs', [{
      user_id: user.id, unit_priority_id: unit_priority_id || null,
      subject: subject || null, unit_name: unit_name || null,
      title, instructions: instructions || null, rubric_text: rubric_text || null,
      due_date: due_date || null,
    }])
    return Response.json({ ok: true, config: row })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
