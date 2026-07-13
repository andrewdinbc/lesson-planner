import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/session'
import { STEERING_CATEGORIES, STEERING_CATEGORY_MAP } from '../../../lib/steering-categories'

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

    // Steering documents are organized into three categories, each playing
    // a distinct role in generation (see lib/steering-categories.js) rather
    // than being dumped in as one undifferentiated pile of background text.
    // Full books (100+ pages) get a much larger per-document budget than
    // the old flat 8000-char cap so the author's actual approach comes
    // through - a combined ceiling across all selected docs still guards
    // against blowing the prompt budget when several are selected at once.
    // Steering documents are global background context set by Aj — they
    // ground every generation for every account automatically. Teachers
    // never see or pick these; there is no per-user scoping and no
    // steeringDocIds selection step.
    let steeringContext = ''
    {
      const docs = await sbSelect('steering_documents', `?select=title,author,category,full_text`)

      if (docs.length) {
        const PER_DOC_MAX = 45000
        const TOTAL_MAX = 150000
        let remaining = TOTAL_MAX

        const byCategory = {}
        for (const cat of STEERING_CATEGORIES) byCategory[cat.key] = []
        for (const doc of docs) {
          const key = STEERING_CATEGORY_MAP[doc.category] ? doc.category : 'actionable_resources'
          byCategory[key].push(doc)
        }

        const sections = []
        for (const cat of STEERING_CATEGORIES) {
          const catDocs = byCategory[cat.key]
          if (!catDocs.length || remaining <= 0) continue

          const docTexts = catDocs.map((d) => {
            const budget = Math.min(PER_DOC_MAX, remaining)
            const excerpt = d.full_text.slice(0, budget)
            remaining -= excerpt.length
            const truncatedNote = d.full_text.length > excerpt.length
              ? `\n[...excerpt continues beyond what fit here; treat this as representative of the whole work's approach, not a complete transcript...]`
              : ''
            const byline = d.author ? ` by ${d.author}` : ''
            return `--- "${d.title}"${byline} ---\n${excerpt}${truncatedNote}`
          }).join('\n\n')

          sections.push(
            `### ${cat.label}\n(How to use this: ${cat.promptRole})\n\n${docTexts}`
          )
        }

        if (sections.length) {
          steeringContext = '\n\nBACKGROUND SOURCE MATERIAL — organized by role, ground your output in these ' +
            'and do not contradict them. Each category below is meant to inform a different part of the plan, ' +
            'as described under its heading:\n\n' + sections.join('\n\n')
        }
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


