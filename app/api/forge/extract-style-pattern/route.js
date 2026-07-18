// app/api/forge/extract-style-pattern/route.js
// Extracts ONLY abstract structural/stylistic observations from a Forge
// resource, broken into named layers (Aj's framing, 2026-07-18) -- never
// content, facts, specific text, or exercises. This is the boundary that
// makes genre-blending legitimate: style/genre/structure/format are not
// copyrightable, specific expression is.
//
// Layers extracted (format/pattern only):
//   visuals, structure, interaction, assessmentFormat,
//   teacherDirections, studentDirections, extension, digital
//
// Layers deliberately NOT extracted, and why:
//   - Content Layer (questions, passages, problems, prompts, examples):
//     this IS the specific expression copyright protects. Extracting it
//     for reuse, however it's framed, is the thing we're not doing.
//   - Branding Layer (logo, color palette, fonts, cross-product style):
//     that's another creator's brand identity for their own store --
//     mimicking it for a competing product is its own problem, separate
//     from copyright (trade dress / unfair competition territory).
//   - Credits & Terms Layer: that's the ORIGINAL creator's licensing
//     obligations for THEIR licensed assets (clipart credits, usage
//     rights) -- it doesn't transfer to anyone else's product.
//
// The resulting layer_notes get combined across many resources into a
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

    const prompt = `You are analyzing a teaching resource to extract its STYLE and FORMAT only, broken into layers -- never its actual content.

Resource: ${row.title}
Text:
${text}

For each layer below, describe the ABSTRACT PATTERN only -- never specific facts, questions, passages, examples, answer key content, or exact text from the source. If a layer isn't really present/inferable from the text, use an empty string for it.

- visuals: layout/formatting conventions you can infer from structure (e.g. "color-coded sections", "boxed callouts") -- describe the STYLE, never reproduce or describe specific clipart/images since those are separately licensed assets, not something to extract at all
- structure: how it's organized/sequenced (e.g. "warm-up, guided practice, independent practice, exit ticket"; scaffolding/differentiation/pacing patterns)
- interaction: the TYPE of student engagement as a generic format (e.g. "task cards", "cut-and-paste sorting", "digital drag-and-drop") -- not what the specific tasks say
- assessmentFormat: the FORMAT of how understanding is checked (e.g. "self-checking answer key", "tiered rubric", "auto-grading digital cards") -- not the actual key/rubric content
- teacherDirections: format of setup/prep notes if present (e.g. "includes printing tips and a differentiation note") -- not their actual content
- studentDirections: format of how instructions are presented to students (e.g. "icon-based step-by-step") -- not their actual wording
- extension: format of any early-finisher/enrichment provision (e.g. "includes a challenge tier") -- not the actual challenge content
- digital: what digital format(s) exist as a plain fact (e.g. "has a Google Slides version") -- format only

Respond with ONLY JSON, no markdown fences:
{"visuals": "...", "structure": "...", "interaction": "...", "assessmentFormat": "...", "teacherDirections": "...", "studentDirections": "...", "extension": "...", "digital": "..."}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
    const layers = JSON.parse(raw.replace(/```json|```/g, '').trim())

    // Keep style_notes (flat summary) alongside layer_notes for anywhere
    // still reading the flat field, but layer_notes is the source of truth
    // going forward.
    const flatSummary = Object.entries(layers).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' ')

    await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, {
      layer_notes: layers, style_notes: flatSummary, updated_at: new Date().toISOString(),
    })

    return Response.json({ layers, styleNotes: flatSummary })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
