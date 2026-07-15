import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/session'
import { STEERING_CATEGORIES, STEERING_CATEGORY_MAP } from '../../../lib/steering-categories'
import { getCurriculum, focusForModel } from '../../../lib/bc-curriculum'

export const runtime = 'nodejs'
export const maxDuration = 120

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

    // Teacher inventory profile (optional, skippable at onboarding) - a
    // light-touch style hint, NOT a substitute for the steering material
    // above. This tells the AI which parts of the (mandatory) steering
    // documents to lean on harder for THIS teacher, not a separate source
    // of truth. Absent or skipped inventories just mean no extra hint -
    // generation still works fine on steering docs alone.
    let profileContext = ''
    {
      const [inv] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=tsi_dominant,tsi_adjusted,tpi_dominant,tpi_adjusted,philosophy_dominant,philosophy_adjusted,fte_percentage,subjects,grades,time_distribution,curriculum_model,school_calendar_summary,skipped&limit=1`)
      if (inv && !inv.skipped) {
        const bits = []
        const tsi = inv.tsi_adjusted?.dominant || inv.tsi_dominant
        const tpi = inv.tpi_adjusted?.dominant || inv.tpi_dominant
        const phil = inv.philosophy_adjusted?.dominant || inv.philosophy_dominant
        if (tsi) bits.push(`teaching style leans ${tsi}`)
        if (tpi) bits.push(`teaching perspective leans ${tpi}`)
        if (phil) bits.push(`philosophy of education leans ${phil}`)

        const contextBits = []
        if (inv.fte_percentage) contextBits.push(`teaches at ${inv.fte_percentage}% FTE`)
        if (Array.isArray(inv.grades) && inv.grades.length) contextBits.push(`teaches grade(s): ${inv.grades.join(', ')}`)

        let calendarBits = ''
        const cal = inv.school_calendar_summary
        if (cal && Object.values(cal).some(Boolean)) {
          const calParts = []
          if (cal.daysOfInstruction) calParts.push(`${cal.daysOfInstruction} instructional days this year`)
          if (cal.proDDays) calParts.push(`${cal.proDDays} Pro-D days (non-instructional)`)
          if (cal.winterVacation) calParts.push(`winter break: ${cal.winterVacation}`)
          if (cal.springVacation) calParts.push(`spring break: ${cal.springVacation}`)
          if (cal.instructionalHoursElementary) calParts.push(`elementary instructional hours: ${cal.instructionalHoursElementary}`)
          if (cal.instructionalHoursSecondary) calParts.push(`secondary instructional hours: ${cal.instructionalHoursSecondary}`)
          if (calParts.length) calendarBits = `\n\nSCHOOL CALENDAR (from this teacher's actual district calendar - pace the plan to genuinely fit within this, not a generic 10-month assumption): ${calParts.join('; ')}.`
        }
        if (inv.curriculum_model) contextBits.push(`this year plan should follow a ${inv.curriculum_model.replace(/_/g, ' ')} curriculum structure`)
        if (Array.isArray(inv.subjects) && inv.subjects.length) contextBits.push(`this year plan should cover: ${inv.subjects.join(', ')}`)

        let timeBits = ''
        if (inv.time_distribution && Object.keys(inv.time_distribution).length) {
          timeBits = `\n\nPREFERRED TIME DISTRIBUTION (target approximate % of instructional time per activity type - use this to shape the balance of activity types across the plan): ${Object.entries(inv.time_distribution).map(([k, v]) => `${k}: ${v}%`).join(', ')}.`
        }

        if (bits.length || contextBits.length || timeBits) {
          profileContext = `\n\nTEACHER PROFILE (guidance for tailoring this plan - beliefs/values dictate emphasis and style, not a separate source of content to invent from): ${bits.length ? `This teacher's ${bits.join('; ')}. Weight your use of the background material toward strategies that fit this profile where there's a genuine choice, without ignoring material that doesn't match it.` : ''} ${contextBits.length ? contextBits.join('; ') + '.' : ''}${timeBits}${calendarBits}`
        }
      }
    }


    // Official BC Ministry curriculum (Big Ideas / Content / Curricular
    // Competency), fetched live from curriculum.gov.bc.ca and cached -
    // this is the actual mandated curriculum, not steering material.
    // Which section gets emphasized depends on the teacher's chosen
    // curriculum model (Big-Ideas-focused vs Content-focused vs
    // Competency-focused), per Aj's request 2026-07-14.
    // Pacing anchors: units naturally wrap up right before a break or
    // reporting deadline, per Aj's request 2026-07-14. Uses exact report
    // card dates if the teacher provided them; otherwise falls back to
    // the general rule of thumb (before winter break, before spring
    // break, ~2 weeks before end of year), using extracted calendar
    // dates where available.
    let pacingContext = ''
    {
      const [inv3] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=knows_report_card_dates,report_card_dates,calendar_summary,skipped&limit=1`)
      if (inv3 && !inv3.skipped) {
        if (inv3.knows_report_card_dates && inv3.report_card_dates) {
          const dates = Object.entries(inv3.report_card_dates).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)
          if (dates.length) {
            pacingContext = `\n\nPACING ANCHORS (units should wrap up shortly before these report card due dates, not mid-unit): ${dates.join(', ')}.`
          }
        } else {
          const cal = inv3.calendar_summary || {}
          const bits = ['before winter break', 'before spring break', 'approximately two weeks before the end of the school year']
          if (cal.winterVacation) bits[0] = `before winter break (${cal.winterVacation})`
          if (cal.springVacation) bits[1] = `before spring break (${cal.springVacation})`
          pacingContext = `\n\nPACING ANCHORS (general rule of thumb - report card dates weren't provided, so pace major units to wrap up ${bits.join(', ')}, not mid-unit).`
        }
      }
    }

    let bcCurriculumContext = ''
    {
      const [inv2] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=subjects,grades,curriculum_model,skipped&limit=1`)
      const targetSubjects = (inv2 && !inv2.skipped && Array.isArray(inv2.subjects) && inv2.subjects.length)
        ? inv2.subjects
        : (subject ? [subject] : [])
      // Prefer the teacher's selected grade(s) from onboarding (supports
      // split/multi-grade classes) over the single grade field on this
      // specific plan's form, since a year plan should reflect every
      // grade the teacher actually teaches, not just whatever they typed
      // into one form field.
      const targetGrades = (inv2 && !inv2.skipped && Array.isArray(inv2.grades) && inv2.grades.length)
        ? inv2.grades
        : (grade ? [grade] : [])
      const focus = focusForModel(inv2?.curriculum_model)

      if (targetSubjects.length && targetGrades.length) {
        const sections = []
        for (const g of targetGrades) {
          for (const subj of targetSubjects) {
            const curr = await getCurriculum(subj, g)
            if (!curr) continue
            const focusText = focus === 'big_ideas' ? curr.bigIdeas : focus === 'competency' ? curr.curricularCompetency : curr.content
            if (focusText) {
              sections.push(`--- ${subj} (Grade ${g}) - ${focus.replace('_', ' ')} ---\n${focusText.slice(0, 6000)}`)
            }
          }
        }
        if (sections.length) {
          bcCurriculumContext = `\n\nOFFICIAL BC CURRICULUM (mandated learning standards from curriculum.gov.bc.ca - this is what must be covered, not optional background material; the section(s) shown below match this teacher's chosen curriculum approach, across every grade they teach):\n\n${sections.join('\n\n')}`
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
${steeringContext}${profileContext}${bcCurriculumContext}${pacingContext}

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









