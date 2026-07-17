// lib/year-plan.js
// Implements the Year Plan lens-template system from
// docs/YEAR_PLAN_LENS_TEMPLATES.md: each of the 9 curriculum models (same
// keys as lib/curriculum-models.js) has a Year Structure of 3-5 periods
// with a default % allocation. Teachers get a slider per period; raising
// one period's % pulls proportionally from the others so the set still
// sums to 100 — same normalization principle as lib/unit-priorities.js,
// one level up in the hierarchy (lens period vs. individual unit).
//
// Windowing: a period's % of the year converts to an instructional-week
// range using the same "instructional weeks available this year" input
// already collected on the Unit Priorities page. That week range becomes
// the outer boundary that unit-priority weighting operates inside for
// content generated in that period. This does NOT touch total instructional
// hours, term dates, or fixed/non-movable weekly-schedule blocks — those
// stay identical across all 9 lenses per the spec's "hard cutoffs" section.
//
// NOTE: this module intentionally does not touch MODEL_TO_FOCUS in
// lib/bc-curriculum.js — that mapping is a separate, narrower concern
// (which BC curriculum section to emphasize in the AI prompt) and is left
// as-is.

// Default Year Structure per lens, from docs/YEAR_PLAN_LENS_TEMPLATES.md
// (Grade 7 BC example percentages — teacher-adjustable via sliders).
export const LENS_TEMPLATES = {
  // Fixed 2026-07-17 (Aj): this used to be a grab-bag of unrelated topic
  // labels ("Geography & Human Systems", "Cells, Body Systems..."), which
  // read as arbitrary/random rather than standards-based. BC's own
  // curriculum site (curriculum.gov.bc.ca) structures every subject around
  // exactly three official categories -- Big Ideas, Curricular
  // Competencies, and Content -- so that's what this lens's Year Structure
  // should reflect, not a list of made-up unit topics.
  standards_based: {
    periods: [
      { label: 'Big Ideas', pct: 34 },
      { label: 'Curricular Competencies', pct: 33 },
      { label: 'Content Standards', pct: 33 },
    ],
  },
  competency_based: {
    periods: [
      { label: 'Inquiry & Questioning', pct: 20 },
      { label: 'Analyzing & Interpreting', pct: 30 },
      { label: 'Communicating', pct: 20 },
      { label: 'Applying & Innovating', pct: 30 },
    ],
  },
  inquiry_based: {
    periods: [
      { label: 'Who am I in my community?', pct: 20 },
      { label: 'How do systems shape life?', pct: 30 },
      { label: 'How does energy move?', pct: 25 },
      { label: 'How are we connected globally?', pct: 25 },
    ],
  },
  pbl: {
    periods: [
      { label: 'Build a Sustainable City', pct: 30 },
      { label: 'Create a Museum Exhibit', pct: 20 },
      { label: 'Engineer a Machine', pct: 30 },
      { label: 'Produce a Documentary', pct: 20 },
    ],
  },
  place_based: {
    periods: [
      { label: 'Local Watershed', pct: 25 },
      { label: 'Local First Nations Knowledge', pct: 25 },
      { label: 'Local Ecosystems', pct: 25 },
      { label: 'Local Industry & Global Links', pct: 25 },
    ],
  },
  theme_integrated: {
    periods: [
      { label: 'Power', pct: 25 },
      { label: 'Change', pct: 25 },
      { label: 'Systems', pct: 25 },
      { label: 'Identity', pct: 25 },
    ],
  },
  spiral: {
    periods: [
      { label: 'Ecosystems → Human Systems → Global Systems', pct: 40 },
      { label: 'Fractions → Algebra → Geometry', pct: 30 },
      { label: 'Narrative → Informational → Persuasive Writing', pct: 30 },
    ],
  },
  mastery_progressions: {
    periods: [
      { label: 'Inquiry Mastery', pct: 25 },
      { label: 'Communication Mastery', pct: 25 },
      { label: 'Numeracy Mastery', pct: 25 },
      { label: 'Scientific Reasoning Mastery', pct: 25 },
    ],
  },
  subject_centered: {
    periods: [
      { label: 'Math', pct: 20 },
      { label: 'ELA', pct: 25 },
      { label: 'Science', pct: 20 },
      { label: 'Social Studies', pct: 15 },
      { label: 'ADST', pct: 10 },
      { label: 'Arts + PHE', pct: 10 },
    ],
  },
}

/**
 * Generate the default period rows for a given lens, ready to insert on
 * first load of the Year Plan page — mirrors
 * unit-priorities.js#defaultRowsForSubjects.
 */
export function defaultPeriodsForModel(modelKey, realSubjects = null) {
  // For the Subject-Centered lens specifically, prefer the teacher's own
  // real subjects (from teacher_class_setup) over the generic hardcoded
  // template -- "Math/ELA/Science/Social Studies/ADST/Arts+PHE" was a
  // reasonable placeholder before class-setup existed, but now that we
  // know what a teacher actually teaches, showing anything else is
  // actively wrong (e.g. a teacher who doesn't teach ADST would see an
  // ADST period they never asked for). Falls back to the template only
  // when no real subjects are available yet.
  if (modelKey === 'subject_centered' && realSubjects && realSubjects.length > 0) {
    const pct = Math.round((100 / realSubjects.length) * 10) / 10
    return realSubjects.map((subj, i) => ({
      model_key: modelKey,
      period_label: subj,
      period_pct: pct,
      sort_order: i,
    }))
  }

  const template = LENS_TEMPLATES[modelKey]
  if (!template) return []
  return template.periods.map((p, i) => ({
    model_key: modelKey,
    period_label: p.label,
    period_pct: p.pct,
    sort_order: i,
  }))
}

/**
 * Normalize a set of period rows (after a slider change) so their pct
 * values sum to 100 again. Same principle as unit-priorities.js
 * toSubjectWeights: raising one period pulls proportionally from the
 * others. Call this after any single-period edit, passing the full set
 * for that model_key.
 */
export function normalizePeriods(periodRows) {
  const total = periodRows.reduce((sum, p) => sum + Number(p.period_pct || 0), 0)
  if (total === 0) return periodRows

  // Interdisciplinary override (Aj, 2026-07-17): a period a teacher marks
  // as "I teach this interdisciplinary" is allowed to overlap with others
  // instead of being forced to share a strict 100% pie -- e.g. a Science
  // unit taught inside Language Arts time legitimately counts toward both.
  // When any period is flagged this way, skip the proportional
  // redistribution entirely (it would fight the intentional overlap) and
  // just cap the raw total at 135% so it can't run away unbounded.
  const hasInterdisciplinary = periodRows.some((p) => p.interdisciplinary)
  if (hasInterdisciplinary) {
    return capInterdisciplinaryTotal(periodRows)
  }

  return periodRows.map((p) => ({ ...p, period_pct: (Number(p.period_pct) / total) * 100 }))
}

// Hard ceiling for total year coverage when interdisciplinary overlap is in
// play. 100% is "normal", up to 135% is allowed for legitimate overlap,
// beyond that is scaled back down proportionally across ALL periods (not
// just the interdisciplinary ones) so a teacher can't game the number by
// stacking many overlapping subjects.
const INTERDISCIPLINARY_MAX_TOTAL_PCT = 135

export function capInterdisciplinaryTotal(periodRows) {
  const total = periodRows.reduce((sum, p) => sum + Number(p.period_pct || 0), 0)
  if (total <= INTERDISCIPLINARY_MAX_TOTAL_PCT || total === 0) return periodRows
  const scale = INTERDISCIPLINARY_MAX_TOTAL_PCT / total
  return periodRows.map((p) => ({ ...p, period_pct: Number(p.period_pct) * scale }))
}

/**
 * Windowing math: convert each period's normalized % into an
 * instructional-week range, given the total instructional weeks available
 * this year (same input already collected on the Unit Priorities page).
 * Periods are laid out sequentially in sort_order. Returns each period
 * with { startWeek, endWeek, weekCount } added — 1-indexed, inclusive.
 */
export function computeWeekWindows(periodRows, totalInstructionalWeeksAvailable) {
  if (!totalInstructionalWeeksAvailable || !periodRows.length) return []
  const sorted = [...periodRows].sort((a, b) => a.sort_order - b.sort_order)
  const total = sorted.reduce((sum, p) => sum + Number(p.period_pct || 0), 0) || 100

  let cursor = 1
  const windows = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    const isLast = i === sorted.length - 1
    const weekCount = isLast
      ? totalInstructionalWeeksAvailable - cursor + 1
      : Math.max(1, Math.round((Number(p.period_pct) / total) * totalInstructionalWeeksAvailable))
    const startWeek = cursor
    const endWeek = Math.min(totalInstructionalWeeksAvailable, cursor + weekCount - 1)
    windows.push({ ...p, startWeek, endWeek, weekCount: endWeek - startWeek + 1 })
    cursor = endWeek + 1
    if (cursor > totalInstructionalWeeksAvailable) break
  }
  return windows
}

/**
 * Given a specific instructional week number, find which lens period it
 * falls inside. Used when generating Month/Week/Day content for that week
 * so generation can pull the correct period anchor (project, driving
 * question, theme, subject, etc.) and stay within that period's window.
 */
export function periodForWeek(periodWindows, weekNumber) {
  return periodWindows.find((w) => weekNumber >= w.startWeek && weekNumber <= w.endWeek) || null
}

