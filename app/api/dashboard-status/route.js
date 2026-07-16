import { getCurrentUser } from '@/lib/session'
import { sbSelect } from '@/lib/supabase'

// Powers checkmarks + greyed-out styling on the Dashboard's numbered
// onboarding steps. "Completed" = at least one row exists for this user
// in the relevant table (or, for inventories, completed_at/skipped set).
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const [inventory, yearPlan, unitPriorities, weeklySchedule, resources] = await Promise.all([
      sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=completed_at,skipped&limit=1`),
      sbSelect('year_plan_lens_prefs', `?user_id=eq.${user.id}&select=id&limit=1`),
      sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=id&limit=1`),
      sbSelect('weekly_schedule_prefs', `?user_id=eq.${user.id}&select=id&limit=1`),
      sbSelect('teacher_resources', `?user_id=eq.${user.id}&select=id&limit=1`),
    ])

    return Response.json({
      inventories: inventory.length > 0 && (inventory[0].completed_at || inventory[0].skipped),
      yearPlan: yearPlan.length > 0,
      unitPriorities: unitPriorities.length > 0,
      weeklySchedule: weeklySchedule.length > 0,
      resources: resources.length > 0,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
