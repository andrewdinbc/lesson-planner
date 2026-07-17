// app/api/units/examples/route.js
// Powers the "Show me examples" action on Unit Priorities: click any unit
// or assessment type and get a short set of concrete AI-generated examples
// grounded in the teacher's own steering documents, instead of navigating
// away to build something or waiting on a saved-for-later reminder.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { buildSteeringContext } from '@/lib/steering-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { subject, unitName, contentSummary, assessmentTypeLabel, grade } = await request.json()
    if (!unitName) return Response.json({ error: 'unitName is required' }, { status: 400 })

    let steeringContext = ''
    try { steeringContext = await buildSteeringContext() } catch { /* optional */ }

    const prompt = `Give a teacher 2-3 short, concrete examples for the following, grounded in their own material where provided.

Subject: ${subject || 'not specified'}
Unit: ${unitName}
${contentSummary ? `Unit content: ${contentSummary}` : ''}
${assessmentTypeLabel ? `Assessment type to give examples for: ${assessmentTypeLabel}` : ''}
${grade ? `Grade: ${grade}` : ''}
${steeringContext ? `\n\nThe teacher's own source material to ground this in:\n${steeringContext}` : ''}

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "examples": ["example 1, 2-4 sentences, concrete and usable as-is or with light editing", "example 2", "example 3"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    return Response.json({ examples: data.examples || [], usedSteeringDocs: !!steeringContext })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
