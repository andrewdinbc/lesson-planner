// lib/weekly-schedule.js
// Auto-populates a weekly schedule grid from a teacher's fixed constraints +
// subject priorities, and provides the reflow logic for drag-and-drop
// reordering. This is the Weekly Schedule Builder from
// docs/TEACHER_PLANNER_DAILY_PLANNER_SPEC.md, wired to the windowing model
// from docs/YEAR_PLAN_LENS_TEMPLATES.md: whatever lens period + unit
// priorities are active for "this week" determine how much of the
// non-fixed time goes to each subject.

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

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
 * Build the raw list of open time slots per day, after removing lunch and
 * chopping the day into block_length_minutes chunks.
 */
function buildDaySlots(prefs) {
  const start = toMinutes(prefs.school_start_time)
  const end = toMinutes(prefs.school_end_time)
  const lunchStart = toMinutes(prefs.lunch_start_time)
  const lunchEnd = lunchStart + prefs.lunch_duration_minutes
  const blockLen = prefs.block_length_minutes || 45

  const slots = []
  let cursor = start
  while (cursor + blockLen <= end) {
    const slotEnd = cursor + blockLen
    // skip anything that overlaps lunch - lunch itself gets inserted as its own fixed block below
    if (!(cursor < lunchEnd && slotEnd > lunchStart)) {
      slots.push({ start_time: toHHMM(cursor), length_minutes: blockLen })
    }
    cursor = slotEnd
  }
  return { slots, lunchStart, lunchEnd }
}

/**
 * Place fixed blocks (PE, Library, non-contact, banded literacy) onto their
 * declared day/time. These are locked - drag can move everything else
 * around them but not swap their slot without an explicit override.
 */
function placeFixedBlocks(prefs) {
  const byDay = Object.fromEntries(DAYS.map((d) => [d, []]))
  for (const block of prefs.fixed_blocks || []) {
    if (!byDay[block.day]) continue
    byDay[block.day].push({
      id: `fixed_${block.day}_${block.start_time}`,
      subject: block.subject,
      label: block.label || block.subject,
      start_time: block.start_time,
      length_minutes: block.length_minutes,
      fixed: true,
    })
  }
  // lunch is always fixed too
  for (const day of DAYS) {
    byDay[day].push({
      id: `lunch_${day}`,
      subject: 'Lunch',
      label: 'Lunch',
      start_time: prefs.lunch_start_time,
      length_minutes: prefs.lunch_duration_minutes,
      fixed: true,
    })
  }
  return byDay
}

/**
 * Fill remaining open slots with subject blocks, proportioned by
 * unitPriorities (e.g. { Math: 0.3, 'Language Arts': 0.3, Science: 0.15, ... }
 * summing to 1). If am_core_preference is true, Language Arts + Math get
 * first claim on morning slots (before lunch) ahead of other subjects.
 */
function fillSubjectBlocks(prefs, unitPriorities, byDay) {
  const CORE = ['Language Arts', 'Mathematics']
  const { slots } = buildDaySlots(prefs)
  const totalOpenSlots = slots.length * DAYS.length - (prefs.prep_periods_per_week || 0)

  // convert priority shares into a target slot count per subject, largest remainder method
  const subjects = Object.keys(unitPriorities)
  const raw = subjects.map((s) => unitPriorities[s] * totalOpenSlots)
  const counts = raw.map(Math.floor)
  let remaining = totalOpenSlots - counts.reduce((a, b) => a + b, 0)
  const remainders = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < remaining; k++) counts[remainders[k % remainders.length].i]++
  const targetCount = Object.fromEntries(subjects.map((s, i) => [s, counts[i]]))

  // build a flat queue of (day, slot) positions in AM-first order per day if am_core_preference
  const queue = []
  for (const day of DAYS) {
    const morning = slots.filter((s) => toMinutes(s.start_time) < toMinutes(prefs.lunch_start_time))
    const afternoon = slots.filter((s) => toMinutes(s.start_time) >= toMinutes(prefs.lunch_start_time))
    for (const s of morning) queue.push({ day, ...s, period: 'AM' })
    for (const s of afternoon) queue.push({ day, ...s, period: 'PM' })
  }

  // remove slots already consumed by fixed blocks (same day+start_time)
  const occupied = new Set()
  for (const day of DAYS) for (const b of byDay[day]) occupied.add(`${day}_${b.start_time}`)
  const openQueue = queue.filter((s) => !occupied.has(`${s.day}_${s.start_time}`))

  // assign core subjects to AM slots first if preference is set, then everything else
  const remainingTarget = { ...targetCount }
  const assignOrder = prefs.am_core_preference
    ? [...openQueue.filter((s) => s.period === 'AM'), ...openQueue.filter((s) => s.period === 'PM')]
    : openQueue

  let subjectCycle = subjects.filter((s) => remainingTarget[s] > 0)
  let cursor = 0
  for (const slot of assignOrder) {
    if (!subjectCycle.length) break
    // prefer core subjects in AM if preference set and any core still has quota
    let chosen
    if (prefs.am_core_preference && slot.period === 'AM') {
      chosen = CORE.find((c) => remainingTarget[c] > 0)
    }
    if (!chosen) {
      // round-robin through subjects with remaining quota
      let tries = 0
      while (tries < subjectCycle.length) {
        const candidate = subjectCycle[cursor % subjectCycle.length]
        cursor++
        tries++
        if (remainingTarget[candidate] > 0) { chosen = candidate; break }
      }
    }
    if (!chosen) continue
    remainingTarget[chosen]--
    byDay[slot.day].push({
      id: `sub_${slot.day}_${slot.start_time}`,
      subject: chosen,
      label: chosen,
      start_time: slot.start_time,
      length_minutes: slot.length_minutes,
      fixed: false,
    })
    subjectCycle = subjects.filter((s) => remainingTarget[s] > 0)
  }

  // sort each day by start time
  for (const day of DAYS) byDay[day].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
  return byDay
}

/**
 * Main entry point: generate a full weekly grid from prefs + unit priorities.
 * unitPriorities should come from whatever subject priority sliders are
 * active for the current lens period (see Unit Priority spec) - falls back
 * to an even split across the teacher's selected subjects if none given.
 */
export function generateWeeklyGrid(prefs, unitPriorities) {
  if (!prefs?.school_start_time || !prefs?.school_end_time || !prefs?.lunch_start_time) {
    throw new Error('Missing required schedule prefs: school_start_time, school_end_time, lunch_start_time')
  }
  const byDay = placeFixedBlocks(prefs)
  return fillSubjectBlocks(prefs, unitPriorities, byDay)
}

/**
 * Reflow logic for drag-and-drop: moving `blockId` to a new position within
 * `day`'s column shifts every block after the drop point later by however
 * long the dragged block is, wrapping around fixed blocks (fixed blocks
 * don't move, but non-fixed blocks reflow around them). This mirrors the
 * "drag a block, everything else in that column shifts down" spec.
 */
export function reorderDayColumn(dayBlocks, blockId, newIndex) {
  const blocks = [...dayBlocks]
  const fromIndex = blocks.findIndex((b) => b.id === blockId)
  if (fromIndex === -1) return dayBlocks
  const [moved] = blocks.splice(fromIndex, 1)
  blocks.splice(newIndex, 0, moved)

  // recompute start_time sequentially from the first block's original start,
  // skipping fixed blocks' own times (they anchor, everything else flows
  // around them in order)
  let cursor = toMinutes(blocks[0].fixed ? blocks[0].start_time : dayBlocks[0].start_time)
  return blocks.map((b) => {
    if (b.fixed) {
      cursor = toMinutes(b.start_time) + b.length_minutes
      return b
    }
    const start_time = toHHMM(cursor)
    cursor += b.length_minutes
    return { ...b, start_time }
  })
}
