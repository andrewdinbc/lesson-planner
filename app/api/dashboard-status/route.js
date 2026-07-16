import { getCurrentUser } from '@/lib/session'
import { sbSelect } from '@/lib/supabase'

// Powers checkmarks + greyed-out styling on the Dashboard's numbered
// onboarding steps. "Completed" = at least one row exists for this user
// in the relevant table (or, for inventories, completed_at/skipped set).
//
// IMPORTANT: each check runs isolated (safeCheck wraps every query in its
// own try/catch) rather than one Promise.all where a single failing query
// (e.g. a table that was never migrated) throws and silently kills every
// other checkmark too. This exact bug happened -- teacher_class_setup's
// migration was never run, and it took down inventories/yearPlan/
// unitPriorities/weeklySchedule/resources' checkmarks right along with it,
// even though those tables were all fine. Never go back to Promise.all
// here without this isolation.
async function safeCheck(fn) {
  try {
    return await fn()
  } catch (e) {
    console.error('dashboard-status check failed (isolated, others unaffected):', e.message)
    return false
  }
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
      return rows.length > 0
    }),
    safeCheck(async () => {
      const rows = await sbSelect('year_plan_lens_prefs', `?user_id=eq.${user.id}&select=id&limit=1`)
      return rows.length > 0
    }),
    safeCheck(async () => {
      const rows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=id&limit=1`)
      return rows.length > 0
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
