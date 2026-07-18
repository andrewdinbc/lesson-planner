// app/api/forge/extract-style-pattern/route.js
// Extracts ONLY abstract structural/stylistic observations from a Forge
// resource -- layout conventions, tone, pacing, organizational structure,
// visual style -- explicitly never content, facts, specific text, or
// exercises. This is the boundary that makes genre-blending legitimate:
// style/genre/structure are not copyrightable, specific expression is.
// The resulting style_notes get combined across many resources into a
// named style_profiles blend (see /api/style-profiles), which informs AI
// generation of wholly original content -- generation is told to write
// IN this style, never to reproduce any source's actual material.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbUpdate } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const [row] = await sbSelect('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}&select=*`)
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    const text = (row.edited_text || row.original_text || '').slice(0, 8000)

    const prompt = `You are analyzing a teaching resource to extract its STYLE and STRUCTURE only -- never its content.

Resource: ${row.title}
Text:
${text}

Describe ONLY:
- Organizational structure (how it's sequenced/laid out, e.g. "warm-up, guided practice, independent practice, exit ticket")
- Tone and voice (e.g. "playful and encouraging", "formal and rigorous", "conversational")
- Visual/formatting conventions (e.g. "illustrated section headers", "numbered checklist style", "color-coded difficulty tiers")
- Pacing (e.g. "short bursts of activity", "one deep-dive task per session")
- Any other abstract stylistic pattern -- genre, feel, structural convention

DO NOT include:
- Any specific facts, examples, questions, or exercises from the text
- Any specific numbers, names, or content details
- Anything that could let someone reconstruct what the resource actually says

Respond with ONLY JSON, no markdown fences:
{"styleNotes": "2-4 sentences describing structure/tone/format/pacing patterns only, written so it reads like a style guide, not a summary of content"}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
    const { styleNotes } = JSON.parse(raw.replace(/```json|```/g, '').trim())

    await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, { style_notes: styleNotes, updated_at: new Date().toISOString() })

    return Response.json({ styleNotes })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
