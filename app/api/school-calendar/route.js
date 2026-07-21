import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { isSubstantiveText } from '@/lib/content-extraction-guard'

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
// nothing on documents like this -- so this route asks Claude to read
// the whole extracted text and return real ISO dates (it can infer the
// school year from the document title/header, e.g. "School Calendar
// 2025-26", even though "Sept. 2" alone has no year attached).
async function parseWithAI(text) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `This is raw text extracted from a school district calendar PDF (likely BC, Canada). The extraction may have scrambled the visual layout -- labels and numbers might not be adjacent in the text. Read the whole thing for meaning.

Find, if present anywhere in the text:
- The school year this calendar covers (e.g. "2025-26" is often in the title/header)
- Days of instruction (a number, typically 175-185 for BC)
- Days in session (a number, typically 185-190)
- Pro-D days, Administrative days (small numbers)
- Instructional hours, elementary and secondary
- School Opening date (first instructional day)
- Last day of school date
- Winter Vacation and Spring Vacation date ranges

For School Opening and Last day of school, output REAL ISO dates (YYYY-MM-DD), inferring the year from the school-year title (a "Sept" date uses the first year, a "June" date uses the second year of a "2025-26"-style title).

Respond with ONLY a JSON object, no other text, no markdown fences:
{"schoolYear": string|null, "daysInSession": number|null, "daysOfInstruction": number|null, "proDDays": number|null, "administrativeDays": number|null, "instructionalHoursElementary": number|null, "instructionalHoursSecondary": number|null, "schoolOpeningDate": "YYYY-MM-DD"|null, "lastDayDate": "YYYY-MM-DD"|null, "winterVacation": string|null, "springVacation": string|null}

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

// Cheap regex pass first -- works fine on simpler single-column PDFs and
// costs nothing. Only reaches for the AI call when this comes up empty.
function parseSummaryRegex(text) {
  const grab = (label) => {
    const m = text.match(new RegExp(`${label}\\s*[:\\-]?\\s*(\\d+)`, 'i'))
    return m ? parseInt(m[1], 10) : null
  }
  return {
    daysInSession: grab('Days in session'),
    daysOfInstruction: grab('Days of instruction'),
    proDDays: grab('Pro-D days'),
    administrativeDays: grab('Administrative days'),
    instructionalHoursElementary: grab('Elementary'),
    instructionalHoursSecondary: grab('Secondary'),
    schoolOpeningDate: null,
    lastDayDate: null,
    winterVacation: null,
    springVacation: null,
    schoolYear: null,
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

    // Global fix (2026-07-21): unconditional use of extracted.text below
    // -- a scanned-image PDF would silently produce an empty regex pass,
    // a wasted AI call, and a near-empty teacher_inventories row. See
    // lib/content-extraction-guard.js.
    if (!isSubstantiveText(extracted.text)) {
      return Response.json({
        error: 'Extracted almost no text from this PDF -- it may be scanned images rather than real text, which this upload path can\u2019t read.',
      }, { status: 422 })
    }

    let summary = parseSummaryRegex(extracted.text)
    let parseMethod = 'regex'

    // Regex never finds dates (deliberately not attempted -- too fragile
    // for date text), so always use AI when we need real dates, unless
    // the regex pass already found daysOfInstruction AND that's genuinely
    // enough for this teacher's purposes. In practice: always try AI
    // first for dates since that's the primary UI input now.
    try {
      const aiResult = await parseWithAI(extracted.text)
      summary = { ...summary, ...aiResult }
      parseMethod = 'ai'
    } catch (e) {
      parseMethod = summary.daysOfInstruction ? 'regex-only' : 'failed'
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
