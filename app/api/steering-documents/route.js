import { sbSelect, sbInsert, sbDelete } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/session'
import { DEFAULT_CATEGORY } from '../../../lib/steering-categories'

// "Steering documents": full source texts (curriculum guides, exemplar
// units, board policy docs, full books/resources) that get fed into
// generation prompts as background context — per Aj's explicit
// requirement, so plan generation is grounded in real source material
// instead of generic output. Organized into three categories (see
// lib/steering-categories.js) that each play a distinct role in how
// they're applied during generation.

// Admin-only: steering docs are Aj's background context for generation,
// never a teacher-facing feature. See app/api/steering-documents/upload/route.js
// for the same gating pattern (also allows Hyperion server-to-server calls).
const ADMIN_EMAIL = 'andrewsinbc3@gmail.com'
const ADMIN_USER_ID = '7844844f-f54f-43c1-ae44-94ec37e97778'

async function requireAdmin(request) {
  const syncSecret = request.headers.get('x-steering-sync-secret')
  if (syncSecret && process.env.STEERING_SYNC_SECRET && syncSecret === process.env.STEERING_SYNC_SECRET) {
    return { id: ADMIN_USER_ID, email: ADMIN_EMAIL }
  }
  const user = await getCurrentUser()
  if (user && user.email === ADMIN_EMAIL) return user
  return null
}

export async function GET(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const docs = await sbSelect(
      'steering_documents',
      `?select=id,title,author,category,num_pages,char_count,source_url,source_type,created_at&order=created_at.desc`
    )
    return Response.json({ documents: docs })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// Paste-text path (short docs, excerpts). Full book uploads go through
// /api/steering-documents/upload instead.
export async function POST(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { title, fullText, category, author } = await request.json()
    if (!title || !fullText) return Response.json({ error: 'title and fullText required' }, { status: 400 })
    const [doc] = await sbInsert('steering_documents', [
      {
        user_id: user.id,
        title,
        full_text: fullText,
        category: category || DEFAULT_CATEGORY,
        author: author || null,
        char_count: fullText.length,
      },
    ])
    return Response.json({ document: { id: doc.id, title: doc.title, category: doc.category, created_at: doc.created_at } })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    await sbDelete('steering_documents', `?id=eq.${id}`)
    return Response.json({ deleted: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}


