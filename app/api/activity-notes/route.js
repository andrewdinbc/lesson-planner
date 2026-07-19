import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbSelect, sbInsert, sbUpdate, sbUploadFile } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// Subject-level free-form notes + optional uploaded reference docs (e.g. a
// literacy guide PDF), separate from unit_priorities. This is a low-stakes
// "make sure these things don't get lost" box -- teachers jot activities
// they always want included in point form, and can optionally attach a PDF
// they like using for reference. Nothing here is auto-turned into units;
// it's read by whatever builds the year plan on the next step.
//
// 2026-07-19: PDF uploads here now also save into forge_resources (Project
// Forge) the same way app/api/units/upload-resource does -- this was a
// genuine "end user uploads a PDF" path that wasn't feeding Forge yet.
// Best-effort: if the Forge copy fails, the subject note upload still
// succeeds (that's the primary feature; Forge is a secondary side-effect).

export async function GET(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  if (!subject) return Response.json({ error: 'subject is required' }, { status: 400 })
  try {
    const rows = await sbSelect('subject_activity_notes', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(subject)}&select=notes_text,uploaded_docs,updated_at`)
    return Response.json({ notes: rows[0] || { notes_text: '', uploaded_docs: [] } })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// Saving text notes: JSON body { subject, notes_text }
// Uploading a PDF: multipart form-data with fields `subject` and `file`
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const subject = formData.get('subject')
      const file = formData.get('file')
      if (!subject || !file) return Response.json({ error: 'subject and file are required' }, { status: 400 })

      const buffer = Buffer.from(await file.arrayBuffer())
      let extracted
      try {
        extracted = await extractPdfText(buffer)
      } catch (e) {
        return Response.json({ error: `Could not read PDF: ${e.message}` }, { status: 422 })
      }

      const existing = await sbSelect('subject_activity_notes', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(subject)}&select=id,uploaded_docs`)
      const newDoc = { filename: file.name, extracted_text: extracted.text.slice(0, 40000), uploaded_at: new Date().toISOString() }

      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileUrl = await sbUploadFile('forge-resources', `${user.id}/${Date.now()}-${safeName}`, buffer, 'application/pdf')
        await sbInsert('forge_resources', [{
          user_id: user.id, subject, source_type: 'pdf', title: file.name,
          original_text: extracted.text.slice(0, 20000), file_url: fileUrl,
        }])
      } catch (e) {
        // Non-fatal -- subject note upload still succeeds without the Forge copy.
        console.error('forge_resources copy failed for activity-notes upload:', e.message)
      }

      if (existing[0]) {
        const docs = [...(existing[0].uploaded_docs || []), newDoc]
        await sbUpdate('subject_activity_notes', `?id=eq.${existing[0].id}`, { uploaded_docs: docs, updated_at: new Date().toISOString() })
        return Response.json({ uploaded_docs: docs })
      } else {
        const [saved] = await sbInsert('subject_activity_notes', [{ user_id: user.id, subject, notes_text: '', uploaded_docs: [newDoc] }])
        return Response.json({ uploaded_docs: saved.uploaded_docs })
      }
    }

    const body = await request.json()
    const { subject, notes_text } = body
    if (!subject) return Response.json({ error: 'subject is required' }, { status: 400 })

    const existing = await sbSelect('subject_activity_notes', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(subject)}&select=id`)
    if (existing[0]) {
      await sbUpdate('subject_activity_notes', `?id=eq.${existing[0].id}`, { notes_text: notes_text || '', updated_at: new Date().toISOString() })
    } else {
      await sbInsert('subject_activity_notes', [{ user_id: user.id, subject, notes_text: notes_text || '' }])
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
