// app/api/style-profiles/generate-differentiation-report/route.js
// Produces a documented record of exactly how, and by how much, a style
// blend's final settings diverge from the averaged source material --
// per Aj's 2026-07-18 request for "documented differences for legal
// reasons." This is deterministic math (dial deltas) plus a short AI-
// written summary paragraph, not a legal opinion -- Claude isn't a lawyer
// and this isn't legal advice, just a factual record of the deliberate
// choices made, useful documentation if originality is ever questioned.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbUpdate } from '@/lib/supabase'
import { STYLE_DIALS } from '@/lib/style-dials'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const [profile] = await sbSelect('style_profiles', `?id=eq.${id}&user_id=eq.${user.id}&select=*`)
    if (!profile) return Response.json({ error: 'Not found' }, { status: 404 })

    const resources = profile.source_resource_ids?.length
      ? await sbSelect('forge_resources', `?user_id=eq.${user.id}&id=in.(${profile.source_resource_ids.join(',')})&select=title,layer_preferences,layer_notes`)
      : []

    const dialDeltas = STYLE_DIALS.map((dial) => {
      const source = profile.source_dial_estimates?.[dial.key] ?? dial.default
      const final = profile.dial_values?.[dial.key] ?? dial.default
      return { key: dial.key, label: dial.label, source, final, delta: final - source }
    })

    const likedItems = []
    const dislikedItems = []
    for (const r of resources) {
      for (const [layerKey, pref] of Object.entries(r.layer_preferences || {})) {
        const target = pref === 'like' ? likedItems : pref === 'dislike' ? dislikedItems : null
        if (target) target.push(`${r.title} — ${layerKey}`)
      }
    }

    const deltaLines = dialDeltas
      .filter((d) => Math.abs(d.delta) >= 5)
      .map((d) => `- ${d.label}: source-average ${d.source}/100 -> this blend ${d.final}/100 (${d.delta > 0 ? '+' : ''}${d.delta} point deliberate shift)`)

    const prompt = `Write a short, factual documentation paragraph (not legal advice, just a factual record) describing how this style blend was deliberately differentiated from its source style patterns. Be specific and reference the actual numbers.

Blend name: ${profile.name}
Blend description: ${profile.blended_style_text}

Dial deltas (source average -> final, only meaningful shifts of 5+ points):
${deltaLines.length ? deltaLines.join('\n') : 'No individual dial shows a meaningful (5+) point shift from the source average -- the blend closely tracks the averaged input.'}

Elements the teacher specifically chose to emphasize (liked): ${likedItems.length ? likedItems.join('; ') : 'none specifically flagged'}
Elements the teacher specifically chose to avoid (disliked): ${dislikedItems.length ? dislikedItems.join('; ') : 'none specifically flagged'}

Write 2-3 sentences summarizing the deliberate differentiation, referencing the actual point-deltas above. State plainly that no content/text from source resources was used -- only abstract style/format patterns.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const summary = response.content.find((b) => b.type === 'text')?.text || ''

    const report = `DIFFERENTIATION REPORT
Style Blend: ${profile.name}
Generated: ${new Date().toISOString()}

SUMMARY
${summary}

DIAL-BY-DIAL RECORD (source average -> final value)
${dialDeltas.map((d) => `${d.label}: ${d.source}/100 -> ${d.final}/100 (${d.delta > 0 ? '+' : ''}${d.delta})`).join('\n')}

LAYER PREFERENCES APPLIED
Emphasized: ${likedItems.length ? likedItems.join('; ') : 'none'}
Avoided: ${dislikedItems.length ? dislikedItems.join('; ') : 'none'}

SOURCE MATERIAL NOTE
This blend was built from abstract style/format pattern extractions only (structure, tone, pacing, visual/format conventions) -- no source resource's actual content, text, questions, or exercises were used at any point. This document is a factual record for the creator's own files, not a legal opinion.
`

    await sbUpdate('style_profiles', `?id=eq.${id}&user_id=eq.${user.id}`, {
      differentiation_report: report, updated_at: new Date().toISOString(),
    })

    return Response.json({ report })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
