// lib/print-planner.js
// Powers the printable Content | Resources | Assessment planner
// (app/print/unit-planner). Two jobs:
//
// 1. Group a subject's Timeline blocks into print-ready periods of at
//    least `minWeeks` (default 13, ~3 months) each -- curriculum-lens-
//    driven the same way scope-sequence is, not arbitrary calendar
//    slicing. Short, adjacent units get bundled into one themed period;
//    a unit that's already >= minWeeks stands alone.
// 2. Convert an instructional week number into a real calendar date,
//    walking forward day-by-day and skipping weekends AND any known
//    break range (winter/spring break) -- so a period's printed date
//    range reflects actual instructional time, not a naive +7-days-per-
//    week estimate that ignores breaks entirely.

export function groupUnitsIntoPrintPeriods(timelineBlocks, minWeeks = 13) {
  const bySubject = timelineBlocks.reduce((acc, b) => {
    (acc[b.subject] ||= []).push(b)
    return acc
  }, {})

  const periods = []
  for (const [subject, blocks] of Object.entries(bySubject)) {
    const sorted = [...blocks].sort((a, b) => a.start_week - b.start_week)
    let current = null
    for (const b of sorted) {
      if (!current) {
        current = { subject, blocks: [b], startWeek: b.start_week, endWeek: b.end_week }
        continue
      }
      const currentSpan = current.endWeek - current.startWeek + 1
      if (currentSpan < minWeeks) {
        // Still short of a full period -- fold this block in.
        current.blocks.push(b)
        current.endWeek = Math.max(current.endWeek, b.end_week)
      } else {
        periods.push(current)
        current = { subject, blocks: [b], startWeek: b.start_week, endWeek: b.end_week }
      }
    }
    if (current) periods.push(current)
  }
  return periods
}

// Best-effort parse of a free-text break string (from the AI-parsed
// school calendar PDF, e.g. "Dec. 20 - Jan. 2" or "March 16 to March 27")
// into {start: Date, end: Date}. schoolYear like "2026-27" disambiguates
// which calendar year December/January/March fall in. Returns null if it
// can't confidently parse -- callers should treat that as "no break data,
// don't skip anything" rather than guessing.
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

export function parseBreakRange(str, schoolYear) {
  if (!str) return null
  const [yearA, yearB] = (schoolYear || '').split(/[-–]/).map((y) => {
    const n = parseInt(y, 10)
    return n < 100 ? 2000 + n : n
  })
  const re = /([A-Za-z]{3,})[a-z]*\.?\s*(\d{1,2})/g
  const matches = [...str.matchAll(re)]
  if (matches.length < 2) return null

  const toDate = (monthStr, day) => {
    const key = monthStr.slice(0, 3).toLowerCase()
    const month = MONTHS[key]
    if (month === undefined) return null
    // Sept-Dec -> first year of the school year; Jan-Aug -> second year.
    const year = month >= 8 ? (yearA || new Date().getFullYear()) : (yearB || yearA + 1 || new Date().getFullYear())
    return new Date(year, month, parseInt(day, 10))
  }

  const start = toDate(matches[0][1], matches[0][2])
  const end = toDate(matches[1][1], matches[1][2])
  if (!start || !end || isNaN(start) || isNaN(end)) return null
  return { start, end }
}

function isWithinRange(date, range) {
  return range && date >= range.start && date <= range.end
}

// Walks forward from schoolOpeningDate counting instructional days
// (Mon-Fri, excluding any date inside breakRanges) until it reaches the
// requested instructional week's first day. weekNumber is 1-indexed,
// matching the rest of the app's timeline/week convention.
export function instructionalWeekToDate(weekNumber, schoolOpeningDate, breakRanges = []) {
  if (!schoolOpeningDate) return null
  const target = (weekNumber - 1) * 5 + 1 // 1st instructional day of that week
  let cursor = new Date(schoolOpeningDate)
  let count = 0
  let safety = 0
  while (count < target && safety < 3000) {
    const day = cursor.getDay()
    const isWeekend = day === 0 || day === 6
    const isBreak = breakRanges.some((r) => isWithinRange(cursor, r))
    if (!isWeekend && !isBreak) count++
    if (count >= target) break
    cursor.setDate(cursor.getDate() + 1)
    safety++
  }
  return cursor
}

export function formatDateShort(date) {
  if (!date) return null
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Human label for a print period, e.g. "Sept 4, 2026 – Dec 12, 2026 (~3.5 months)".
// Notes any break that falls inside the range so the printed date span is
// self-explanatory rather than looking like a miscalculated gap.
export function periodDateLabel(startWeek, endWeek, schoolOpeningDate, breakRanges = [], breakLabels = {}) {
  const start = instructionalWeekToDate(startWeek, schoolOpeningDate, breakRanges)
  const end = instructionalWeekToDate(endWeek, schoolOpeningDate, breakRanges)
  if (!start || !end) return `Weeks ${startWeek}\u2013${endWeek}`
  const months = Math.round(((end - start) / (1000 * 60 * 60 * 24 * 30)) * 2) / 2
  const includedBreaks = Object.entries(breakLabels).filter(([, range]) => range && range.start <= end && range.end >= start)
  const breakNote = includedBreaks.length ? ` (includes ${includedBreaks.map(([name]) => name).join(', ')})` : ''
  return `${formatDateShort(start)} \u2013 ${formatDateShort(end)} (~${months} months)${breakNote}`
}
