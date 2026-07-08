import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/session'

// The core "steering" feature: full steering-document texts are pulled in
// and injected into the generation prompt as background context, so output
// is grounded in the teacher's actual source material rather than generic
// AI output. This is what Aj asked for explicitly — not a cosmetic feature.

const TYPE_GUIDANCE = {
  year: 'a full YEAR overview: major units/themes per term, pacing at a glance',
  month: 'a MONTH plan: which units/topics this month, rough weekly breakdown',
  week: 'a WEEK plan: daily topic breakdown for this week, tied to the month\'s goals',
  day: 'a DAY plan: the specific lessons/activities for this single day',
  lesson: 'a single detailed LESSON PLAN: objectives, materials, step-by-step activities, assessment, differentiation notes',
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { type, title, subject, grade, theme, numProjects, numWorksheets, parentId, steeringDocIds } = await request.json()
    if (!type || !TYPE_GUIDANCE[type]) return Response.json({ error: 'Valid type required (year/month/week/day/lesson)' }, { status: 400 })

    let parentContext = ''
    if (parentId) {
      const [parent] = await sbSelect('plans', `?id=eq.${parentId}&user_id=eq.${user.id}&select=type,title,content`)
      if (parent) parentContext = `\n\nThis plan is nested under a ${parent.type} plan titled "${parent.title}". Its content: ${JSON.stringify(parent.content).slice(0, 3000)}`
    }

    let steeringContext = ''
    if (steeringDocIds && steeringDocIds.length) {
      const idList = steeringDocIds.map((id) => `id.eq.${id}`).join(',')
      const docs = await sbSelect('steering_documents', `?user_id=eq.${user.id}&or=(${idList})&select=title,full_text`)
      if (docs.length) {
        steeringContext = '\n\nBACKGROUND SOURCE MATERIAL (ground your output in this, do not contradict it):\n' +
          docs.map((d) => `--- ${d.title} ---\n${d.full_text.slice(0, 8000)}`).join('\n\n')
      }
    }

    const prompt = `Generate ${TYPE_GUIDANCE[type]}.

Title: ${title}
Subject: ${subject || 'not specified'}
Grade: ${grade || 'not specified'}
Theme: ${theme || 'not specified'}
${numProjects ? `Number of hands-on projects: ${numProjects}` : ''}
${numWorksheets ? `Number of worksheets: ${numWorksheets}` : ''}
${parentContext}
${steeringContext}

Return the plan content as clean, well-structured Markdown suitable for direct display and .txt export.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })
    const generatedText = message.content.find((b) => b.type === 'text')?.text || ''

    const [plan] = await sbInsert('plans', [{
      user_id: user.id, type, title, subject: subject || null, grade: grade || null,
      parent_id: parentId || null,
      content: { markdown: generatedText, theme, numProjects, numWorksheets, steeringDocIds: steeringDocIds || [] },
    }])

    return Response.json({ plan })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
