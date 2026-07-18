// app/api/forge/bulk-upload-tpt/route.js
// Bulk import of a teacher's already-purchased TPT resources into Forge,
// so that material can be edited/remixed and pushed into AI steering --
// "enhance its ability" using content the teacher already owns, per Aj's
// 2026-07-18 request. Accepts multiple PDF files in one request; each
// becomes its own forge_resources row with origin='tpt_purchase'.
import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbInsert } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const formData = await request.formData()
    const files = formData.getAll('files')
    if (!files.length) return Response.json({ error: 'No files provided' }, { status: 400 })

    const results = []
    const errors = []

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const extracted = await extractPdfText(buffer)
        const [row] = await sbInsert('forge_resources', [{
          user_id: user.id,
          source_type: 'pdf',
          origin: 'tpt_purchase',
          title: file.name.replace(/\.pdf$/i, ''),
          original_text: extracted.text.slice(0, 20000),
        }])
        results.push(row)
      } catch (e) {
        errors.push({ filename: file.name, error: e.message })
      }
    }

    return Response.json({ imported: results, errors })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
