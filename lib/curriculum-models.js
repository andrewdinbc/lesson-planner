// lib/curriculum-models.js
// Maps a teacher's inventory findings (TSI, TPI, Philosophy, TPI-practices)
// to an approximate best-fit curriculum model. This is intentionally an
// APPROXIMATION, not a measurement - none of the four instruments were
// designed to directly probe curriculum structure preference, so this is
// inference from related signals. Some models (Place-Based in particular)
// have very little instrument coverage and are flagged as such rather
// than given false confidence.
//
// tier: 'basic' = close to how most teachers already plan, low redesign
// effort. 'advanced' = a bigger pedagogical/structural shift.
// oneLine: a single plain-language sentence for the picker UI -- the
// fuller `summary` field stays as the more detailed BC-context blurb
// shown below the dropdown.

export const CURRICULUM_MODELS = [
  {
    key: 'subject_centered',
    label: 'Subject-Centered Curriculum',
    emoji: '\ud83d\udcda',
    tier: 'basic',
    popular: true,
    oneLine: 'Teach each subject on its own, one after another.',
    summary: 'Each subject taught separately, linear skill progression, focus on content mastery. The traditional default in many BC schools.',
  },
  {
    key: 'standards_based',
    label: 'Standards-Based Curriculum',
    emoji: '\ud83d\udcd6',
    tier: 'basic',
    oneLine: "BC's official Big Ideas, competencies, and content structure.",
    summary: 'Organized around Big Ideas, curricular competencies, and content standards - the official BC curriculum structure.',
  },
  {
    key: 'spiral',
    label: 'Spiral Curriculum',
    emoji: '\ud83c\udf00',
    tier: 'basic',
    oneLine: 'Revisit the same core ideas, going deeper each time.',
    summary: 'Concepts are revisited and deepened over time with increasing complexity. BC\u2019s math and literacy progressions follow this model.',
  },
  {
    key: 'competency_based',
    label: 'Skills-Based / Competency-Based Curriculum',
    emoji: '\ud83e\udde9',
    tier: 'advanced',
    oneLine: 'Organize around skills demonstrated, not fixed content.',
    summary: 'Organized around core competencies and demonstrated performance rather than content coverage, with flexible pacing. BC\u2019s redesigned curriculum leans heavily this way.',
  },
  {
    key: 'inquiry_based',
    label: 'Inquiry-Based Curriculum',
    emoji: '\ud83e\udde0',
    tier: 'advanced',
    oneLine: 'Build the year around big questions students investigate.',
    summary: 'Organized around driving questions and student-led investigation cycles. Common in BC "learning through inquiry" classrooms.',
  },
  {
    key: 'pbl',
    label: 'Project-Based Learning (PBL)',
    emoji: '\ud83c\udfa8',
    tier: 'advanced',
    oneLine: 'Students learn by completing long, real-world projects.',
    summary: 'Organized around long-term, authentic, interdisciplinary projects with public products.',
  },
  {
    key: 'place_based',
    label: 'Place-Based Curriculum',
    emoji: '\ud83c\udf31',
    tier: 'advanced',
    oneLine: 'Ground learning in your local land and community.',
    summary: 'Organized around local land, community, and Indigenous knowledge. Aligned with BC\u2019s First Peoples Principles of Learning.',
  },
  {
    key: 'theme_integrated',
    label: 'Theme-Based Curriculum',
    emoji: '\ud83e\udde9',
    tier: 'basic',
    popular: true,
    oneLine: 'Blend subjects together around one big idea at a time.',
    summary: 'Subjects blended around concepts rather than taught separately - e.g. "Systems" taught through science, socials, math, and ELA together.',
  },
  {
    key: 'mastery_progressions',
    label: 'Competency-Based Progressions (Mastery Learning)',
    emoji: '\ud83e\uddf1',
    tier: 'advanced',
    oneLine: "Students move on only once they've mastered it.",
    summary: 'Organized around mastery rather than grade level, with flexible timelines and continuous assessment.',
  },
]

// Each model's signal weights, drawn from the closest-matching findings
// across the four instruments. Values are added when the corresponding
// finding is present/high; this is a simple weighted-sum, not a
// statistically validated scoring model.
function scoreModel(modelKey, { tsi, tpi, phil, wieman }) {
  const t = (k) => tsi[k] || 0
  const p = (k) => tpi[k] || 0
  const ph = (k) => phil[k] || 0
  // wieman[id] is now a 0-4 frequency scale (Never..Always), not a
  // boolean checkbox -- normalize to 0-1 so existing weight multipliers
  // stay comparable in magnitude to before, but now carry real graduated
  // signal instead of collapsing every "checked" answer to the same 1.
  // IDs from Part A no longer exist (that section was removed); any
  // stale A_* references from old saved data are simply undefined and
  // contribute 0, which is safe.
  const w = (id) => (typeof wieman[id] === 'number' ? wieman[id] / 4 : 0)

  switch (modelKey) {
    case 'subject_centered':
      return t('Expert') * 1.5 + t('Formal Authority') * 1.5 + p('Transmission') * 3 + ph('Essentialism') * 2 + w('C_0') * 2 - t('Delegator') - w('C_8')
    case 'competency_based':
      return t('Facilitator') * 1.5 + t('Delegator') + p('Developmental') * 2 + ph('Constructivism') * 2 + w('E_5') * 2 + w('D_7') * 2 + w('C_10') * 2
    case 'standards_based':
      // BC's official baseline - moderate score for everyone, small boost from structure-oriented signals
      return 8 + t('Formal Authority') * 0.8 + ph('Essentialism') * 0.5
    case 'inquiry_based':
      return t('Facilitator') * 2 + p('Developmental') * 1.5 + p('Nurturing') + ph('Progressivism') * 2 + ph('Constructivism') + w('C_8') * 2 + w('C_3') * 1.5
    case 'pbl':
      return t('Delegator') * 2 + p('Social Reform') * 1.5 + ph('Social Reconstructionism') * 1.5 + ph('Progressivism') + w('D_2') * 2 + w('D_5') * 1.5 + w('C_9') * 1.5
    case 'place_based':
      // Weakest instrument coverage of all models - flagged as low-confidence downstream regardless of score.
      return p('Social Reform') * 1.5 + ph('Social Reconstructionism') * 1.5
    case 'theme_integrated':
      return t('Facilitator') + t('Personal Model') + p('Developmental') + ph('Constructivism') * 1.5 + w('G_0') * 1.5 + w('G_4') * 1.5
    case 'spiral':
      return t('Expert') + t('Personal Model') * 1.5 + p('Apprenticeship') * 2 + p('Transmission') + ph('Essentialism') + ph('Behaviorism') + w('D_0') * 1.5 + w('E_2') * 1.5
    case 'mastery_progressions':
      return t('Facilitator') + p('Developmental') * 1.5 + ph('Constructivism') + w('E_5') * 2 + w('D_7') * 2.5 + w('E_7') * 2
    default:
      return 0
  }
}

/**
 * @param {object} tsi - adjusted TSI cluster scores, e.g. { Expert: 18, ... }
 * @param {object} tpi - adjusted TPI perspective scores, e.g. { Transmission: 4, ... }
 * @param {object} phil - adjusted philosophy scores, e.g. { Essentialism: 2, ... }
 * @param {object} wieman - raw TPI-practices checkbox answers, keyed like "C_0", "D_3", etc.
 * @returns {{ recommended: string, scores: Array<{key,label,score,pct,lowConfidence}> }}
 */
export function computeCurriculumFit(tsi = {}, tpi = {}, phil = {}, wieman = {}) {
  const inputs = { tsi, tpi, phil, wieman }
  const raw = CURRICULUM_MODELS.map((m) => ({
    key: m.key,
    label: m.label,
    emoji: m.emoji,
    summary: m.summary,
    score: Math.max(0, scoreModel(m.key, inputs)),
  }))
  const maxScore = Math.max(...raw.map((r) => r.score), 1)
  const scored = raw
    .map((r) => ({ ...r, pct: Math.round((r.score / maxScore) * 100), lowConfidence: r.key === 'place_based' }))
    .sort((a, b) => b.score - a.score)

  return { recommended: scored[0].key, scores: scored }
}



// trigger redeploy
