import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// School calendar PDFs (like the district ones teachers get) reliably
// include a small set of clean labeled summary stats even though the
// actual day-by-day grid is unreliable to parse from extracted text.
// We only trust these labeled pairs, not an attempt to reconstruct which
// specific dates are off - that's what the raw text stays around for (a
// human, or a future more careful parser, can still reference it).
function parseSummary(text) {
  const grab = (label) => {
    const m = text.match(new RegExp(`${label}\\s*[:\\-]?\\s*(\\d+)`, 'i'))
    return m ? parseInt(m[1], 10) : null
  }
  const grabRange = (label) => {
    const m = text.match(new RegExp(`${label}\\s*[:\\-]?\\s*([A-Za-z]+\\.?\\s*\\d{1,2}(?:\\s*-\\s*[A-Za-z]*\\.?\\s*\\d{1,2})?)`, 'i'))
    return m ? m[1].trim() : null
  }

  return {
    daysInSession: grab('Days in session'),
    daysOfInstruction: grab('Days of instruction'),
    proDDays: grab('Pro-D days'),
    administrativeDays: grab('Administrative days'),
    instructionalHoursElementary: grab('Elementary'),
    instructionalHoursSecondary: grab('Secondary'),
    schoolOpening: grabRange('School Opening'),
    lastDayOfSchool: grabRange('Last day of school'),
    winterVacation: grabRange('Winter Vacation'),
    springVacation: grabRange('Spring Vacation'),
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

    const summary = parseSummary(extracted.text)

    const existing = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=id&limit=1`)
    const row = { school_calendar_summary: summary, school_calendar_raw_text: extracted.text.slice(0, 20000) }
    if (existing.length) {
      await sbUpdate('teacher_inventories', `?user_id=eq.${user.id}`, row)
    } else {
      await sbInsert('teacher_inventories', [{ user_id: user.id, ...row }])
    }

    return Response.json({ summary })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
