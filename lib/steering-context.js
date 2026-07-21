// lib/steering-context.js
// Builds the formatted "BACKGROUND SOURCE MATERIAL" block from
// steering_documents, organized by category with each category's role
// explained. Extracted from app/api/generate/route.js so the same logic
// can be reused by /api/steering-documents/context (the cross-app
// endpoint any Chalk & Circuit product can call), not just this app's
// own generation route.
//
// FIXED 2026-07-21: this used to pull every row with no quality filter.
// 21 of 40 documents were failed web scrapes (YouTube channel "About"
// pages, JS-heavy sites) whose own AI-generated summary honestly said
// "no substantive content" -- but nothing checked that before insert,
// so the failure got fed into every real generation call as if it were
// reference material (math-mastery's remediation feature included).
// Root-caused in web-source/route.js (see its comments) and now filtered
// here too via is_valid, so any future bad row -- from this path or any
// other -- can't reach a generation prompt just because someone forgot
// to set the flag.
import { sbSelect } from './supabase'
import { STEERING_CATEGORIES, STEERING_CATEGORY_MAP } from './steering-categories'

export async function buildSteeringContext() {
  const docs = await sbSelect('steering_documents', `?is_valid=eq.true&select=title,author,category,full_text`)
  if (!docs.length) return ''

  // Full books (100+ pages) get a much larger per-document budget than a
  // flat cap so the author's actual approach comes through - a combined
  // ceiling across all docs still guards against blowing the prompt
  // budget when several are selected at once.
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

    sections.push(`### ${cat.label}\n(How to use this: ${cat.promptRole})\n\n${docTexts}`)
  }

  if (!sections.length) return ''

  return '\n\nBACKGROUND SOURCE MATERIAL — organized by role, ground your output in these ' +
    'and do not contradict them. Each category below is meant to inform a different part of the plan, ' +
    'as described under its heading:\n\n' + sections.join('\n\n')
}
