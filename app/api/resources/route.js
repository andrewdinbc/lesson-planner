import { sbSelect, sbInsert, sbDelete } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/session'

// Teacher Resources -- separate from steering_documents (which stays
// Aj's admin-only content, see app/api/steering-documents/route.js).
// Each teacher manages their own list; scoped by user_id, no admin gate.

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const resources = await sbSelect('teacher_resources', `?user_id=eq.${user.id}&select=*&order=created_at.desc`)
    return Response.json({ resources })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { title, url, notes } = await request.json()
    if (!title) return Response.json({ error: 'title required' }, { status: 400 })
    const [resource] = await sbInsert('teacher_resources', [{ user_id: user.id, title, url: url || null, notes: notes || null }])
    return Response.json({ resource })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    await sbDelete('teacher_resources', `?id=eq.${id}&user_id=eq.${user.id}`)
    return Response.json({ deleted: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
