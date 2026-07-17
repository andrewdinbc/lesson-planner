// lib/timeline.js
// Implements the Premiere-style Year Timeline from Aj's spec (2026-07-16):
// a horizontal timeline across the school year, one colored track per
// subject, units as draggable/resizable blocks within their subject's
// track. Subjects do NOT need to span the full year (e.g. Social Studies
// first half, Science second half is valid) -- tracks are independent.
//
// This sits one level below lib/year-plan.js's lens periods: year-plan.js
// answers "what % of the year is Math vs ELA" at the lens/period level,
// while this answers "which specific unit is being taught which week"
// inside a subject's own track. The two are seeded from the same
// unit_priorities rows (lib/unit-priorities.js) so a teacher's priority
// sliders translate into sensible starting block widths here, but once
// seeded the timeline is fully teacher-adjustable and independent -- this
// is a revisitable planning surface, not a one-time derived view.

// Stable per-subject track colors (matches the ecosystem's warm/navy
// palette from lib/theme.js while giving each subject enough visual
// distinction to read at a glance, like V1/V2/V3 tracks in a video editor).
export const SUBJECT_COLORS = {
  'Language Arts': '#2f6f9f',
  'Mathematics': '#b57c2a',
  'Science': '#1a7a3e',
  'Social Studies': '#a33',
  'Physical Education': '#6a4c93',
  'Art': '#c9698a',
  'Music': '#3d8b8b',
  'French': '#7a5a1e',
  'Health & Career Education': '#5b7a8c',
  'Applied Design, Skills & Technologies': '#8a6d3b',
}
const FALLBACK_PALETTE = ['#4a6fa5', '#a55a4a', '#4aa578', '#8a4aa5', '#a58e4a']

export function colorForSubject(subject, indexIfUnknown = 0) {
  return SUBJECT_COLORS[subject] || FALLBACK_PALETTE[indexIfUnknown % FALLBACK_PALETTE.length]
}

/**
 * Seed default timeline blocks from a teacher's unit_priorities rows.
 * Each subject gets its own track; that subject's non-removed units are
 * laid out sequentially, each one's week-width proportional to its
 * priority weight within the subject (same relative-weight principle as
 * unit-priorities.js#toSubjectWeights, applied within one subject instead
 * of across all subjects). Every subject's track spans the full year by
 * default -- the teacher can then drag to create gaps/uneven coverage
 * (e.g. Social Studies half-year / Science half-year) from this even
 * starting point rather than us guessing an uneven split.
 */
export function seedTimelineFromUnits(unitPriorityRows, totalInstructionalWeeksAvailable) {
  const totalWeeks = totalInstructionalWeeksAvailable || 36
  const bySubject = {}
  for (const row of unitPriorityRows) {
    if (row.removed) continue
    ;(bySubject[row.subject] ||= []).push(row)
  }

  const blocks = []
  let subjectIndex = 0
  for (const subject in bySubject) {
    const units = bySubject[subject]
    const totalPriority = units.reduce((sum, u) => sum + Number(u.priority || 1), 0) || units.length
    const color = colorForSubject(subject, subjectIndex)
    subjectIndex++

    let cursor = 1
    units.forEach((u, i) => {
      const isLast = i === units.length - 1
      const weekCount = isLast
        ? Math.max(1, totalWeeks - cursor + 1)
        : Math.max(1, Math.round((Number(u.priority || 1) / totalPriority) * totalWeeks))
      const startWeek = cursor
      const endWeek = Math.min(totalWeeks, cursor + weekCount - 1)
      blocks.push({
        subject,
        unit_name: u.unit_name,
        color,
        start_week: startWeek,
        end_week: Math.max(startWeek, endWeek),
        sort_order: i,
      })
      cursor = endWeek + 1
    })
  }
  return blocks
}

/**
 * Clamp a single block's proposed start/end week to valid bounds (1..totalWeeks,
 * minimum 1 week wide). Used both after a drag-move and a resize-handle drag,
 * before persisting, so a fast/sloppy drag can never save an invalid range.
 */
export function clampBlock(block, totalWeeks) {
  let start = Math.round(block.start_week)
  let end = Math.round(block.end_week)
  if (end < start) end = start
  start = Math.max(1, Math.min(start, totalWeeks))
  end = Math.max(start, Math.min(end, totalWeeks))
  return { ...block, start_week: start, end_week: end }
}

/**
 * Resolve overlaps within a single subject track after a move/resize:
 * the block the teacher just dragged (movedId) keeps its new position
 * as-is (teacher intent wins), and any other block in the same track
 * that now overlaps it gets pushed clear -- shrunk from whichever side
 * touches the moved block, never silently deleted. Gaps between blocks
 * are left alone (gaps are valid: half-year subjects, etc.).
 */
export function resolveTrackOverlaps(trackBlocks, movedId, totalWeeks) {
  const moved = trackBlocks.find((b) => b.id === movedId || b._localId === movedId)
  if (!moved) return trackBlocks
  return trackBlocks.map((b) => {
    if (b === moved) return clampBlock(moved, totalWeeks)
    const overlapsRight = b.start_week <= moved.end_week && b.start_week >= moved.start_week
    const overlapsLeft = b.end_week >= moved.start_week && b.end_week <= moved.end_week
    const engulfed = b.start_week >= moved.start_week && b.end_week <= moved.end_week
    if (engulfed) return null // fully covered by the moved block -- collapse it rather than leave a zero-width sliver
    if (overlapsRight) return clampBlock({ ...b, start_week: moved.end_week + 1 }, totalWeeks)
    if (overlapsLeft) return clampBlock({ ...b, end_week: moved.start_week - 1 }, totalWeeks)
    return b
  }).filter(Boolean)
}
