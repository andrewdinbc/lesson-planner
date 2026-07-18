// app/api/units/generate-assessment/route.js
// Step 3 of Content -> Resources -> Assessment. Given a unit's content,
// curricular competency, and resources (steps 1-2), plus the assessment
// TYPES the teacher wants (e.g. "quiz", "performance_task"), generates
// concrete assessment practice suggestions grounded in steering documents
// -- same buildSteeringContext() pattern as ai-build and generate-resources.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { buildSteeringContext } from '@/lib/steering-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ASSESSMENT_KIND_LABELS = {
  entry_exit_ticket: 'entry/exit tickets',
  quiz: 'quizzes',
  performance_task: 'performance tasks',
  rubric: 'rubrics',
  observation_checklist: 'observation checklists',
  self_assessment: 'self-assessment',
  peer_assessment: 'peer assessment',
  reflection_journal: 'reflection journals',
  summative_test: 'end-of-unit summative test',
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { subject, unitName, contentSummary, curricularCompetency, resourcesSummary, grades, assessmentKinds } = await request.json()
    if (!unitName) return Response.json({ error: 'unitName is required' }, { status: 400 })
    const kinds = (assessmentKinds || []).length ? assessmentKinds : ['entry_exit_ticket', 'quiz', 'performance_task']

    let steeringContext = ''
    try { steeringContext = await buildSteeringContext() } catch { /* optional */ }

    const gradeLabel = (grades || []).join('/') || 'unspecified'
    const kindsLabel = kinds.map((k) => ASSESSMENT_KIND_LABELS[k] || k).join(', ')

    const prompt = `You are suggesting assessment practices for one unit in a BC teacher's year plan.

Subject: ${subject}
Grade(s): ${gradeLabel}
Unit: ${unitName}
Content this unit covers: ${contentSummary || 'not specified yet'}
Curricular competency this unit targets: ${curricularCompetency || 'not specified yet'}
Resources already lined up: ${resourcesSummary || 'none specified yet'}
${steeringContext}

The teacher wants these assessment TYPES specifically: ${kindsLabel}.

Suggest one concrete assessment practice per requested type, tailored to this unit's actual content (not generic). Draw from the steering document material above where relevant.

Respond with ONLY a JSON array, no other text, no markdown fences:
[{"assessmentKind": "one of: ${Object.keys(ASSESSMENT_KIND_LABELS).join(', ')}", "label": "short name", "detail": "1-3 sentence description of what this looks like for this specific unit"}]`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1400,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '[]'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const practices = parsed.map((p) => ({
      type: 'ai_generated',
      label: p.label,
      detail: p.detail,
      assessmentKind: p.assessmentKind || 'other',
      added_at: new Date().toISOString(),
    }))

    return Response.json({ practices })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
