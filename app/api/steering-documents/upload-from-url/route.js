import { sbInsert } from '../../../../lib/supabase'
import { getCurrentUser } from '../../../../lib/session'
import { extractPdfText } from '../../../../lib/pdf-extract'
import { STEERING_CATEGORY_MAP, DEFAULT_CATEGORY } from '../../../../lib/steering-categories'
import { isSubstantiveText } from '../../../../lib/content-extraction-guard'

// Large-file upload path: the browser uploads the PDF straight to Vercel
// Blob (bypassing the 4.5MB serverless function body limit entirely),
// then hands us just the blob URL here. We fetch the file server-to-server
// - outbound fetches aren't subject to the same request-body cap - and
// extract/store it exactly like the direct-upload path. See
// app/api/steering-documents/upload/route.js for small-file uploads and
// the same admin gating pattern.

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

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { url, title, category: rawCategory, author } = await request.json()
    const category = rawCategory || DEFAULT_CATEGORY

    if (!url) return Response.json({ error: 'url is required' }, { status: 400 })
    if (!title) return Response.json({ error: 'title is required' }, { status: 400 })
    if (!STEERING_CATEGORY_MAP[category]) {
      return Response.json({ error: `category must be one of: ${Object.keys(STEERING_CATEGORY_MAP).join(', ')}` }, { status: 400 })
    }

    const fileRes = await fetch(url)
    if (!fileRes.ok) return Response.json({ error: `Could not fetch file from blob storage (${fileRes.status})` }, { status: 422 })
    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extracted
    try {
      extracted = await extractPdfText(buffer)
    } catch (e) {
      return Response.json({ error: `Could not read PDF: ${e.message}` }, { status: 422 })
    }

    if (!isSubstantiveText(extracted.text)) {
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
        author: author || null,
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
