// lib/daily-plan.js
// Implements the Daily Planner (app/day/page.js), the day-level layer that
// sits below the Weekly Schedule Builder's recurring template. Each real
// calendar date gets its OWN editable copy of that day-of-week's template
// blocks -- so editing "Math 1" to "Math 1: fractions review" on a
// specific Tuesday doesn't touch the recurring Tuesday template, and next
// Tuesday still starts fresh from the template. This is what makes the
// day view genuinely dynamic per Aj's spec (2026-07-17): expandable block
// length, inline-editable content, and a way to swap the activity on a
// block, all per-date rather than mutating the shared weekly shape.
//
// Also builds the printable substitute/TTOC day plan from the same block
// data, in the format of Aj's real TTOC template (see the uploaded scan,
// 2026-07-17): thank-you note, numbered notes list, time-blocked table.

const DAY_INDEX_TO_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Given a weekly_schedules.grid (the recurring Mon-Fri template) and a
 * specific calendar date, pull that date's day-of-week column and turn it
 * into a fresh, independently-editable block list for daily_plans.blocks.
 * Returns [] if the date falls on a weekend or the template has no blocks
 * for that day (nothing to seed from -- the teacher builds it manually).
 */
export function seedDayFromWeeklyTemplate(weeklyGrid, dateStr) {
  if (!weeklyGrid || !dateStr) return []
  const date = new Date(dateStr + 'T00:00:00')
  const dayName = DAY_INDEX_TO_NAME[date.getDay()]
  const dayBlocks = weeklyGrid[dayName] || []
  return dayBlocks.map((b, i) => ({
    id: `${dateStr}_${i}`,
    start_time: b.start_time,
    length_minutes: b.length_minutes,
    subject: b.subject,
    title: b.label || b.subject,
    content: '', // free-text detail, e.g. "fractions review" -- blank until the teacher fills it in for this specific day
    fixed: !!b.fixed,
  }))
}

// How much a block's length changes per expand/shrink click. Kept to a
// clean 5-minute increment rather than pixel-based dragging -- simpler
// and more reliable to click repeatedly than to drag an edge precisely,
// while still being fully dynamic per the spec.
const RESIZE_STEP_MINUTES = 5
const MIN_BLOCK_MINUTES = 5

export function resizeBlock(block, direction) {
  const delta = direction === 'grow' ? RESIZE_STEP_MINUTES : -RESIZE_STEP_MINUTES
  const length_minutes = Math.max(MIN_BLOCK_MINUTES, block.length_minutes + delta)
  return { ...block, length_minutes }
}

/**
 * Recompute start_time for every block in order after any edit (resize,
 * reorder, insert, delete) so the day's blocks always sit back-to-back
 * with no gaps or overlaps -- same "everything shifts to make room"
 * behavior as the Weekly Schedule Builder's drag-reflow, just triggered
 * by a resize/edit here instead of a drag.
 */
export function recomputeBlockTimes(blocks) {
  if (!blocks.length) return blocks
  let cursor = toMinutes(blocks[0].start_time)
  return blocks.map((b) => {
    const start_time = toHHMM(cursor)
    cursor += b.length_minutes
    return { ...b, start_time }
  })
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

// Common quick-pick activities for the "change the activity" swap menu on
// a block -- teacher can still type anything free-text; this is just a
// fast path for the things that come up most.
export const QUICK_ACTIVITIES = [
  'Math', 'Language Arts', 'Science', 'Social Studies', 'Physical Education',
  'Art', 'Music', 'French', 'ADST', 'Read to Self', 'Snack', 'Brain Break',
  'Community Time', 'Prep', 'Assembly', 'Field Trip',
]

/**
 * Render a day's blocks + ttoc_notes into the plain-text/markdown shape
 * of Aj's real TTOC template (thank-you note, 5 standard numbered notes,
 * time-blocked table) for the printable /print/ttoc-day page. Returns
 * structured data (not raw markdown) so the print page controls layout;
 * this just does the content assembly.
 */
export function buildTtocPlan(dayLabel, blocks, ttocNotes) {
  const notes = ttocNotes || {}
  return {
    dayLabel,
    standardNotes: [
      notes.duty ? `Duty: ${notes.duty}` : null,
      'Please see the principal for information on behavior designations in the school.',
      "Students do not come to the outside door -- have them go to their desks or lockers.",
      notes.reliableStudents ? `Some reliable students to lean on in case: ${notes.reliableStudents}` : null,
      notes.specialAttention ? `Special attention (excited or energetic behavior): ${notes.specialAttention}` : null,
    ].filter(Boolean),
    customNotes: notes.customNotes || '',
    blocks,
  }
}
