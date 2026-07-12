import Anthropic from '@anthropic-ai/sdk'
import { sbSelect } from '../../../../lib/supabase'
import { STEERING_CATEGORIES } from '../../../../lib/steering-categories'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Cross-app, secret-gated - called from assessment-tool's Skill Mastery
// Trends when a criterion needs reteaching. Deliberately stateless (no
// session, doesn't save to a user's plan list): this app currently has no
// authenticated account to attribute a saved plan to, and forcing that
// requirement would block the feature entirely rather than degrade
// gracefully. Uses the SAME three-category steering framework
// (philosophy/psychology/actionable-resources) that shapes every other
// generation in this app - if Aj has uploaded real steering documents by
// the time this runs, it pulls them in exactly like /api/generate does;
// if not, it still reasons through the same three lenses as general best
// practice, and gets more grounded automatically once documents exist.

function checkAuth(request) {
  const secret = request.headers.get('x-lesson-planner-sync-secret') || ''
  return process.env.LESSON_PLANNER_SYNC_SECRET && secret === process.env.LESSON_PLANNER_SYNC_SECRET
}

export async function POST(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { criterionName, subject, grade, weaknessContext } = await request.json()
    if (!criterionName) return Response.json({ error: 'criterionName required' }, { status: 400 })

    // Pull in any steering documents that exist - best-effort, this
    // endpoint has no user_id scope to filter by (stateless caller), so
    // it uses whatever's in the table. Fine for Aj's single-teacher use;
    // would need a real owner scope if this ever serves multiple accounts.
    let steeringContext = ''
    try {
      const docs = await sbSelect('steering_documents', '?select=title,full_text&limit=5')
      if (docs?.length) {
        steeringContext = docs.map((d) => `${d.title}: ${(d.full_text || '').slice(0, 3000)}`).join('\n\n')
      }
    } catch { /* no steering docs configured yet - proceed without them */ }

    const frameworkGuidance = STEERING_CATEGORIES.map((c) => `${c.label}: ${c.promptRole}`).join('\n')

    const prompt = `You are designing a SHORT, focused remedial mini-lesson (15-20 minutes, one sitting)
to reteach a specific skill that class-wide data shows students are consistently missing.

Skill/criterion needing reteaching: ${criterionName}
Subject: ${subject || 'not specified'}
Grade: ${grade || 'not specified'}
${weaknessContext ? `Specific pattern observed in student work: ${weaknessContext}` : ''}

Reason through these three lenses, in this order, the way this teacher's other lesson plans are built:
${frameworkGuidance}
${steeringContext ? `\n\nThe teacher's own source material to ground this in:\n${steeringContext}` : ''}

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "title": "short lesson title",
  "objective": "one sentence - what students will be able to do after this",
  "hook": "1-2 sentence opener to re-engage students on this specific gap",
  "miniLesson": "the core reteaching content - concrete, 2-4 short paragraphs or a numbered sequence",
  "guidedPractice": "one quick practice task students do with support",
  "checkForUnderstanding": "a fast way to verify the skill actually landed before moving on"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const lesson = JSON.parse(cleaned)

    return Response.json({ lesson, usedSteeringDocs: !!steeringContext })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
