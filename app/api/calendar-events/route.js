// app/api/calendar-events/route.js
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { seedDayFromWeeklyTemplate } from '@/lib/daily-plan'
import { insertEventIntoDay, appendDisplacedBlock, findNextOccurrenceDate } from '@/lib/calendar-events'

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD: list events in a date range (used by
// the Weekly Schedule page to overlay this week's events on the grid).
export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    let query = `?user_id=eq.${user.id}&select=*&order=event_date.asc`
    if (from) query += `&event_date=gte.${from}`
    if (to) query += `&event_date=lte.${to}`
    const events = await sbSelect('calendar_events', query)
    return Response.json({ events })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// POST: create an event (manual entry, or called by /api/calendar-events/extract
// for each event pulled from an uploaded document) and, if it has a
// specific time, immediately apply it to that date's Daily Planner --
// inserting it as a fixed block and bumping whatever subject block it
// overlapped into the next day that subject has a slot.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()
    const { event_date, event_time, length_minutes, title, source, source_doc_title } = body
    if (!event_date || !title) return Response.json({ error: 'event_date and title are required' }, { status: 400 })

    const [event] = await sbInsert('calendar_events', [{
      user_id: user.id, event_date, event_time: event_time || null, length_minutes: length_minutes || null,
      title, source: source || 'manual', source_doc_title: source_doc_title || null,
    }])

    let bumpNote = null
    if (event_time) {
      bumpNote = await applyEventToDay(user.id, event)
      await sbUpdate('calendar_events', `?id=eq.${event.id}`, { applied_to_schedule: true, bump_note: bumpNote })
    }

    return Response.json({ event, bumpNote })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

/**
 * Insert `event` into its date's daily_plans (seeding that day from the
 * weekly template first if it doesn't exist yet), and if it displaced a
 * subject, append that subject to the following day's plan. Returns a
 * short human-readable note of what happened, or null if nothing was
 * displaced.
 */
async function applyEventToDay(userId, event) {
  let [plan] = await sbSelect('daily_plans', `?user_id=eq.${userId}&plan_date=eq.${event.event_date}&select=*&limit=1`)

  if (!plan) {
    const [weekly] = await sbSelect('weekly_schedules', `?user_id=eq.${userId}&select=grid&order=updated_at.desc&limit=1`)
    const blocks = weekly ? seedDayFromWeeklyTemplate(weekly.grid, event.event_date) : []
    ;[plan] = await sbInsert('daily_plans', [{ user_id: userId, plan_date: event.event_date, blocks, ttoc_notes: {} }])
  }

  const { blocks, displaced } = insertEventIntoDay(plan.blocks, event)
  await sbUpdate('daily_plans', `?user_id=eq.${userId}&plan_date=eq.${event.event_date}`, { blocks, updated_at: new Date().toISOString() })

  if (!displaced.length) return null

  // Look up the Weekly Schedule template to find each displaced subject's
  // actual next dedicated slot -- not just "tomorrow." A subject that only
  // runs once a week (e.g. Social Studies) needs to wait for its next
  // scheduled day, which may be next week.
  const [weeklyForBump] = await sbSelect('weekly_schedules', `?user_id=eq.${userId}&select=grid&order=updated_at.desc&limit=1`)
  const weeklyGrid = weeklyForBump?.grid || null

  const notes = []
  for (const d of displaced) {
    const targetDateStr = findNextOccurrenceDate(weeklyGrid, d.subject, event.event_date)

    let [targetPlan] = await sbSelect('daily_plans', `?user_id=eq.${userId}&plan_date=eq.${targetDateStr}&select=*&limit=1`)
    if (!targetPlan) {
      const seededBlocks = weeklyGrid ? seedDayFromWeeklyTemplate(weeklyGrid, targetDateStr) : []
      ;[targetPlan] = await sbInsert('daily_plans', [{ user_id: userId, plan_date: targetDateStr, blocks: seededBlocks, ttoc_notes: {} }])
    }

    const updatedBlocks = appendDisplacedBlock(targetPlan.blocks, d, targetDateStr)
    await sbUpdate('daily_plans', `?user_id=eq.${userId}&plan_date=eq.${targetDateStr}`, { blocks: updatedBlocks, updated_at: new Date().toISOString() })

    notes.push(`${d.subject} bumped from ${event.event_date} to its next dedicated slot on ${targetDateStr}`)
  }

  return notes.join('; ')
}
