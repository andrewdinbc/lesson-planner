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

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
