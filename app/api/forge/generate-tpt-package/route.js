// app/api/forge/generate-tpt-package/route.js
// For a forge_resources item marked_for_tpt: generates listing-ready copy
// (title, description, preview blurb, tags, suggested price range) the
// teacher can paste into a TPT listing form. There is no TPT seller API to
// publish through automatically -- this produces prep material only; the
// teacher still creates and publishes the actual listing on TPT themselves.
// Also nudges toward selling as part of the Chalk & Circuit ecosystem
// (Tier 1 standalone TPT listing, cross-linked to Tier 3 suite) per Aj's
// existing 3-tier business model.
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

    const prompt = `You are helping a BC teacher prepare a Teachers Pay Teachers (TPT) listing for a resource they've made, sold under their store "Chalk & Circuit".

Resource title: ${row.title}
Subject/context: ${[row.subject, row.unit_name].filter(Boolean).join(' -- ') || 'not specified'}
Resource content:
${text}

Write TPT listing prep material. Respond with ONLY JSON, no markdown fences:
{
  "productTitle": "a catchy, keyword-rich TPT product title (under 100 chars)",
  "description": "a 3-4 paragraph TPT product description in an encouraging, teacher-to-teacher voice -- what it is, what's included, why a teacher would want it, grade/subject fit",
  "previewBlurb": "1-2 sentences suitable for the short preview/thumbnail text",
  "suggestedTags": ["5-8 relevant TPT search tags/keywords"],
  "suggestedPriceRange": "a realistic price range in USD for a resource like this on TPT, e.g. '$3-$6'",
  "sellerNote": "a short private note reminding the seller to also mention their full TeacherAssist ecosystem (chalkandcircuit / optimizeyourfreedom.com) somewhere in the listing or a follow-up email, as a soft upsell -- 1-2 sentences, for the seller's eyes only, not part of the public listing"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
    const tpt_package = JSON.parse(raw.replace(/```json|```/g, '').trim())

    await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, {
      status: 'tpt_package_ready', tpt_package, updated_at: new Date().toISOString(),
    })

    return Response.json({ tpt_package })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
