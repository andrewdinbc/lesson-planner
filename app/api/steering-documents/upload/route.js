import { sbInsert } from '../../../../lib/supabase'
import { getCurrentUser } from '../../../../lib/session'
import { extractPdfText } from '../../../../lib/pdf-extract'
import { STEERING_CATEGORY_MAP, DEFAULT_CATEGORY } from '../../../../lib/steering-categories'

// Full-book upload path: PDFs of 100+ pages get their text extracted
// server-side and stored whole (Postgres TEXT has no meaningful size limit
// for this use case) so generation can draw on the complete work rather
// than a fragment - see app/api/generate/route.js for how category
// determines what role the extracted text plays.

export const runtime = 'nodejs'
export const maxDuration = 60 // large PDFs take longer than the default to parse

// Steering documents are Aj's own admin-only background context (see
// app/steering/page.js and app/api/generate/route.js) - never a
// teacher-facing feature. Two valid callers: Aj's own browser session
// (checked against ADMIN_EMAIL), or Hyperion Command Centre uploading
// server-to-server with STEERING_SYNC_SECRET, since Hyperion has no
// lesson-planner login session to send.
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

export async function POST(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const title = formData.get('title')
    const category = formData.get('category') || DEFAULT_CATEGORY
    const author = formData.get('author') || null

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }
    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }
    if (!STEERING_CATEGORY_MAP[category]) {
      return Response.json({ error: `category must be one of: ${Object.keys(STEERING_CATEGORY_MAP).join(', ')}` }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extracted
    try {
      extracted = await extractPdfText(buffer)
    } catch (e) {
      return Response.json({ error: `Could not read PDF: ${e.message}` }, { status: 422 })
    }

    if (!extracted.text || extracted.text.trim().length < 50) {
      return Response.json(
        { error: 'Extracted almost no text - this PDF may be scanned images rather than real text, which this upload path can\u2019t read.' },
        { status: 422 }
      )
    }

    const [doc] = await sbInsert('steering_documents', [
      {
        user_id: user.id,
        title,
        full_text: extracted.text,
        category,
        author,
        num_pages: extracted.numPages,
        char_count: extracted.text.length,
      },
    ])

    return Response.json({
      document: {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        num_pages: doc.num_pages,
        char_count: doc.char_count,
        created_at: doc.created_at,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

