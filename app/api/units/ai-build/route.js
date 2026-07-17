// app/api/units/ai-build/route.js
// Powers "AI build me this unit" and "AI: creative way to cover this" on
// Unit Priorities' Language Arts Elaboration ideas. Generates real content
// (content_summary + curricular_competency) for a unit -- either fleshing
// out a known Elaboration idea, or inventing a fresh creative approach for
// a specific gap (an Elaboration idea the teacher hasn't added a unit for
// yet), grounded in the teacher's own steering documents where available.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { buildSteeringContext } from '@/lib/steering-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { subject, unitLabel, covers, category, grade, creative, manualApproach } = await request.json()
    if (!unitLabel) return Response.json({ error: 'unitLabel is required' }, { status: 400 })

    let steeringContext = ''
    try { steeringContext = await buildSteeringContext() } catch { /* optional */ }

    const coversLabel = (covers || []).join(', ') || 'not specified'
    const categoryLabel = category || coversLabel

    // Category-specific framing (Aj, 2026-07-17): an idea like "Novel
    // Study" genuinely spans Reading, Writing, and Oral Language Fluency,
    // but the actual classroom activity should look different depending
    // on which strand it's being built for -- a Reading-focused Novel
    // Study emphasizes comprehension/analysis, a Writing-focused one
    // emphasizes a written response, an Oral one emphasizes discussion/
    // presentation. The prompt below asks explicitly for the version
    // tailored to ONE strand, with the others as context, not a generic
    // catch-all.
    const strandFraming = covers && covers.length > 1
      ? `This idea generally spans ${coversLabel}, but you're building the version specifically for the ${categoryLabel} strand right now -- make the activity itself look different than it would for the other strands (e.g. a Reading-focused Novel Study leans on comprehension/analysis; a Writing-focused one leans on a written response; an Oral one leans on discussion/presentation). Don't just relabel a generic version -- the actual classroom activity should be genuinely shaped by the ${categoryLabel} focus.`
      : `This idea is for the ${categoryLabel} strand.`

    const prompt = creative
      ? `A teacher has NOT yet covered "${unitLabel}" (${strandFraming}) this year${manualApproach ? `. The teacher has a specific way they'd like to cover it: "${manualApproach}" -- build that out into a real unit, don't replace their idea with a different one` : '. Invent a genuinely creative, engaging, non-obvious way to cover it -- something a bit different from the standard approach, that would still hit the ' + categoryLabel + ' strand'}.

Subject: ${subject || 'Language Arts'}
Grade: ${grade || 'not specified'}
${steeringContext ? `\n\nThe teacher's own source material to ground this in:\n${steeringContext}` : ''}

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "unit_name": "a short, specific title for this creative approach (not just '${unitLabel}' repeated)",
  "content_summary": "2-4 sentences describing the creative approach and what students actually do",
  "curricular_competency": "1-2 sentences on the skill/competency focus"
}`
      : `Build out a real, usable Language Arts unit for the idea "${unitLabel}". ${strandFraming}

Subject: ${subject || 'Language Arts'}
Grade: ${grade || 'not specified'}
${steeringContext ? `\n\nThe teacher's own source material to ground this in:\n${steeringContext}` : ''}

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "content_summary": "2-4 sentences describing what this unit actually covers and how it runs, specific to the ${categoryLabel} strand",
  "curricular_competency": "1-2 sentences on the skill/competency focus"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    return Response.json({
      unit_name: data.unit_name || unitLabel,
      content_summary: data.content_summary || '',
      curricular_competency: data.curricular_competency || '',
      usedSteeringDocs: !!steeringContext,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
