// app/api/unit-priorities/route.js
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { defaultRowsForSubjects, checkMismatch } from '@/lib/unit-priorities'

// GET: fetch this teacher's unit priorities, seeding defaults on first load
// if they have subjects selected (from teacher_inventories) but no rows yet.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    let rows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc`)

    if (!rows.length) {
      const [inv] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=subjects&limit=1`)
      const subjects = inv?.subjects || []
      if (subjects.length) {
        const defaults = defaultRowsForSubjects(subjects).map((r) => ({ user_id: user.id, ...r }))
        rows = await sbInsert('unit_priorities', defaults)
      }
    }

    return Response.json({ units: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// POST: update one or more unit rows (priority slider changes, removal
// toggles, high_scrutiny opt-in for non-LA/Math subjects), and optionally
// run the mismatch check against total instructional weeks.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()

    if (Array.isArray(body.updates)) {
      for (const u of body.updates) {
        await sbUpdate('unit_priorities', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(u.subject)}&unit_name=eq.${encodeURIComponent(u.unit_name)}`, {
          priority: u.priority,
          high_scrutiny: u.high_scrutiny,
          removed: u.removed,
          updated_at: new Date().toISOString(),
        })
      }
    }

    const rows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc`)

    let mismatch = null
    if (body.totalInstructionalWeeksAvailable) {
      mismatch = checkMismatch(rows, body.totalInstructionalWeeksAvailable)
    }

    return Response.json({ units: rows, mismatch })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
