// app/api/year-plan/subject-qa/route.js
// AI Q&A box for the Year Structure subject walkthrough (app/year-plan/page.js)
// -- while setting up their year, a teacher can ask a quick question about
// a specific subject/period ("what should Grade 7 fractions cover this
// term?") without leaving the page or waiting for a full plan generation.
// Grounded the same way full plan generation is (lib/steering-context.js),
// but kept short since this is a sidebar Q&A, not a plan-generation surface.
// No conversation history is persisted -- stateless per question, matching
// the lightweight nature of an inline walkthrough helper.
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { buildSteeringContext } from '@/lib/steering-context'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { question, subject, grade, modelKey } = await request.json()
    if (!question?.trim()) return Response.json({ error: 'Question required' }, { status: 400 })

    const steeringContext = await buildSteeringContext()

    const prompt = `You are helping a K-12 teacher who is currently setting up their Year Structure for the subject "${subject || 'their class'}"${grade ? ` (Grade ${grade})` : ''}, using the "${modelKey || 'subject_centered'}" curriculum lens. They've asked a quick question while walking through this setup step -- answer directly and concisely (2-4 sentences unless the question genuinely needs a list). Do not generate a full unit or lesson plan; that's a separate feature. If the question is really asking for a full plan, say so briefly and point them to the plan generator instead of attempting it here.${steeringContext}

Teacher's question: ${question.trim()}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    const answer = message.content.find((b) => b.type === 'text')?.text || ''

    return Response.json({ answer })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
