import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { extractPdfText } from '@/lib/pdf-extract'
import { sbSelect, sbInsert, sbDelete } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// BC's real curriculum subject list -- keeps inference grounded to
// actual options rather than the AI inventing subject names that won't
// match anything on /class-setup.
const KNOWN_SUBJECTS = [
  'Language Arts', 'Mathematics', 'Science', 'Social Studies',
  'Physical Education', 'Art', 'Music', 'Applied Design, Skills & Technologies',
  'Health & Career Education', 'French', 'Other',
]
const KNOWN_GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

async function inferFromPlan(text) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `This is a teacher's previous lesson/unit/year plan, uploaded so we can pre-fill their profile. Read it and infer:

1. Which grade(s) this plan is for (use only these exact values: ${KNOWN_GRADES.join(', ')})
2. Which subject(s) this plan covers (use only these exact labels: ${KNOWN_SUBJECTS.join(', ')})
3. A brief, evidence-based note on any teaching-style signals you can genuinely observe in how the plan is written (e.g. heavy on hands-on projects vs. worksheet-based, inquiry-driven vs. direct instruction, themed/integrated vs. subject-siloed). Keep this short and only include things actually supported by the text -- if you can't tell, say so plainly rather than guessing.

If you genuinely cannot determine grade or subject from the text, return an empty array rather than guessing randomly.

Respond with ONLY a JSON object, no other text, no markdown fences:
{"grades": string[], "subjects": string[], "teachingStyleNotes": string}

PLAN TEXT:
${text.slice(0, 15000)}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  return {
    grades: (parsed.grades || []).filter((g) => KNOWN_GRADES.includes(g)),
    subjects: (parsed.subjects || []).filter((s) => KNOWN_SUBJECTS.includes(s)),
    teachingStyleNotes: parsed.teachingStyleNotes || '',
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('previous_plan_uploads', `?user_id=eq.${user.id}&select=id,filename,uploaded_at,inferred_grades,inferred_subjects,inferred_teaching_style_notes&order=uploaded_at.desc&limit=1`)
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

    // Infer grade/subject/teaching-style signals so the next step
    // (What do you teach?) can be pre-filled instead of asked blind --
    // fails soft, upload still succeeds even if inference fails.
    let inference = { grades: [], subjects: [], teachingStyleNotes: '' }
    try {
      inference = await inferFromPlan(extracted.text)
    } catch {
      // inference failed -- upload still saved, just without pre-fill data
    }

    const [saved] = await sbInsert('previous_plan_uploads', [{
      user_id: user.id, filename: file.name, extracted_text: extracted.text.slice(0, 40000),
      inferred_grades: inference.grades, inferred_subjects: inference.subjects,
      inferred_teaching_style_notes: inference.teachingStyleNotes,
    }])

    return Response.json({
      upload: {
        id: saved.id, filename: saved.filename, uploaded_at: saved.uploaded_at,
        inferred_grades: saved.inferred_grades, inferred_subjects: saved.inferred_subjects,
        inferred_teaching_style_notes: saved.inferred_teaching_style_notes,
      },
    })
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
