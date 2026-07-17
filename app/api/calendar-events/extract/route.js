// app/api/calendar-events/extract/route.js
// Upload a staff meeting minutes PDF (monthly) or principal's "week at a
// glance" (weekly) and pull out: (1) a plain-language notes summary, and
// (2) any specific dated/timed events mentioned (fire drill, assembly,
// PD half-day, picture day, etc.) -- each of which gets created as a
// calendar_events row and, if it has a time, auto-applied to that date's
// Daily Planner via the same bump logic as a manually-entered event.
// Same extraction pattern as app/api/school-calendar/route.js (PDF text
// extraction + Claude reading the whole thing for meaning, since minutes
// documents are messy/unstructured and a regex pass would find nothing).
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbInsert } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

async function parseWithAI(text, docType, todayIso) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const kindLabel = docType === 'meeting_minutes' ? 'staff meeting minutes' : "a principal's weekly \"week at a glance\" notice"
  const prompt = `This is raw text extracted from ${kindLabel} at a K-12 school. Today's date is ${todayIso} -- use it to resolve any relative dates ("this Thursday", "next week") into real ISO dates, and to infer the year for a bare date like "March 12".

Read the whole document for meaning (extraction may have scrambled layout/column order).

Return ONLY a JSON object, no other text, no markdown fences:
{
  "summary": "2-4 sentence plain-language summary of the key points a teacher needs to remember",
  "events": [
    { "date": "YYYY-MM-DD", "time": "HH:MM"|null, "lengthMinutes": number|null, "title": "short event name" }
  ]
}

Only include an "events" entry for something that happens on a SPECIFIC, identifiable date (fire drills, assemblies, PD days, picture day, early dismissal, field trips, etc.) -- not vague ongoing reminders ("remember to submit report cards"), those belong in the summary instead. If a time isn't stated, use null for time and lengthMinutes.

TEXT:
${text.slice(0, 10000)}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const docType = formData.get('docType') || 'meeting_minutes' // 'meeting_minutes' | 'week_at_a_glance'
    if (!file) return Response.json({ error: 'file is required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let extracted
    try {
      extracted = await extractPdfText(buffer)
    } catch (e) {
      return Response.json({ error: `Could not read PDF: ${e.message}` }, { status: 422 })
    }

    const todayIso = new Date().toISOString().slice(0, 10)
    const parsed = await parseWithAI(extracted.text, docType, todayIso)

    const [docRow] = await sbInsert('staff_document_notes', [{
      user_id: user.id, doc_type: docType, title: file.name || null,
      week_of: docType === 'week_at_a_glance' ? todayIso : null,
      summary: parsed.summary || '', raw_text: extracted.text.slice(0, 20000),
    }])

    // Create + auto-apply each extracted event via the shared endpoint's
    // logic (re-implemented inline here rather than importing route
    // handlers across files, which Next.js route modules don't support
    // cleanly) -- POST to our own /api/calendar-events for each one so
    // the bump logic only lives in one place.
    const createdEvents = []
    const origin = new URL(request.url).origin
    const cookie = request.headers.get('cookie') || ''
    for (const ev of (parsed.events || [])) {
      if (!ev.date) continue
      try {
        const res = await fetch(`${origin}/api/calendar-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie },
          body: JSON.stringify({
            event_date: ev.date, event_time: ev.time || null, length_minutes: ev.lengthMinutes || null,
            title: ev.title, source: docType, source_doc_title: file.name || null,
          }),
        })
        const data = await res.json()
        if (res.ok) createdEvents.push(data.event)
      } catch { /* one bad event shouldn't kill the whole upload */ }
    }

    return Response.json({ doc: docRow, events: createdEvents })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
