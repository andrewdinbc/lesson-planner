// lib/bc-curriculum.js
// Fetches Big Ideas / Content / Curricular Competency for a given subject
// and grade directly from curriculum.gov.bc.ca (the official Ministry
// site), caching results in bc_curriculum_cache since this content
// changes rarely (BC revises curriculum on a multi-year cycle, not
// per-session). This is the actual authoritative source for what gets
// taught, separate from and complementary to steering documents (which
// are about HOW to teach, not WHAT is mandated).

import * as cheerio from 'cheerio'
import { sbSelect, sbInsert } from './supabase'

// Maps the subject names used in app/inventories/page.js (SUBJECT_OPTIONS)
// to the URL slug curriculum.gov.bc.ca uses. Not every BC subject is
// covered yet - only the ones currently offered as inventory options.
export const SUBJECT_SLUG_MAP = {
  'Language Arts': 'english-language-arts',
  'Mathematics': 'mathematics',
  'Science': 'science',
  'Social Studies': 'social-studies',
  'Physical Education': 'physical-health-education',
  'Art': 'arts-education',
  'Music': 'arts-education',
  // French uses a different URL pattern (curriculum/languages/{grade}/core-french)
  // than the simple {subject}/{grade}/core pattern every other subject follows.
  // Slug kept distinct from the map's other values so buildCoreUrl can special-case it.
  'French': 'core-french',
  'Health & Career Education': 'career-education',
  'Applied Design, Skills & Technologies': 'adst',
}

// Confirmed against curriculum.gov.bc.ca/curriculum/languages/5/core-french
// (2026-07-15): French core content lives under the "languages" subject
// bucket with "core-french" as the course slug, for grades 5-10. Grades
// 11-12 split into distinct courses (Core French 11/12, Core French
// Introductory 11) which - like other 10-12 courses - aren't wired into
// the K-9-first year-plan flow yet.
const FRENCH_SLUG = 'core-french'

// curriculum.gov.bc.ca uses "core" for K-9 and "courses" for 10-12, with
// grade 10-12 pages requiring a course name rather than a bare grade.
// This maps our simple K-9 grade inputs to that URL pattern; grades 10-12
// aren't wired yet since they need a specific course selected, not just
// a grade (out of scope for the year-plan flow today, which is K-9-first).
function buildCoreUrl(slug, grade) {
  const g = String(grade).trim().toUpperCase()
  if (slug === FRENCH_SLUG) {
    // French core content starts at Grade 5 (no K-4 Core French in BC's
    // curriculum) - callers should skip French for younger grades rather
    // than hitting a 404 here.
    return `https://curriculum.gov.bc.ca/curriculum/languages/${g}/core-french`
  }
  return `https://curriculum.gov.bc.ca/curriculum/${slug}/${g === 'K' ? 'k' : g}/core`
}

function parseSection($, headingText) {
  // The page repeats each H2 heading twice in the markup (a quirk of the
  // Drupal theme's responsive layout - one hidden on mobile, one on
  // desktop) followed by the real list content. We take the LAST
  // matching heading before the next different heading, since that's
  // consistently the one with real content following it in testing.
  const headings = $('h2').filter((i, el) => $(el).text().trim() === headingText)
  if (!headings.length) return ''
  const heading = headings.last()
  let text = ''
  let node = heading.next()
  let guard = 0
  while (node.length && guard < 200) {
    const tag = node.prop('tagName')
    if (tag === 'H2') break
    text += node.text().trim() + '\n'
    node = node.next()
    guard++
  }
  return text.trim()
}

async function fetchLive(slug, grade) {
  const url = buildCoreUrl(slug, grade)
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChalkCircuitLessonPlanner/1.0)' } })
  if (!res.ok) throw new Error(`BC curriculum fetch failed: ${res.status} for ${url}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  return {
    bigIdeas: parseSection($, 'Big Ideas'),
    content: parseSection($, 'Content'),
    curricularCompetency: parseSection($, 'Curricular Competency'),
    sourceUrl: url,
  }
}

/**
 * Get curriculum data for a subject/grade, using cache when fresh
 * (cached content doesn't expire on a timer - BC curriculum revisions
 * are rare and deliberate, not something to poll for).
 */
export async function getCurriculum(subjectName, grade) {
  const slug = SUBJECT_SLUG_MAP[subjectName]
  if (!slug) return null // subject not mapped yet (e.g. grades 10-12 course-based subjects)

  const g = String(grade).trim().toUpperCase()
  if (slug === FRENCH_SLUG && (g === 'K' || Number(g) < 5)) return null // no Core French below Grade 5
  const cached = await sbSelect('bc_curriculum_cache', `?subject_slug=eq.${slug}&grade=eq.${g}&select=*&limit=1`)
  if (cached.length) {
    return {
      bigIdeas: cached[0].big_ideas,
      content: cached[0].content,
      curricularCompetency: cached[0].curricular_competency,
      sourceUrl: cached[0].source_url,
    }
  }

  try {
    const fresh = await fetchLive(slug, g)
    await sbInsert('bc_curriculum_cache', [{
      subject_slug: slug,
      grade: g,
      big_ideas: fresh.bigIdeas,
      content: fresh.content,
      curricular_competency: fresh.curricularCompetency,
      source_url: fresh.sourceUrl,
    }])
    return fresh
  } catch (e) {
    console.error('BC curriculum fetch/parse failed:', e.message)
    return null // generation continues without it rather than failing the whole plan
  }
}

// Maps a curriculum_model key to which of the three BC curriculum
// elements should anchor generation, per Aj's three-group breakdown
// (2026-07-14): Big-Ideas-focused, Content-focused, or Curricular
// Competency-focused models.
export const MODEL_TO_FOCUS = {
  theme_integrated: 'big_ideas',
  inquiry_based: 'big_ideas',
  pbl: 'big_ideas',
  place_based: 'big_ideas',
  spiral: 'big_ideas',
  subject_centered: 'content',
  standards_based: 'content',
  competency_based: 'competency',
  mastery_progressions: 'competency',
}

export function focusForModel(modelKey) {
  return MODEL_TO_FOCUS[modelKey] || 'content' // default to Content if model unrecognized - the safest fallback since it's what's legally mandated regardless of teaching style
}
