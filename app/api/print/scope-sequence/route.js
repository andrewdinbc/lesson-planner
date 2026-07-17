// app/api/print/scope-sequence/route.js
// Aggregates everything the printable Scope & Sequence view needs in one
// call: Year Structure periods/windows (lens-level), Unit Priorities
// (subject/unit/sequence-level), and Timeline blocks (actual week ranges,
// which may have been manually adjusted from the lens/priority-derived
// defaults) -- so the printed page reflects the teacher's real, current
// plan rather than re-deriving it from scratch and risking drift.
import { sbSelect } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { computeWeekWindows } from '@/lib/year-plan'

export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const totalWeeks = Number(searchParams.get('totalWeeks')) || 36

    const [inv] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=curriculum_model&limit=1`)
    const modelKey = inv?.curriculum_model || 'subject_centered'

    const [classSetup] = await sbSelect('teacher_class_setup', `?user_id=eq.${user.id}&select=grades,subjects&limit=1`)

    const periodRows = await sbSelect('year_plan_lens_prefs', `?user_id=eq.${user.id}&model_key=eq.${encodeURIComponent(modelKey)}&select=*&order=sort_order.asc`)
    const windows = computeWeekWindows(periodRows, totalWeeks)

    const units = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&removed=eq.false&order=subject.asc,sort_order.asc`)
    const timelineBlocks = await sbSelect('timeline_units', `?user_id=eq.${user.id}&select=*&order=subject.asc,sort_order.asc`)

    return Response.json({
      modelKey,
      grades: classSetup?.grades || [],
      subjects: classSetup?.subjects || [],
      periods: windows,
      units,
      timelineBlocks,
      totalWeeks,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
