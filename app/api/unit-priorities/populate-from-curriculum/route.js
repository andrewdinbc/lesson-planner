import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { getCurriculum } from '@/lib/bc-curriculum'
import { ALWAYS_HIGH_SCRUTINY } from '@/lib/unit-priorities'

export const runtime = 'nodejs'
export const maxDuration = 300

// The 4 subjects Aj wants given the largest, most structured unit
// breakdown -- these get real curriculum.gov.bc.ca content clustered by
// AI into coherent units. Other subjects keep the lighter generic
// defaults from lib/unit-priorities.js (DEFAULT_UNITS) unless a teacher
// explicitly wants the same treatment later.
const CORE_SUBJECTS = ['Language Arts', 'Mathematics', 'Science', 'Social Studies']

// IMPORTANT: everything in this route runs in PARALLEL (Promise.all), not
// sequential for-loops. The original sequential version (fetch curriculum
// for every grade, one at a time, then AI-cluster every subject, one at a
// time) hit FUNCTION_INVOCATION_TIMEOUT in production -- up to 8 curriculum
// fetches + 4 separate ~15-20s AI calls, run one after another, easily
// exceeded even a 90s maxDuration. Running the independent work in
// parallel instead cuts wall-clock time from "sum of every step" to
// roughly "the single slowest step."
async function clusterContentIntoUnits(subject, gradeContentBlocks) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const gradeText = gradeContentBlocks.map((g) =>
    `--- GRADE ${g.grade} CONTENT ---\n${g.content}\n\n--- GRADE ${g.grade} CURRICULAR COMPETENCY ---\n${g.curricularCompetency}`
  ).join('\n\n')

  const prompt = `You are a BC curriculum specialist. Below is the OFFICIAL ${subject} curriculum Content and Curricular Competency text from curriculum.gov.bc.ca, for one or more grades (this teacher may have a split-grade class covering multiple grades at once).

Your job: cluster the individual Content bullet points into a SMALL NUMBER of coherent, teachable UNITS (roughly 4-8 units total, not one unit per bullet point). Each unit should group genuinely related content together the way a teacher would actually plan and teach it as a block (e.g. "Fractions & Decimals" grouping several related number-sense content points, not each point as its own unit). If multiple grades are present, note which grade(s) each unit's content applies to -- a split-grade class often teaches overlapping strands together across both grades.

For each unit, also write ONE elaboration sentence per content point it contains (mirroring how curriculum.gov.bc.ca lets you hover over an item for more detail) -- keep these grounded in the actual official wording, paraphrased for clarity, not invented.

Respond with ONLY a JSON array, no other text, no markdown fences:
[{"unitName": string, "grades": [string], "contentSummary": string (the specific content points this unit covers, with a short elaboration each, plain text with line breaks), "curricularCompetency": string (the relevant curricular competency text for this unit, plain text)}]

CURRICULUM TEXT:
${gradeText.slice(0, 12000)}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = response.content.find((b) => b.type === 'text')?.text || '[]'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// Fetch every grade's curriculum for one subject, in parallel.
async function fetchSubjectGradeBlocks(subject, grades) {
  const results = await Promise.all(
    grades.map(async (grade) => {
      try {
        const curriculum = await getCurriculum(subject, grade)
        if (curriculum && curriculum.content) {
          return { grade, content: curriculum.content, curricularCompetency: curriculum.curricularCompetency, sourceUrl: curriculum.sourceUrl }
        }
        return null
      } catch {
        return null
      }
    })
  )
  return results.filter(Boolean)
}

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const [classSetup] = await sbSelect('teacher_class_setup', `?user_id=eq.${user.id}&select=grades&limit=1`)
    const grades = classSetup?.grades || []
    if (!grades.length) {
      return Response.json({ error: 'No grades set yet -- fill in "What do you teach?" first.' }, { status: 400 })
    }

    // Step 1: fetch curriculum content for all 4 subjects in parallel
    // (each subject itself fetches its grades in parallel too).
    const subjectBlocks = await Promise.all(
      CORE_SUBJECTS.map(async (subject) => ({ subject, gradeBlocks: await fetchSubjectGradeBlocks(subject, grades) }))
    )

    const results = { populated: [], skipped: [] }
    const subjectsWithContent = subjectBlocks.filter((s) => s.gradeBlocks.length > 0)
    const subjectsWithoutContent = subjectBlocks.filter((s) => s.gradeBlocks.length === 0)

    for (const s of subjectsWithoutContent) {
      results.skipped.push({ subject: s.subject, reason: 'No curriculum data available for this grade/subject combination' })
    }

    // Step 2: AI-cluster all subjects with content IN PARALLEL -- this is
    // the step that was previously sequential and the main timeout cause.
    const clusterOutcomes = await Promise.allSettled(
      subjectsWithContent.map((s) => clusterContentIntoUnits(s.subject, s.gradeBlocks))
    )

    // Step 3: write results to the DB. DB writes are sequential per
    // subject (to keep upsert logic simple/safe) but subjects themselves
    // were already clustered in parallel above, so this is fast now.
    for (let i = 0; i < subjectsWithContent.length; i++) {
      const { subject, gradeBlocks } = subjectsWithContent[i]
      const outcome = clusterOutcomes[i]

      if (outcome.status === 'rejected') {
        results.skipped.push({ subject, reason: `AI clustering failed: ${outcome.reason?.message || outcome.reason}` })
        continue
      }

      const clusteredUnits = outcome.value
      // BUG FIX: source_url was hardcoded to the FIRST grade fetched
      // (gradeBlocks[0]) for every unit, regardless of which grade(s)
      // that specific unit actually covers -- confirmed via real data
      // that every single unit was showing a Grade 4 link even when
      // tagged Grade 5, which made the whole populate feature look
      // grade-misaligned even though the underlying curriculum fetch
      // (bc_curriculum_cache) was correctly grade-specific the whole
      // time. Now builds each unit's source link(s) from its own
      // `grades` field.
      const sourceUrlByGrade = Object.fromEntries(gradeBlocks.map((g) => [g.grade, g.sourceUrl]))

      for (const unit of clusteredUnits) {
        const existing = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(subject)}&unit_name=eq.${encodeURIComponent(unit.unitName)}&select=id&limit=1`)
        const unitSourceUrl = (unit.grades || [])
          .map((g) => sourceUrlByGrade[g])
          .filter(Boolean)
          .join(' | ') || gradeBlocks[0].sourceUrl
        const row = {
          content_summary: unit.contentSummary,
          curricular_competency: unit.curricularCompetency,
          grades: unit.grades,
          source_url: unitSourceUrl,
          high_scrutiny: ALWAYS_HIGH_SCRUTINY.includes(subject),
          updated_at: new Date().toISOString(),
        }
        if (existing.length) {
          await sbUpdate('unit_priorities', `?id=eq.${existing[0].id}`, row)
        } else {
          await sbInsert('unit_priorities', [{ user_id: user.id, subject, unit_name: unit.unitName, priority: 1, removed: false, ...row }])
        }
      }
      results.populated.push({ subject, unitCount: clusteredUnits.length, grades: gradeBlocks.map((g) => g.grade) })
    }

    const units = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc`)
    return Response.json({ units, results })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

