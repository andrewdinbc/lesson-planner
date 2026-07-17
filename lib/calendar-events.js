// lib/calendar-events.js
// Implements auto-scheduled district/school calendar events (fire drills,
// assemblies, PD half-days, etc.) from Aj's spec (2026-07-17): events
// extracted from uploaded staff meeting minutes / principal's "week at a
// glance" (or entered manually) get inserted directly into the Daily
// Planner for their actual date. If an event lands on top of a subject
// block that was already scheduled, that subject gets bumped to the next
// available slot for that subject rather than silently deleted -- "into
// the next dedicated spot for the subject" per Aj's wording.
//
// Scope note: this operates at the DAY level (today's/tomorrow's actual
// daily_plans blocks), which is where a single dated event like a fire
// drill really lives. It does NOT yet cascade the bump up into the Year
// Timeline's week ranges (i.e. it won't automatically push a whole unit's
// end_week out because one day's Math got bumped) -- that's a coarser,
// higher-stakes edit that should probably stay a deliberate teacher
// action on the Timeline page rather than something that happens silently
// underneath a fire drill. Flagged as a possible follow-on, not built.

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Insert a calendar event into a single day's block list as a fixed
 * block. Any existing non-fixed block it overlaps gets removed from
 * today and returned separately as "displaced" (the caller is responsible
 * for placing displaced blocks into the next available day for that
 * subject -- see findNextSlotForSubject below). Blocks after the event
 * shift later to make room, same reflow principle as everywhere else in
 * the Daily/Weekly planners.
 *
 * Returns { blocks, displaced: [{ subject, length_minutes }] }
 */
export function insertEventIntoDay(dayBlocks, event) {
  const evStart = toMinutes(event.event_time)
  const evLen = event.length_minutes || 15
  const evEnd = evStart + evLen

  const displaced = []
  const kept = dayBlocks.filter((b) => {
    if (b.fixed) return true // fixed anchors (lunch, PE, prep) are never displaced by an event -- conflicts there need a human decision, not an auto-bump
    const bStart = toMinutes(b.start_time)
    const bEnd = bStart + b.length_minutes
    const overlaps = bStart < evEnd && bEnd > evStart
    if (overlaps) {
      displaced.push({ subject: b.subject, title: b.title, length_minutes: b.length_minutes })
      return false
    }
    return true
  })

  const eventBlock = {
    id: `event_${event.id || Date.now()}`,
    start_time: event.event_time,
    length_minutes: evLen,
    subject: event.title,
    title: `📌 ${event.title}`,
    content: 'Auto-scheduled from calendar event.',
    fixed: true,
  }

  const merged = [...kept, eventBlock].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))

  // recompute times sequentially around fixed anchors, same rule as
  // lib/daily-plan.js#recomputeBlockTimes / lib/weekly-schedule.js
  let cursor = null
  const recomputed = merged.map((b) => {
    if (b.fixed) { cursor = toMinutes(b.start_time) + b.length_minutes; return b }
    if (cursor === null) cursor = toMinutes(b.start_time)
    const start_time = toHHMM(cursor)
    cursor += b.length_minutes
    return { ...b, start_time }
  })

  return { blocks: recomputed, displaced }
}

/**
 * Append a displaced subject as a new block at the end of a later day's
 * block list -- "the next dedicated spot for the subject." Simple and
 * predictable: tacks it on rather than trying to guess a smarter slot,
 * since the teacher can drag/edit it from there in Edit mode.
 */
export function appendDisplacedBlock(dayBlocks, displaced, dateStr) {
  const last = dayBlocks[dayBlocks.length - 1]
  const nextStart = last ? toHHMM(toMinutes(last.start_time) + last.length_minutes) : '09:00'
  const newBlock = {
    id: `${dateStr}_bumped_${Date.now()}`,
    start_time: nextStart,
    length_minutes: displaced.length_minutes,
    subject: displaced.subject,
    title: `${displaced.title || displaced.subject} (bumped)`,
    content: 'Moved here after a calendar event took its original slot.',
    fixed: false,
  }
  return [...dayBlocks, newBlock]
}
