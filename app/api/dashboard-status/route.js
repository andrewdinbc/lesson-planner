import { getCurrentUser } from '@/lib/session'
import { sbSelect } from '@/lib/supabase'

// Powers checkmarks + greyed-out styling on the Dashboard's numbered
// onboarding steps. "Completed" = real data exists OR the step was
// explicitly skipped (teacher_step_skips, or inventories' own dedicated
// skipped column).
//
// IMPORTANT: each check runs isolated (safeCheck wraps every query in its
// own try/catch) rather than one Promise.all where a single failing query
// (e.g. a table that was never migrated) throws and silently kills every
// other checkmark too. This exact bug happened once already -- never go
// back to a bare Promise.all here without this isolation.
async function safeCheck(fn) {
  try {
    return await fn()
  } catch (e) {
    console.error('dashboard-status check failed (isolated, others unaffected):', e.message)
    return false
  }
}

async function isSkipped(userId, stepKey) {
  const rows = await sbSelect('teacher_step_skips', `?user_id=eq.${userId}&step_key=eq.${encodeURIComponent(stepKey)}&select=id&limit=1`)
  return rows.length > 0
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const [inventories, classSetup, yearPlan, unitPriorities, weeklySchedule, resources] = await Promise.all([
    safeCheck(async () => {
      const rows = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=completed_at,skipped&limit=1`)
      return rows.length > 0 && !!(rows[0].completed_at || rows[0].skipped)
    }),
    safeCheck(async () => {
      const rows = await sbSelect('teacher_class_setup', `?user_id=eq.${user.id}&select=id&limit=1`)
      return rows.length > 0 || await isSkipped(user.id, 'class_setup')
    }),
    safeCheck(async () => {
      const rows = await sbSelect('year_plan_lens_prefs', `?user_id=eq.${user.id}&select=id&limit=1`)
      return rows.length > 0
    }),
    safeCheck(async () => {
      const rows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=id&limit=1`)
      return rows.length > 0 || await isSkipped(user.id, 'unit_priorities')
    }),
    safeCheck(async () => {
      const rows = await sbSelect('weekly_schedule_prefs', `?user_id=eq.${user.id}&select=id&limit=1`)
      return rows.length > 0
    }),
    safeCheck(async () => {
      const rows = await sbSelect('teacher_resources', `?user_id=eq.${user.id}&select=id&limit=1`)
      return rows.length > 0
    }),
  ])

  return Response.json({ inventories, classSetup, yearPlan, unitPriorities, weeklySchedule, resources })
}
