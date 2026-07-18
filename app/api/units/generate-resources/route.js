// app/api/units/generate-resources/route.js
// Step 2 of the Content -> Resources -> Assessment flow. Given a unit's
// approved content/curricular competency (from step 1), generates concrete
// resource suggestions (readings, tools, manipulatives, activities,
// websites) grounded in the teacher's steering documents -- same
// buildSteeringContext() used by ai-build, so the AI's "actionable
// resources" material is the starting point rather than inventing from
// scratch. Teacher can also skip this and upload/type their own instead
// (see unit_priorities.resources, populated either way).
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { buildSteeringContext } from '@/lib/steering-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { subject, unitName, contentSummary, curricularCompetency, grades, category } = await request.json()
    if (!unitName) return Response.json({ error: 'unitName is required' }, { status: 400 })

    let steeringContext = ''
    try { steeringContext = await buildSteeringContext() } catch { /* optional */ }

    const gradeLabel = (grades || []).join('/') || 'unspecified'
    const categoryLabel = category ? ` (${category})` : ''

    const prompt = `You are suggesting concrete teaching resources for one unit in a BC teacher's year plan.

Subject: ${subject}
Grade(s): ${gradeLabel}
Unit: ${unitName}${categoryLabel}
Content this unit covers: ${contentSummary || 'not specified yet'}
Curricular competency this unit targets: ${curricularCompetency || 'not specified yet'}
${steeringContext}

Suggest 4-6 concrete, specific resources for teaching this unit. Draw from the steering document material above where relevant (it represents this teacher's own philosophy, psychology-of-learning grounding, and actionable resource library) -- pull real activity structures and techniques from it rather than generic suggestions, when it's applicable to this content.

Each resource should be one of these types: reading/text, tool/website, manipulative/material, activity structure, or assessment-adjacent practice resource (note: full assessment design happens in a later step, so keep these resource-level, not full assessment plans).

Respond with ONLY a JSON array, no other text, no markdown fences:
[{"label": "short resource name", "detail": "1-2 sentence description of how to use it for this unit", "type": "reading" | "tool" | "manipulative" | "activity" | "other"}]`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '[]'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const resources = parsed.map((r) => ({
      type: 'ai_generated',
      label: r.label,
      detail: r.detail,
      resourceType: r.type || 'other',
      generated_at: new Date().toISOString(),
    }))

    return Response.json({ resources })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
