// app/api/weekly-schedule/route.js
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { generateWeeklyGrid } from '@/lib/weekly-schedule'

// GET: fetch this teacher's schedule prefs + most recent generated grid (or a specific week via ?week=)
export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')

    const [prefs] = await sbSelect('weekly_schedule_prefs', `?user_id=eq.${user.id}&select=*&limit=1`)
    const scheduleQuery = week
      ? `?user_id=eq.${user.id}&week_label=eq.${encodeURIComponent(week)}&select=*&limit=1`
      : `?user_id=eq.${user.id}&select=*&order=updated_at.desc&limit=1`
    const [schedule] = await sbSelect('weekly_schedules', scheduleQuery)

    return Response.json({ prefs: prefs || null, schedule: schedule || null })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// POST: save prefs (body.prefs) and/or generate+save a new grid (body.generate + body.unitPriorities + body.weekLabel)
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()

    let savedPrefs = null
    if (body.prefs) {
      const row = { user_id: user.id, ...body.prefs, updated_at: new Date().toISOString() }
      const existing = await sbSelect('weekly_schedule_prefs', `?user_id=eq.${user.id}&select=id&limit=1`)
      savedPrefs = existing.length
        ? (await sbUpdate('weekly_schedule_prefs', `?user_id=eq.${user.id}`, row))[0]
        : (await sbInsert('weekly_schedule_prefs', [row]))[0]
    }

    let savedSchedule = null
    if (body.generate) {
      const prefsRow = savedPrefs || (await sbSelect('weekly_schedule_prefs', `?user_id=eq.${user.id}&select=*&limit=1`))[0]
      if (!prefsRow) return Response.json({ error: 'No schedule preferences saved yet - set school hours, lunch, and fixed blocks first' }, { status: 400 })

      const unitPriorities = body.unitPriorities || {}
      const grid = generateWeeklyGrid(prefsRow, unitPriorities)

      const row = {
        user_id: user.id,
        lens_period_id: body.lensPeriodId || null,
        week_label: body.weekLabel || `Week of ${new Date().toISOString().slice(0, 10)}`,
        grid,
        updated_at: new Date().toISOString(),
      }
      savedSchedule = (await sbInsert('weekly_schedules', [row]))[0]
    }

    // manual grid save (drag-and-drop edits from the client, already reordered)
    if (body.grid && body.scheduleId) {
      savedSchedule = (await sbUpdate('weekly_schedules', `?id=eq.${body.scheduleId}&user_id=eq.${user.id}`, {
        grid: body.grid,
        updated_at: new Date().toISOString(),
      }))[0]
    }

    return Response.json({ prefs: savedPrefs, schedule: savedSchedule })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
