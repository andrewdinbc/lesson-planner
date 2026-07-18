// app/api/forge/extract-style-pattern/route.js
// Extracts ONLY abstract structural/stylistic observations from a Forge
// resource, broken into named layers, and within each layer into
// individual ATOMIC observations (Aj, 2026-07-18: "editable to the
// microbial level") -- never content, facts, specific text, or exercises.
// This is the boundary that makes genre-blending legitimate:
// style/genre/structure/format are not copyrightable, specific expression
// is.
//
// Each layer is now an ARRAY of small, independent observations rather
// than one blob sentence -- e.g. visuals: [{id, text: "color-coded
// sections", included: true}, {id, text: "boxed callouts", included: true}]
// -- so the teacher can check/uncheck and edit each individual observation
// rather than accepting or rejecting a whole layer at once. Only
// `included: true` items feed into blending (see /api/style-profiles).
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
import { STYLE_DIALS } from '@/lib/style-dials'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LAYER_KEYS = ['visuals', 'structure', 'interaction', 'assessmentFormat', 'teacherDirections', 'studentDirections', 'extension', 'digital']

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const [row] = await sbSelect('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}&select=*`)
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    const text = (row.edited_text || row.original_text || '').slice(0, 8000)

    const dialList = STYLE_DIALS.map((d) => `- ${d.key}: 0 = "${d.loLabel}", 100 = "${d.hiLabel}"`).join('\n')

    const prompt = `You are analyzing a teaching resource to extract its STYLE and FORMAT only, broken into layers and then into small independent observations -- never its actual content.

Resource: ${row.title}
Text:
${text}

For each layer below, list 1-4 SEPARATE, SHORT, ATOMIC observations (each just a few words to one short phrase) -- never specific facts, questions, passages, examples, answer key content, or exact text from the source. Each observation should stand alone so it can be individually kept or discarded. If a layer isn't present/inferable, use an empty array.

- visuals: layout/formatting conventions (e.g. "color-coded sections", "boxed callouts") -- describe the STYLE, never reproduce or describe specific clipart/images since those are separately licensed assets, not something to extract at all
- structure: how it's organized/sequenced (e.g. "warm-up first", "guided then independent practice", "differentiated by tier")
- interaction: the TYPE of student engagement as a generic format (e.g. "task cards", "cut-and-paste sorting", "digital drag-and-drop") -- not what the specific tasks say
- assessmentFormat: the FORMAT of how understanding is checked (e.g. "self-checking answer key", "tiered rubric", "auto-grading digital cards") -- not the actual key/rubric content
- teacherDirections: format of setup/prep notes if present (e.g. "includes printing tips", "has a differentiation note") -- not their actual content
- studentDirections: format of how instructions are presented to students (e.g. "icon-based steps", "numbered checklist") -- not their actual wording
- extension: format of any early-finisher/enrichment provision (e.g. "includes a challenge tier") -- not the actual challenge content
- digital: which digital format(s) exist as plain facts (e.g. "has a Google Slides version", "Boom Cards compatible") -- format only, one item per format

Additionally, estimate a 0-100 value for each of these style dials, based purely on structural/tonal impressions (not content):
${dialList}
If you can't confidently estimate a dial from this text, use 50 (neutral).

Respond with ONLY JSON, no markdown fences:
{"visuals": ["...", "..."], "structure": ["...", "..."], "interaction": ["...", "..."], "assessmentFormat": ["...", "..."], "teacherDirections": ["...", "..."], "studentDirections": ["...", "..."], "extension": ["...", "..."], "digital": ["...", "..."], "dials": {${STYLE_DIALS.map((d) => `"${d.key}": 0`).join(', ')}}}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    const { dials, ...rawLayers } = parsed

    // Convert each layer's array of strings into checkable/editable items,
    // preserving any existing manual include/exclude + edits from a prior
    // extraction pass where the observation text still matches.
    const previousLayers = row.layer_notes || {}
    const layers = {}
    for (const key of LAYER_KEYS) {
      const items = Array.isArray(rawLayers[key]) ? rawLayers[key] : (rawLayers[key] ? [rawLayers[key]] : [])
      const previousItems = Array.isArray(previousLayers[key]) ? previousLayers[key] : []
      layers[key] = items.map((text, i) => {
        const matchPrev = previousItems.find((p) => p.text === text)
        return { id: matchPrev?.id || `${key}-${i}-${Date.now()}`, text, included: matchPrev ? matchPrev.included : true }
      })
    }

    const flatSummary = LAYER_KEYS
      .map((key) => {
        const included = (layers[key] || []).filter((item) => item.included).map((item) => item.text)
        return included.length ? `${key}: ${included.join(', ')}` : null
      })
      .filter(Boolean)
      .join(' ')

    await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, {
      layer_notes: layers, style_notes: flatSummary, dial_estimates: dials || null, updated_at: new Date().toISOString(),
    })

    return Response.json({ layers, styleNotes: flatSummary, dials })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
