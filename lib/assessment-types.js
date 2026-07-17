// lib/assessment-types.js
// Implements "assessment types" from Aj's remaining-items list (2026-07-16):
// tag each unit with an assessment type (global default + per-unit
// override), and as the unit's end approaches, surface a reminder nudging
// the teacher to either build the assessment themselves or upgrade to have
// it AI-generated. No grammar check, plagiarism detection, or
// AI-detection features -- explicitly out of scope per Aj's spec.

export const ASSESSMENT_TYPES = [
  { key: 'quiz', label: 'Quiz', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build a quiz' },
  { key: 'test', label: 'Test', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build a test' },
  { key: 'project', label: 'Project', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build a project rubric' },
  { key: 'presentation', label: 'Presentation', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build a presentation rubric' },
  { key: 'observation', label: 'Observation / Checklist', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build an observation checklist' },
  { key: 'portfolio', label: 'Portfolio Piece', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build a portfolio criteria sheet' },
  { key: 'performance_task', label: 'Performance Task', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build a performance task' },
  { key: 'exit_ticket', label: 'Exit Ticket', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build an exit ticket' },
  { key: 'peer_self', label: 'Peer / Self Assessment', guidedLink: 'https://optimizeyourfreedom.com/assessment-tool', guidedLabel: 'Build a peer/self assessment' },
]

export function labelForType(key) {
  return ASSESSMENT_TYPES.find((t) => t.key === key)?.label || key
}

// How many weeks out from a unit's end_week to start nudging. Two weeks
// gives enough runway to actually build or buy the assessment before the
// unit wraps, without nagging from week one.
const REMINDER_WINDOW_WEEKS = 2

/**
 * Approximate current instructional week from the teacher's uploaded
 * district calendar's school opening date. Deliberately simple (raw
 * calendar weeks since opening, not break-adjusted instructional weeks)
 * -- good enough for "is this unit ending soon" nudges, not precise
 * scheduling math. Returns null if no opening date is on file yet.
 */
export function currentInstructionalWeek(schoolOpeningDate) {
  if (!schoolOpeningDate) return null
  const start = new Date(schoolOpeningDate)
  const now = new Date()
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return null
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

/**
 * Reminder status for a single timeline block, given the current
 * instructional week. 'due' = unit has ended or ends this week and has no
 * assessment type set yet is still worth flagging; 'upcoming' = inside the
 * reminder window; null = not yet relevant, or nothing to flag (assessment
 * type already set AND far from ending is fine -- reminder isn't about
 * whether a type is *tagged*, it's about whether the actual assessment
 * has been built, which this app can't know, so it always nudges near the
 * end regardless of tagging status).
 */
export function reminderStatus(currentWeek, endWeek) {
  if (currentWeek == null || endWeek == null) return null
  const weeksOut = endWeek - currentWeek
  if (weeksOut < 0) return 'due' // unit already ended
  if (weeksOut <= REMINDER_WINDOW_WEEKS) return 'upcoming'
  return null
}
