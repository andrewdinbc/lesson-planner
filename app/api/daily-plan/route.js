// app/api/daily-plan/route.js
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { seedDayFromWeeklyTemplate, activeUnitForSubjectThisWeek } from '@/lib/daily-plan'
import { currentInstructionalWeek } from '@/lib/assessment-types'

// GET ?date=YYYY-MM-DD: fetch this teacher's plan for a specific date,
// seeding it from the Weekly Schedule template's matching day-of-week on
// first load for that date. Once seeded, this date's blocks are its own
// independent record -- re-visiting the Weekly Schedule Builder later and
// changing the template does NOT retroactively change already-seeded days.
export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date) return Response.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 })

    let [plan] = await sbSelect('daily_plans', `?user_id=eq.${user.id}&plan_date=eq.${date}&select=*&limit=1`)

    if (!plan) {
      const [weekly] = await sbSelect('weekly_schedules', `?user_id=eq.${user.id}&select=grid&order=updated_at.desc&limit=1`)
      let blocks = weekly ? seedDayFromWeeklyTemplate(weekly.grid, date) : []

      // Pull in what the Year Timeline says is actually happening this
      // week per subject, so a block starts already labeled with real
      // content ("Fractions") instead of blank -- the Day <- Week <- Year
      // connective tissue, not just a bare time grid.
      const [inv] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=school_calendar_summary&limit=1`)
      const openingDate = inv?.school_calendar_summary?.schoolOpeningDate
      const weekNumber = openingDate ? currentInstructionalWeek(openingDate) : null
      if (weekNumber && blocks.length) {
        const timelineBlocks = await sbSelect('timeline_units', `?user_id=eq.${user.id}&select=*`)
        blocks = blocks.map((b) => {
          if (b.fixed || b.content) return b
          const unit = activeUnitForSubjectThisWeek(timelineBlocks, b.subject, weekNumber)
          return unit ? { ...b, content: unit.unit_name } : b
        })
      }

      const [inserted] = await sbInsert('daily_plans', [{ user_id: user.id, plan_date: date, blocks, ttoc_notes: {} }])
      plan = inserted
    }

    return Response.json({ plan })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// POST: save block edits (resize/content/activity swap/add/remove) and/or
// ttoc_notes for a given date.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { date, blocks, ttoc_notes } = await request.json()
    if (!date) return Response.json({ error: 'date is required' }, { status: 400 })

    const existing = await sbSelect('daily_plans', `?user_id=eq.${user.id}&plan_date=eq.${date}&select=id&limit=1`)
    const patch = { updated_at: new Date().toISOString() }
    if (blocks !== undefined) patch.blocks = blocks
    if (ttoc_notes !== undefined) patch.ttoc_notes = ttoc_notes

    let plan
    if (existing.length) {
      ;[plan] = await sbUpdate('daily_plans', `?user_id=eq.${user.id}&plan_date=eq.${date}`, patch)
    } else {
      ;[plan] = await sbInsert('daily_plans', [{ user_id: user.id, plan_date: date, blocks: blocks || [], ttoc_notes: ttoc_notes || {} }])
    }

    return Response.json({ plan })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
