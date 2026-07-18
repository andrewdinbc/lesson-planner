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
    const { name, resourceIds, personalTwist } = await request.json()
    if (!name || !resourceIds?.length) return Response.json({ error: 'name and resourceIds are required' }, { status: 400 })

    const resources = await sbSelect('forge_resources', `?user_id=eq.${user.id}&id=in.(${resourceIds.join(',')})&select=title,style_notes`)
    const withNotes = resources.filter((r) => r.style_notes)
    if (!withNotes.length) return Response.json({ error: 'None of the selected resources have extracted style patterns yet -- extract a style pattern from each one first.' }, { status: 400 })

    const prompt = `You are blending multiple abstract STYLE patterns (structure, tone, pacing, format -- never content) into one coherent, named "genre feel" for a teacher's original resources.

Style patterns to blend:
${withNotes.map((r, i) => `${i + 1}. From "${r.title}": ${r.style_notes}`).join('\n')}

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
    }])

    return Response.json({ profile })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
