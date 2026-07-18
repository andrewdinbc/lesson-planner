// app/api/print/unit-planner/route.js
// Assembles the data for the printable Content | Resources | Assessment
// planner (app/print/unit-planner), styled after Aj's uploaded 3-Month
// Math Planner sample. Curriculum-lens-driven grouping (via
// lib/print-planner's groupUnitsIntoPrintPeriods, same >=3-month-period
// idea as the Timeline/Scope&Sequence pages), break-aware date ranges.
import { getCurrentUser } from '@/lib/session'
import { sbSelect } from '@/lib/supabase'
import { groupUnitsIntoPrintPeriods, parseBreakRange, periodDateLabel } from '@/lib/print-planner'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const [inv] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=school_calendar_summary&limit=1`)
    const calendar = inv?.school_calendar_summary || {}
    const days = calendar.daysOfInstruction
    const totalWeeks = days ? Math.round(days / 5) : 36

    const units = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&removed=eq.false&select=*`)
    let timelineBlocks = await sbSelect('timeline_units', `?user_id=eq.${user.id}&select=*&order=subject.asc,sort_order.asc`)

    const winterBreak = parseBreakRange(calendar.winterVacation, calendar.schoolYear)
    const springBreak = parseBreakRange(calendar.springVacation, calendar.schoolYear)
    const breakRanges = [winterBreak, springBreak].filter(Boolean)
    const breakLabels = { 'Winter Break': winterBreak, 'Spring Break': springBreak }

    const periods = groupUnitsIntoPrintPeriods(timelineBlocks, 13) // >= ~3 months per period

    const unitByKey = new Map(units.map((u) => [`${u.subject}::${u.unit_name}`, u]))

    const printPeriods = periods.map((period) => {
      const periodUnits = period.blocks
        .map((b) => unitByKey.get(`${b.subject}::${b.unit_name}`))
        .filter(Boolean)

      // Content split: units taught to both grades of a split class go in
      // the middle "Both Grades" column; single-grade units go under
      // their own grade column.
      const gradeSet = new Set(periodUnits.flatMap((u) => u.grades || []))
      const grades = [...gradeSet].sort()
      const bothGrades = periodUnits.filter((u) => (u.grades || []).length > 1)
      const perGrade = {}
      for (const g of grades) {
        perGrade[g] = periodUnits.filter((u) => (u.grades || []).length === 1 && u.grades[0] === g)
      }

      return {
        subject: period.subject,
        dateLabel: periodDateLabel(period.startWeek, period.endWeek, calendar.schoolOpeningDate, breakRanges, breakLabels),
        startWeek: period.startWeek,
        endWeek: period.endWeek,
        grades,
        content: { bothGrades, perGrade },
        resources: periodUnits.flatMap((u) => (u.resources || []).map((r) => ({ ...r, unit_name: u.unit_name }))),
        assessment: periodUnits.flatMap((u) => (u.assessment_practices || []).map((p) => ({ ...p, unit_name: u.unit_name }))),
        unitNames: periodUnits.map((u) => u.unit_name),
      }
    })

    return Response.json({ printPeriods, totalWeeks, schoolYear: calendar.schoolYear || null })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
