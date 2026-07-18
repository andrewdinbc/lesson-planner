// app/api/style-profiles/route.js
// Blends selected resources' style_notes (structural/stylistic patterns
// only, never content -- see /api/forge/extract-style-pattern) into one
// named, coherent "genre feel" the teacher can push into AI Steering.
// Mixing many sources' STYLE is exactly how genre blending legitimately
// works (see conversation with Aj, 2026-07-18) -- this never touches or
// combines the sources' actual content/expression, only abstract pattern
// descriptions of structure, tone, pacing, and format.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { averageDialEstimates, defaultDialValues } from '@/lib/style-dials'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('style_profiles', `?user_id=eq.${user.id}&select=*&order=created_at.desc`)
    return Response.json({ profiles: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()

    // Slider fine-tuning: update just the dial_values on an existing
    // profile -- no AI call needed, this is a direct manual override.
    if (body.action === 'update_dials') {
      const { id, dialValues } = body
      if (!id || !dialValues) return Response.json({ error: 'id and dialValues are required' }, { status: 400 })
      await sbUpdate('style_profiles', `?id=eq.${id}&user_id=eq.${user.id}`, { dial_values: dialValues, updated_at: new Date().toISOString() })
      return Response.json({ ok: true })
    }

    const { name, resourceIds, personalTwist } = body
    if (!name || !resourceIds?.length) return Response.json({ error: 'name and resourceIds are required' }, { status: 400 })

    const resources = await sbSelect('forge_resources', `?user_id=eq.${user.id}&id=in.(${resourceIds.join(',')})&select=title,style_notes,dial_estimates,layer_notes,layer_preferences`)
    const withNotes = resources.filter((r) => r.style_notes)
    if (!withNotes.length) return Response.json({ error: 'None of the selected resources have extracted style patterns yet -- extract a style pattern from each one first.' }, { status: 400 })

    const dialValues = averageDialEstimates(resources.map((r) => r.dial_estimates).filter(Boolean))
    const sourceDialEstimates = dialValues // frozen snapshot for the differentiation report

    // Fold in like/dislike layer preferences: liked layers get emphasized,
    // disliked ones get explicitly named as things to AVOID, so the blend
    // deliberately diverges from what the teacher didn't want -- this is
    // also what gets documented in the differentiation report.
    const likedLines = []
    const dislikedLines = []
    for (const r of withNotes) {
      const prefs = r.layer_preferences || {}
      for (const [layerKey, pref] of Object.entries(prefs)) {
        const layerValue = r.layer_notes?.[layerKey]
        if (!layerValue) continue
        if (pref === 'like') likedLines.push(`From "${r.title}" (${layerKey}): ${layerValue}`)
        if (pref === 'dislike') dislikedLines.push(`From "${r.title}" (${layerKey}): ${layerValue}`)
      }
    }

    const prompt = `You are blending multiple abstract STYLE patterns (structure, tone, pacing, format -- never content) into one coherent, named "genre feel" for a teacher's original resources.

Style patterns to blend:
${withNotes.map((r, i) => `${i + 1}. From "${r.title}": ${r.style_notes}`).join('\n')}

${likedLines.length ? `EMPHASIZE these specifically-liked elements:\n${likedLines.join('\n')}` : ''}
${dislikedLines.length ? `DELIBERATELY AVOID these specifically-disliked elements -- the blend should diverge from them:\n${dislikedLines.join('\n')}` : ''}

${personalTwist ? `The teacher's own personal twist to layer in: ${personalTwist}` : ''}

Write ONE blended style description that combines these patterns into a coherent feel -- like describing a music or literary genre. This describes HOW future original content should be written/structured/paced/formatted, not WHAT it should say. 3-5 sentences.

Respond with ONLY JSON, no markdown fences:
{"blendedStyle": "the blended style description"}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
    const { blendedStyle } = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const [profile] = await sbInsert('style_profiles', [{
      user_id: user.id, name, blended_style_text: blendedStyle, source_resource_ids: resourceIds,
      dial_values: dialValues || defaultDialValues(),
      source_dial_estimates: sourceDialEstimates,
    }])

    return Response.json({ profile })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
