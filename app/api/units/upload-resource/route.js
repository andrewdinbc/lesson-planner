// app/api/units/upload-resource/route.js
// Teacher's own resource upload for a specific unit (step 2 of the flow --
// "upload activities they have OR AI generates the resources"). Extracts
// text so it's usable later (e.g. referenced when generating the unit or
// printed into the final planner), stores the file's extracted text
// alongside the AI-generated resources in unit_priorities.resources.
//
// Also saves a copy into forge_resources (Project Forge, Aj 2026-07-17):
// central storage where any uploaded PDF or URL can be edited/remixed and
// then either pushed into AI steering documents or marked for a future
// TPT listing, independent of which unit it was originally attached to.
import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbInsert } from '@/lib/supabase'

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const subject = formData.get('subject') || null
    const unitName = formData.get('unitName') || null
    if (!file) return Response.json({ error: 'file is required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let extracted
    try {
      extracted = await extractPdfText(buffer)
    } catch (e) {
      return Response.json({ error: `Could not read PDF: ${e.message}` }, { status: 422 })
    }

    const text = extracted.text.slice(0, 20000)

    const [forgeRow] = await sbInsert('forge_resources', [{
      user_id: user.id, subject, unit_name: unitName,
      source_type: 'pdf', title: file.name,
      original_text: text,
    }])

    return Response.json({
      resource: {
        type: 'teacher_upload',
        label: file.name,
        detail: text,
        uploaded_at: new Date().toISOString(),
        forge_resource_id: forgeRow.id,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
