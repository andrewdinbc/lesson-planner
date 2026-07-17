// app/api/timeline/route.js
import { sbSelect, sbInsert, sbUpdate, sbDelete } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { seedTimelineFromUnits } from '@/lib/timeline'

// GET: fetch this teacher's timeline blocks, seeding from their
// unit_priorities rows on first load if they have none yet.
export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const totalWeeks = Number(searchParams.get('totalWeeks')) || 36

    let rows = await sbSelect('timeline_units', `?user_id=eq.${user.id}&select=*&order=subject.asc,sort_order.asc`)

    if (!rows.length) {
      const unitRows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc`)
      if (unitRows.length) {
        const seeded = seedTimelineFromUnits(unitRows, totalWeeks).map((b) => ({ user_id: user.id, ...b }))
        rows = await sbInsert('timeline_units', seeded)
      }
    }

    return Response.json({ blocks: rows, totalWeeks })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// POST: persist block position/size changes after a drag or resize.
// Accepts the full resolved set for the affected track(s) (including any
// neighbor blocks that were pushed/shrunk by lib/timeline.js#resolveTrackOverlaps
// on the client) so the whole track stays consistent in one write.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()
    const blocks = Array.isArray(body.blocks) ? body.blocks : []

    for (const b of blocks) {
      await sbUpdate(
        'timeline_units',
        `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(b.subject)}&unit_name=eq.${encodeURIComponent(b.unit_name)}`,
        { start_week: b.start_week, end_week: b.end_week, sort_order: b.sort_order ?? 0, updated_at: new Date().toISOString() }
      )
    }

    const rows = await sbSelect('timeline_units', `?user_id=eq.${user.id}&select=*&order=subject.asc,sort_order.asc`)
    return Response.json({ blocks: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: re-seed from current unit_priorities, discarding manual edits --
// used by the "Reset to Priorities" action on the timeline page.
export async function DELETE(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const totalWeeks = Number(searchParams.get('totalWeeks')) || 36

    await sbDelete('timeline_units', `?user_id=eq.${user.id}`)
    const unitRows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc`)
    let rows = []
    if (unitRows.length) {
      const seeded = seedTimelineFromUnits(unitRows, totalWeeks).map((b) => ({ user_id: user.id, ...b }))
      rows = await sbInsert('timeline_units', seeded)
    }
    return Response.json({ blocks: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
