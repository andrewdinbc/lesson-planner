import { sbSelect, sbInsert, sbUpdate, sbDelete } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/session'

// Hierarchical plans: year -> month -> week -> day -> lesson, via parent_id.
// GET ?parentId=xxx returns direct children; GET with no parentId returns
// top-level (year) plans.

export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const parentId = searchParams.get('parentId')
  try {
    const query = parentId
      ? `?user_id=eq.${user.id}&parent_id=eq.${parentId}&select=*&order=created_at`
      : `?user_id=eq.${user.id}&parent_id=is.null&select=*&order=created_at`
    const plans = await sbSelect('plans', query)
    return Response.json({ plans })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { type, title, subject, grade, content, parentId } = await request.json()
    if (!type || !title) return Response.json({ error: 'type and title required' }, { status: 400 })
    const [plan] = await sbInsert('plans', [{
      user_id: user.id, type, title, subject: subject || null, grade: grade || null,
      content: content || {}, parent_id: parentId || null,
    }])
    return Response.json({ plan })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id, content, title } = await request.json()
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    const patch = { updated_at: new Date().toISOString() }
    if (content !== undefined) patch.content = content
    if (title !== undefined) patch.title = title
    const [plan] = await sbUpdate('plans', `?id=eq.${id}&user_id=eq.${user.id}`, patch)
    return Response.json({ plan })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    await sbDelete('plans', `?id=eq.${id}&user_id=eq.${user.id}`) // cascades to children
    return Response.json({ deleted: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
