import { getCurriculum } from '@/lib/bc-curriculum'

export const runtime = 'nodejs'

// Returns real Curricular Competency text (from curriculum.gov.bc.ca via
// bc-curriculum.js's cached live fetch) for each requested grade, split
// into individual bullet lines so they can render as addable cards --
// same treatment as Ministry elaborations in the Activities tab. Narrowed
// to exactly the grades passed in, no buffer, matching the Activities tab's
// grade-narrowing behavior.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const gradesParam = searchParams.get('grades') || ''
  const grades = gradesParam.split(',').map((g) => g.trim()).filter(Boolean)
  if (!subject || grades.length === 0) return Response.json({ error: 'subject and grades are required' }, { status: 400 })

  try {
    const results = {}
    for (const grade of grades) {
      const curriculum = await getCurriculum(subject, grade)
      if (!curriculum) continue
      const lines = (curriculum.curricularCompetency || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      results[grade] = lines
    }
    return Response.json({ results })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
