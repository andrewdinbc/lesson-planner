import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// School calendar PDFs (like the district ones teachers get) reliably
// include a small set of clean labeled summary stats -- but the label and
// its number are NOT always adjacent in the extracted text. Real-world
// test (Cowichan Valley SD 2025-26 calendar): pdf-parse's default text
// order puts "Days of instruction" and "180" on completely separate
// lines with unrelated content between them, because the PDF is a
// two-column layout (calendar grid + stats sidebar) and pdf-parse
// doesn't reconstruct visual columns. A naive adjacent-text regex finds
// nothing on documents like this.
//
// Strategy: try the cheap regex first (works fine on simpler/single-
// column PDFs). If it comes up empty on the fields that matter most
// (daysOfInstruction), fall back to asking Claude to read the raw
// extracted text and pull out the same fields -- much more robust to
// text-order scrambling since it's reading for meaning, not position.
function parseSummaryRegex(text) {
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

async function parseSummaryWithAI(text) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `This is raw text extracted from a school district calendar PDF. The extraction process may have scrambled the visual layout, so labels and their numbers might not be adjacent in the text -- read the whole thing for meaning, not just nearby-text matching.

Find these values if present anywhere in the text (they're usually in a legend/summary box on the calendar):
- Days in session (total, a number like 187)
- Days of instruction (a number like 180 -- this is the important one, smaller than "days in session" since it excludes Pro-D/admin days)
- Pro-D days (a small number like 6)
- Administrative days (a small number like 1)
- Instructional hours, elementary (a number like 878)
- Instructional hours, secondary (a number like 957)
- School Opening date
- Last day of school date
- Winter Vacation date range
- Spring Vacation date range

Respond with ONLY a JSON object, no other text, no markdown fences:
{"daysInSession": number|null, "daysOfInstruction": number|null, "proDDays": number|null, "administrativeDays": number|null, "instructionalHoursElementary": number|null, "instructionalHoursSecondary": number|null, "schoolOpening": string|null, "lastDayOfSchool": string|null, "winterVacation": string|null, "springVacation": string|null}

TEXT:
${text.slice(0, 8000)}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
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

    let summary = parseSummaryRegex(extracted.text)
    let parseMethod = 'regex'

    if (!summary.daysOfInstruction) {
      try {
        summary = await parseSummaryWithAI(extracted.text)
        parseMethod = 'ai'
      } catch (e) {
        // AI fallback itself failed -- return what regex found (likely
        // mostly nulls) rather than a hard error, so the teacher can
        // still enter weeks manually with a clear signal why.
        parseMethod = 'failed'
      }
    }

    const existing = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=id&limit=1`)
    const row = { school_calendar_summary: summary, school_calendar_raw_text: extracted.text.slice(0, 20000) }
    if (existing.length) {
      await sbUpdate('teacher_inventories', `?user_id=eq.${user.id}`, row)
    } else {
      await sbInsert('teacher_inventories', [{ user_id: user.id, ...row }])
    }

    return Response.json({ summary, parseMethod })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
