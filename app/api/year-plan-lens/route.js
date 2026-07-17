// app/api/year-plan-lens/route.js
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { defaultPeriodsForModel, normalizePeriods, computeWeekWindows } from '@/lib/year-plan'

// GET: fetch this teacher's lens period preferences for a given model_key,
// seeding defaults from LENS_TEMPLATES on first load. Also returns the
// computed week windows if totalInstructionalWeeksAvailable is passed as
// a query param.
export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const modelKey = searchParams.get('model_key')
    const weeksParam = searchParams.get('weeks')
    if (!modelKey) return Response.json({ error: 'model_key is required' }, { status: 400 })

    const [classSetup] = await sbSelect('teacher_class_setup', `?user_id=eq.${user.id}&select=grades,subjects&limit=1`)

    let rows = await sbSelect(
      'year_plan_lens_prefs',
      `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(modelKey)}&select=*&order=sort_order.asc`
    )

    if (!rows.length) {
      const defaults = defaultPeriodsForModel(modelKey, classSetup?.subjects).map((r) => ({ user_id: user.id, ...r }))
      if (defaults.length) rows = await sbInsert('year_plan_lens_prefs', defaults)
    }

    const weeks = weeksParam ? Number(weeksParam) : null
    const windows = weeks ? computeWeekWindows(rows, weeks) : null

    return Response.json({ periods: rows, windows, grades: classSetup?.grades || [] })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// PUT: add a brand-new period (subject) to a teacher's Year Structure --
// e.g. they teach something not captured in class-setup, or want to add
// a period beyond their core subjects. Re-normalizes all periods for
// this model_key afterward so the set still sums to 100.
export async function PUT(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { model_key, period_label } = await request.json()
    if (!model_key || !period_label?.trim()) {
      return Response.json({ error: 'model_key and period_label are required' }, { status: 400 })
    }

    const existing = await sbSelect(
      'year_plan_lens_prefs',
      `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(model_key)}&select=*&order=sort_order.asc`
    )

    if (existing.some((p) => p.period_label.toLowerCase() === period_label.trim().toLowerCase())) {
      return Response.json({ error: 'A subject with that name already exists' }, { status: 400 })
    }

    const newPeriodPct = existing.length > 0 ? Math.round(100 / (existing.length + 1)) : 100
    await sbInsert('year_plan_lens_prefs', [{
      user_id: user.id, model_key, period_label: period_label.trim(),
      period_pct: newPeriodPct, sort_order: existing.length,
    }])

    const allRows = await sbSelect(
      'year_plan_lens_prefs',
      `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(model_key)}&select=*&order=sort_order.asc`
    )
    const normalized = normalizePeriods(allRows)
    for (const p of normalized) {
      await sbUpdate(
        'year_plan_lens_prefs',
        `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(model_key)}&period_label=eq.${encodeURIComponent(p.period_label)}`,
        { period_pct: p.period_pct, updated_at: new Date().toISOString() }
      )
    }

    const rows = await sbSelect(
      'year_plan_lens_prefs',
      `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(model_key)}&select=*&order=sort_order.asc`
    )
    return Response.json({ periods: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// POST: update period % allocations after a slider change. Client sends
// the full period set for a model_key (already re-normalized client-side
// or not - we normalize server-side regardless to guarantee sum=100,
// UNLESS one or more periods are flagged interdisciplinary, in which case
// the total is allowed above 100% up to a 135% ceiling instead of being
// forced back down -- see lib/year-plan.js#normalizePeriods),
// plus optional totalInstructionalWeeksAvailable to return fresh windows.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()
    const { model_key, periods, totalInstructionalWeeksAvailable } = body
    if (!model_key || !Array.isArray(periods)) {
      return Response.json({ error: 'model_key and periods are required' }, { status: 400 })
    }

    const normalized = normalizePeriods(periods)

    for (const p of normalized) {
      await sbUpdate(
        'year_plan_lens_prefs',
        `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(model_key)}&period_label=eq.${encodeURIComponent(p.period_label)}`,
        { period_pct: p.period_pct, interdisciplinary: !!p.interdisciplinary, updated_at: new Date().toISOString() }
      )
    }

    const rows = await sbSelect(
      'year_plan_lens_prefs',
      `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(model_key)}&select=*&order=sort_order.asc`
    )

    const windows = totalInstructionalWeeksAvailable ? computeWeekWindows(rows, totalInstructionalWeeksAvailable) : null

    return Response.json({ periods: rows, windows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

