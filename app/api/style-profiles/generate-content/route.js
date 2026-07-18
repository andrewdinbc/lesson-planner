// app/api/style-profiles/generate-content/route.js
// Closes the loop on style blending: given a style_profiles blend (format/
// tone/structure only, see extract-style-pattern) and a GRADE + JURISDICTION
// the end user (whoever is designing or buying the product) selects,
// generates wholly original instructional content -- questions, passages,
// problems, prompts, tasks, examples -- grounded in:
//   1. The official curriculum content for that exact grade AND
//      jurisdiction. BC uses structured, Ministry-sourced data
//      (curriculum-full-elaborations.js). Any other province, state, or
//      country falls back to the model's general knowledge of that
//      jurisdiction's curriculum standards -- flagged with lower
//      confidence in the response since it isn't grounded in a scraped
//      source the way BC is.
//   2. The teacher's blended style profile (format/tone/pacing only),
//   3. Their own steering documents.
// Content here is never derived from any purchased/uploaded resource --
// it's freshly written by AI to match the curriculum standard for the
// grade AND jurisdiction the end user picked. This is what makes the
// resulting product legitimately sellable: the content is originated
// here, not extracted from anyone else's paid material. Aj, 2026-07-18.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert } from '@/lib/supabase'
import { buildSteeringContext } from '@/lib/steering-context'
import { CURRICULUM_ELABORATIONS, ELABORATIONS_SUBJECT_MAP } from '@/lib/curriculum-full-elaborations'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BC_ALIASES = ['bc', 'british columbia', 'british columbia, canada']

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { styleProfileId, subject, grade, topic, jurisdiction } = await request.json()
    if (!subject || !grade) return Response.json({ error: 'subject and grade are required' }, { status: 400 })
    const jur = (jurisdiction || 'British Columbia, Canada').trim()
    const isBC = BC_ALIASES.includes(jur.toLowerCase())

    const [profile] = styleProfileId
      ? await sbSelect('style_profiles', `?id=eq.${styleProfileId}&user_id=eq.${user.id}&select=*`)
      : [null]

    let curriculumBlock
    let curriculumConfidence = 'grounded' // 'grounded' (BC, scraped Ministry data) | 'general_knowledge' (everywhere else)

    if (isBC) {
      const subjectKey = ELABORATIONS_SUBJECT_MAP[subject]
      const curriculumGrade = subjectKey ? CURRICULUM_ELABORATIONS[subjectKey]?.[grade] : null
      curriculumBlock = curriculumGrade
        ? `Official BC Curriculum for ${subject}, Grade ${grade}:
Big Ideas: ${curriculumGrade.bigIdeas.join(' | ')}
Content: ${curriculumGrade.content.join(' | ')}`
        : `No structured BC curriculum data found for ${subject} Grade ${grade} -- use general grade-appropriate BC curriculum knowledge.`
      if (!curriculumGrade) curriculumConfidence = 'general_knowledge'
    } else {
      curriculumBlock = `Jurisdiction: ${jur}. Use your general knowledge of ${jur}'s official curriculum standards for ${subject}, Grade ${grade} (e.g. Common Core / state standards for a US state, a province's own curriculum, a national curriculum). This is NOT grounded in a scraped official source the way BC content is -- stay conservative and general rather than inventing specific standard codes you're not confident about.`
      curriculumConfidence = 'general_knowledge'
    }

    let steeringContext = ''
    try { steeringContext = await buildSteeringContext() } catch { /* optional */ }

    const styleBlock = profile
      ? `Style/genre to write in (format, tone, pacing -- NOT content to copy): ${profile.blended_style_text}`
      : 'No specific style profile selected -- use clear, grade-appropriate, engaging style.'

    const prompt = `You are writing WHOLLY ORIGINAL instructional content for a teaching resource. This content must be entirely your own creation -- do not reference or reproduce any existing published resource's specific questions, passages, or exercises.

Subject: ${subject}
Grade: ${grade}
${topic ? `Topic/focus: ${topic}` : ''}

${curriculumBlock}

${styleBlock}
${steeringContext}

Write original instructional content appropriate for this grade and curriculum: 4-6 concrete items (questions, problems, prompts, or tasks depending on subject) that a teacher could use directly. Make it genuinely new material, grade-accurate for ${jur}, and written in the requested style.

Respond with ONLY JSON, no markdown fences:
{"title": "a title for this content set", "items": [{"type": "question|problem|prompt|task", "text": "the actual original content item"}]}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}'
    const generated = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const bodyText = generated.items.map((item, i) => `${i + 1}. [${item.type}] ${item.text}`).join('\n\n')
    const [saved] = await sbInsert('forge_resources', [{
      user_id: user.id, subject, source_type: 'pdf', origin: 'ai_generated_original',
      title: generated.title || `Original content — ${subject} Grade ${grade} (${jur})`,
      original_text: bodyText,
      edited_text: bodyText,
      status: 'edited',
    }])

    return Response.json({ content: generated, savedResourceId: saved.id, jurisdiction: jur, curriculumConfidence })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
