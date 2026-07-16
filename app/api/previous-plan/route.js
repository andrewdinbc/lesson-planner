import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbSelect, sbInsert, sbDelete } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('previous_plan_uploads', `?user_id=eq.${user.id}&select=id,filename,uploaded_at&order=uploaded_at.desc&limit=1`)
    return Response.json({ upload: rows[0] || null })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'file is required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let extracted
    try {
      extracted = await extractPdfText(buffer)
    } catch (e) {
      return Response.json({ error: `Could not read PDF: ${e.message}` }, { status: 422 })
    }

    // Only keep the most recent upload -- clear any prior one first, this
    // isn't meant to be a library of old plans, just "the plan I want to
    // adapt right now."
    const existing = await sbSelect('previous_plan_uploads', `?user_id=eq.${user.id}&select=id`)
    for (const row of existing) {
      await sbDelete('previous_plan_uploads', `?id=eq.${row.id}`)
    }

    const [saved] = await sbInsert('previous_plan_uploads', [{
      user_id: user.id, filename: file.name, extracted_text: extracted.text.slice(0, 40000),
    }])

    return Response.json({ upload: { id: saved.id, filename: saved.filename, uploaded_at: saved.uploaded_at } })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    await sbDelete('previous_plan_uploads', `?user_id=eq.${user.id}`)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
