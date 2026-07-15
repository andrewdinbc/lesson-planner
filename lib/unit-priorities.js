// lib/unit-priorities.js
// Implements the priority-slider mechanic from
// docs/UNIT_PRIORITY_SCHEDULING_SPEC.md: all units start equal, teacher
// sliders shift relative weight, and normalized weights convert into the
// unitPriorities object the Weekly Schedule Builder (lib/weekly-schedule.js)
// consumes to proportion time across subjects.

// Default unit breakdown per subject. Language Arts = 3 strands (Reading,
// Writing, Oral Language). Math and everything else follow the curriculum
// document's own content structure - since that's fetched live per
// grade from BC's curriculum site, these are reasonable defaults a teacher
// can prune/rename via the removed flag rather than a hardcoded truth.
export const DEFAULT_UNITS = {
  'Language Arts': ['Reading', 'Writing', 'Oral Language'],
  'Mathematics': ['Number', 'Patterns & Algebra', 'Geometry & Measurement', 'Data & Probability'],
  'Science': ['Life Science', 'Physical Science', 'Earth & Space Science'],
  'Social Studies': ['Government & Society', 'History', 'Geography', 'Global Issues'],
  'Physical Education': ['Movement Skills', 'Health & Well-Being'],
  'Art': ['Visual Arts'],
  'Music': ['Music'],
  'French': ['Core French'],
  'Health & Career Education': ['Career Education'],
  'Applied Design, Skills & Technologies': ['Design', 'Technology'],
}

// LA and Math are always high-scrutiny (full unit breakdown + sliders).
// Everything else defaults to light treatment unless the teacher opts a
// subject in - per the spec's opt-in escalation rule.
export const ALWAYS_HIGH_SCRUTINY = ['Language Arts', 'Mathematics']

/**
 * Convert a flat list of unit_priorities rows into the normalized
 * subject-level weights the Weekly Schedule Builder needs, i.e.
 * { 'Language Arts': 0.3, 'Mathematics': 0.3, ... } summing to 1.
 * Removed units and subjects the teacher isn't teaching are excluded.
 * Subject weight = sum of that subject's (non-removed) unit priorities.
 */
export function toSubjectWeights(unitPriorityRows) {
  const bySubject = {}
  for (const row of unitPriorityRows) {
    if (row.removed) continue
    bySubject[row.subject] = (bySubject[row.subject] || 0) + Number(row.priority)
  }
  const total = Object.values(bySubject).reduce((a, b) => a + b, 0)
  if (total === 0) return {}
  const weights = {}
  for (const subject in bySubject) weights[subject] = bySubject[subject] / total
  return weights
}

/**
 * Generate the default (all-equal-priority) row set for a teacher's
 * selected subjects, ready to insert on first load of the Units page.
 */
export function defaultRowsForSubjects(subjects) {
  const rows = []
  for (const subject of subjects) {
    const units = DEFAULT_UNITS[subject] || [subject]
    for (const unit_name of units) {
      rows.push({
        subject,
        unit_name,
        priority: 1,
        high_scrutiny: ALWAYS_HIGH_SCRUTINY.includes(subject),
        removed: false,
      })
    }
  }
  return rows
}

/**
 * Mismatch check: compares total prioritized instructional "weight" against
 * available instructional hours/weeks for the year. Returns a warning
 * object if priorities imply more time than exists, or null if it fits.
 * This is a first-pass check per UNIT_PRIORITY_SCHEDULING_SPEC.md - the
 * spec notes a second check may be needed after Weekly Schedule Builder
 * output is known; this only implements the first (priority-setting) pass.
 */
export function checkMismatch(unitPriorityRows, totalInstructionalWeeksAvailable) {
  const activeUnits = unitPriorityRows.filter((r) => !r.removed)
  if (!activeUnits.length || !totalInstructionalWeeksAvailable) return null

  // Simple model: each unit needs at least ~1 week of dedicated time to be
  // meaningfully taught; if the number of active units exceeds available
  // weeks even before accounting for priority weighting, that's a hard
  // mismatch worth surfacing. (Priority weighting affects *how* the weeks
  // are split, not whether there are enough of them in the first place.)
  const minWeeksNeeded = activeUnits.length
  if (minWeeksNeeded > totalInstructionalWeeksAvailable) {
    return {
      type: 'overcommitted',
      message: `You have ${activeUnits.length} active units but only ${totalInstructionalWeeksAvailable} instructional weeks this year. Consider removing some units or accepting a compressed pace.`,
      activeUnitCount: activeUnits.length,
      weeksAvailable: totalInstructionalWeeksAvailable,
    }
  }
  return null
}
