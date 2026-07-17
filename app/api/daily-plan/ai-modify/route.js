// app/api/daily-plan/ai-modify/route.js
// Click-a-cell AI modification for the Daily Planner Board (app/day/page.js).
// Three action types:
//   'skip'   -- instant, no AI call: relabels the block as skipped/free time.
//   'engage' -- AI call, no topic given: teacher is signaling the current
//               lesson is failing / kids aren't responding, generate a
//               quick, high-energy alternative activity for the same
//               subject and time slot.
//   'custom' -- AI call with a topic the teacher supplies: generate an
//               engaging lesson on that topic, sized to the block's actual
//               length_minutes so it's realistic to run right now.
// Grounded in steering documents the same way other generation routes are,
// kept short (this is a mid-lesson save, not a full lesson plan document).
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbSelect } from '@/lib/supabase'
import { buildSteeringContext } from '@/lib/steering-context'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { action, subject, length_minutes, topic } = await request.json()
    if (!action) return Response.json({ error: 'action is required' }, { status: 400 })

    if (action === 'skip') {
      return Response.json({ title: 'Free Time / Catch-Up', content: 'Lesson skipped for today.' })
    }

    if (action !== 'engage' && action !== 'custom') {
      return Response.json({ error: 'action must be skip, engage, or custom' }, { status: 400 })
    }
    if (action === 'custom' && !topic?.trim()) {
      return Response.json({ error: 'topic is required for a custom lesson' }, { status: 400 })
    }

    const [classSetup] = await sbSelect('teacher_class_setup', `?user_id=eq.${user.id}&select=grades&limit=1`)
    const grades = classSetup?.grades || []
    const steeringContext = await buildSteeringContext()
    const minutes = length_minutes || 30

    const prompt = action === 'engage'
      ? `A teacher${grades.length ? ` of Grade ${grades.join('/')}` : ''} is mid-class right now in a "${subject || 'class'}" block and the current lesson is failing -- students aren't responding or are disengaged. Give them ONE quick, concrete, high-energy alternative activity they can pivot to immediately, sized to fit the remaining ${minutes} minutes. This needs to be usable with zero prep -- things already in a normal classroom, no materials to print or gather. Keep it real and specific, not generic advice like "try a game."${steeringContext}

Respond with exactly two parts, each on its own line, no markdown headers:
TITLE: <a short 3-6 word activity name>
CONTENT: <2-4 sentences: what to do, step by step, concrete enough to run immediately>`
      : `A teacher${grades.length ? ` of Grade ${grades.join('/')}` : ''} wants an engaging ${subject || 'class'} lesson on this topic, sized to fit a ${minutes}-minute block, to run right now: "${topic.trim()}". Make it genuinely engaging for the age group (hands-on, discussion-driven, or game-based rather than a worksheet), realistic for zero extra prep time.${steeringContext}

Respond with exactly two parts, each on its own line, no markdown headers:
TITLE: <a short 3-6 word activity name>
CONTENT: <2-4 sentences: what to do, step by step, concrete enough to run immediately>`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = message.content.find((b) => b.type === 'text')?.text || ''

    const titleMatch = raw.match(/TITLE:\s*(.+)/i)
    const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/i)

    return Response.json({
      title: titleMatch?.[1]?.trim() || (action === 'custom' ? topic.trim() : 'Re-engage Activity'),
      content: contentMatch?.[1]?.trim() || raw.trim(),
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
