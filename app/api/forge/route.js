// app/api/forge/route.js
// Project Forge management: list a teacher's captured resources, save
// edits (taking the best parts, rewriting), and the two "graduate" actions
// -- push_to_steering (copies the edited/original text into
// steering_documents, live in AI generation immediately) and
// mark_for_tpt (flags it as a candidate for a future standalone TPT
// listing; actual publishing/packaging is a separate step not built yet).
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbUpdate, sbInsert } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('forge_resources', `?user_id=eq.${user.id}&select=*&order=created_at.desc`)
    return Response.json({ resources: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, action, edited_text } = body
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    if (action === 'save_edit') {
      await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, {
        edited_text, status: 'edited', updated_at: new Date().toISOString(),
      })

      // Sync the edit back into any unit's resources array that references
      // this Forge item (via forge_resource_id, set when the item was
      // originally uploaded/linked from the Resources page). Without this,
      // "take the best parts, edit them in Forge" edits would sit in Forge
      // and never actually reach what's shown in Resources or printed --
      // per Aj's 2026-07-18 request to keep that connection live.
      const unitsWithThisResource = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=id,subject,unit_name,resources`)
      for (const u of unitsWithThisResource) {
        const resources = u.resources || []
        let changed = false
        const updated = resources.map((r) => {
          if (r.forge_resource_id === id) {
            changed = true
            return { ...r, detail: edited_text }
          }
          return r
        })
        if (changed) {
          await sbUpdate('unit_priorities', `?id=eq.${u.id}`, { resources: updated, updated_at: new Date().toISOString() })
        }
      }

      return Response.json({ ok: true })
    }

    if (action === 'push_to_steering') {
      const [row] = await sbSelect('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}&select=*`)
      if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
      const text = row.edited_text || row.original_text || ''
      const [doc] = await sbInsert('steering_documents', [{
        user_id: user.id,
        title: `Forge: ${row.title}`,
        full_text: text,
        category: 'actionable_resources',
        source_type: 'forge_resource',
        subject: row.subject || null,
        author: row.source_url || null,
      }])
      await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, {
        status: 'pushed_to_steering', pushed_to_steering_doc_id: doc.id, updated_at: new Date().toISOString(),
      })
      return Response.json({ ok: true, steering_doc_id: doc.id })
    }

    if (action === 'mark_for_tpt') {
      await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, {
        status: 'marked_for_tpt', updated_at: new Date().toISOString(),
      })
      return Response.json({ ok: true })
    }

    // Like/dislike a specific extracted layer (visuals, structure, etc.)
    // on this resource -- used at blend time to emphasize liked layers
    // and explicitly exclude disliked ones, and documented in the
    // eventual differentiation report for legal recordkeeping.
    if (action === 'set_layer_preference') {
      const { layerKey, preference } = body // preference: 'like' | 'dislike' | null
      if (!layerKey) return Response.json({ error: 'layerKey is required' }, { status: 400 })
      const [row] = await sbSelect('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}&select=layer_preferences`)
      const prefs = { ...(row?.layer_preferences || {}) }
      if (preference) prefs[layerKey] = preference
      else delete prefs[layerKey]
      await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, { layer_preferences: prefs, updated_at: new Date().toISOString() })
      return Response.json({ ok: true, layer_preferences: prefs })
    }

    // Microbial-level control (Aj, 2026-07-18): check/uncheck an individual
    // observation within a layer -- unchecked items are excluded from
    // style_notes and from anything blended, without needing to accept or
    // reject the whole layer.
    if (action === 'toggle_observation') {
      const { layerKey, observationId, included } = body
      if (!layerKey || !observationId) return Response.json({ error: 'layerKey and observationId are required' }, { status: 400 })
      const [row] = await sbSelect('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}&select=layer_notes`)
      const layers = { ...(row?.layer_notes || {}) }
      layers[layerKey] = (layers[layerKey] || []).map((item) => (item.id === observationId ? { ...item, included } : item))
      const flatSummary = Object.entries(layers)
        .map(([key, items]) => {
          const inc = (items || []).filter((i) => i.included).map((i) => i.text)
          return inc.length ? `${key}: ${inc.join(', ')}` : null
        })
        .filter(Boolean)
        .join(' ')
      await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, { layer_notes: layers, style_notes: flatSummary, updated_at: new Date().toISOString() })
      return Response.json({ ok: true, layer_notes: layers, style_notes: flatSummary })
    }

    // Edit an individual observation's text directly -- the "editable"
    // half of microbial-level control, alongside toggle_observation.
    if (action === 'edit_observation') {
      const { layerKey, observationId, text } = body
      if (!layerKey || !observationId) return Response.json({ error: 'layerKey and observationId are required' }, { status: 400 })
      const [row] = await sbSelect('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}&select=layer_notes`)
      const layers = { ...(row?.layer_notes || {}) }
      layers[layerKey] = (layers[layerKey] || []).map((item) => (item.id === observationId ? { ...item, text } : item))
      const flatSummary = Object.entries(layers)
        .map(([key, items]) => {
          const inc = (items || []).filter((i) => i.included).map((i) => i.text)
          return inc.length ? `${key}: ${inc.join(', ')}` : null
        })
        .filter(Boolean)
        .join(' ')
      await sbUpdate('forge_resources', `?id=eq.${id}&user_id=eq.${user.id}`, { layer_notes: layers, style_notes: flatSummary, updated_at: new Date().toISOString() })
      return Response.json({ ok: true, layer_notes: layers, style_notes: flatSummary })
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
