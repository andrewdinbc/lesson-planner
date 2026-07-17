// lib/language-arts-categories.js
// Splits Language Arts units into three sections per Aj's instruction
// (2026-07-17): Reading, Writing, Oral Language Fluency. Some unit content
// legitimately touches more than one area (e.g. a "Reader's Theatre" unit
// is both reading and oral) -- when a unit's text matches more than one
// category, it goes to Reading, never to Oral Language Fluency, per Aj's
// explicit instruction ("if they overlap put them in reading not oral
// language"). Reading is also the safe fallback when nothing matches.

const WRITING_PATTERN = /writing|composition|compose|paragraph|essay|persuasive|narrative writing|informational writing|opinion writing|spelling|grammar|sentence structure|journal(?:ing|s)?\b/i
const ORAL_PATTERN = /oral|speaking|listening|presentation|discussion|debate|storytelling|show and tell|verbal/i
const READING_PATTERN = /reading|comprehension|literature|novel stud|poetry|vocabulary|phonics|text features|inferenc|decoding|fluency(?! *,? *oral)|guided reading|literacy circles?/i

export const LA_CATEGORIES = [
  { key: 'reading', label: 'Reading' },
  { key: 'writing', label: 'Writing' },
  { key: 'oral', label: 'Oral Language Fluency' },
]

/**
 * Categorize a Language Arts unit into reading / writing / oral, based on
 * its name and content summary. A manual override (unit.la_category, set
 * by the teacher clicking a different section) always wins over the
 * heuristic -- this function is only the default/fallback.
 */
export function categorizeLA(unitName = '', contentSummary = '') {
  const text = `${unitName} ${contentSummary || ''}`.toLowerCase()
  const isReading = READING_PATTERN.test(text)
  const isWriting = WRITING_PATTERN.test(text)
  const isOral = ORAL_PATTERN.test(text)

  // Overlap rule: reading wins over everything, including reading+oral.
  if (isReading) return 'reading'
  if (isOral && isWriting) return 'reading' // ambiguous overlap -> reading, not oral
  if (isWriting) return 'writing'
  if (isOral) return 'oral'
  return 'reading' // default fallback for anything unmatched
}
