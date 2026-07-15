import { sbSelect, sbInsert, sbUpdate } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=*&limit=1`)
    return Response.json({ inventory: rows[0] || null })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()
    const existing = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=id&limit=1`)

    const row = {
      user_id: user.id,
      skipped: !!body.skipped,
      tsi_scores: body.tsi_scores || null,
      tsi_dominant: body.tsi_dominant || null,
      tsi_adjusted: body.tsi_adjusted || null,
      tpi_scores: body.tpi_scores || null,
      tpi_dominant: body.tpi_dominant || null,
      tpi_adjusted: body.tpi_adjusted || null,
      philosophy_scores: body.philosophy_scores || null,
      philosophy_dominant: body.philosophy_dominant || null,
      philosophy_adjusted: body.philosophy_adjusted || null,
      wieman_scores: body.wieman_scores || null,
      fte_percentage: body.fte_percentage || null,
      subjects: body.subjects || null,
      grades: body.grades || null,
      time_distribution: body.time_distribution || null,
      completed_at: body.skipped ? null : new Date().toISOString(),
    }

    let saved
    if (existing.length) {
      saved = await sbUpdate('teacher_inventories', `?user_id=eq.${user.id}`, row)
    } else {
      saved = await sbInsert('teacher_inventories', [row])
    }
    return Response.json({ inventory: saved[0] })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
