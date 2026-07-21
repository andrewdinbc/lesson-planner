import Anthropic from '@anthropic-ai/sdk'
import { sbInsert } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { DEFAULT_CATEGORY } from '@/lib/steering-categories'
import { checkLink } from '@/lib/link-check'
import { isLikelyFailedWebScrape, extractScrapeFailureReason } from '@/lib/content-extraction-guard'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// "Point the AI at a website" steering source, alongside upload-a-PDF and
// paste-text. Doesn't scrape and store the site verbatim (copyright, and
// sites change) - fetches it once at add-time and has Claude produce a
// genuine, substantial paraphrased synthesis of the concrete strategies/
// frameworks present, with clear source attribution. Re-fetchable later
// via the same endpoint if the teacher wants a refresh.
const ADMIN_EMAIL = 'andrewsinbc3@gmail.com'
const ADMIN_USER_ID = '7844844f-f54f-43c1-ae44-94ec37e97778'

async function requireAdmin(request) {
  const syncSecret = request.headers.get('x-steering-sync-secret')
  if (syncSecret && process.env.STEERING_SYNC_SECRET && syncSecret === process.env.STEERING_SYNC_SECRET) {
    return { id: ADMIN_USER_ID, email: ADMIN_EMAIL }
  }
  const user = await getCurrentUser()
  if (user && user.email === ADMIN_EMAIL) return user
  return null
}

export async function POST(request) {
  const user = await requireAdmin(request)
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { url, title, category, subject } = await request.json()
    if (!url) return Response.json({ error: 'url required' }, { status: 400 })

    // Real link check before doing anything else -- reject broken links
    // outright rather than silently adding a dead source. This is a
    // separate, purpose-built check (see lib/link-check.js) from the
    // scrape-for-content fetch below, so a broken link fails fast with a
    // clear reason instead of surfacing as a confusing scrape error.
    const linkCheck = await checkLink(url)
    if (!linkCheck.ok) {
      return Response.json({
        error: `Link check failed (${linkCheck.error}) -- this URL doesn't appear to be working. Double-check it and try again.`,
        linkCheck,
      }, { status: 422 })
    }

    let pageText
    try {
      const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const html = await pageRes.text()
      pageText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000)
    } catch (e) {
      return Response.json({ error: `Could not reach ${url}: ${e.message}` }, { status: 400 })
    }

    // FIXED 2026-07-21: checkLink above only confirms the URL responds,
    // not that a plain HTTP fetch can actually read its content -- most
    // JS-rendered sites (YouTube channel pages, SPAs) return 200 with a
    // near-empty page shell, no real content until client-side JS runs.
    // 21 of 40 real steering documents turned out to be exactly this
    // failure mode, saved anyway because nothing checked before insert.
    // Two checks now, matching the standard upload-from-url/route.js
    // already holds PDF uploads to (<50 chars extracted = reject):
    if (isLikelyFailedWebScrape(pageText)) {
      return Response.json({
        error: `This page returned almost no readable text (${pageText.length} characters) -- it's likely JavaScript-rendered (common for YouTube channel pages and single-page apps) and can't be scraped this way. Try a direct article or transcript URL instead of a channel/home page.`,
      }, { status: 422 })
    }

    const prompt = `You are building a reference summary for a teacher's lesson-planning tool. Below is raw
extracted text from a webpage. Write a substantial, well-organized summary (in your own words,
not quoted) of the concrete teaching strategies, frameworks, or resources described - this will be
used to ground lesson generation in real best practices from this source. Focus on anything
actionable a teacher could apply directly. Include the names of specific named strategies/
techniques if the page describes them, since those names are useful to reference. Do not
reproduce large blocks of the original wording - paraphrase and synthesize.

If the raw page text below does NOT contain enough real, substantive content to write a genuine
summary -- e.g. it's mostly navigation/legal boilerplate, a "JavaScript required" or login/paywall
message, or an error page -- do not attempt to write a summary or describe what the site is
"known for" from general knowledge. Instead respond with EXACTLY this and nothing else:
SCRAPE_INSUFFICIENT: <one sentence explaining what the raw text actually contained>

URL: ${url}

Raw page text:
${pageText}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = response.content.find((b) => b.type === 'text')?.text || ''

    const scrapeFailureReason = extractScrapeFailureReason(summary)
    if (scrapeFailureReason) {
      return Response.json({
        error: `Couldn't extract usable content from this page: ${scrapeFailureReason}`,
      }, { status: 422 })
    }

    const fullText = `Source: ${url}\n\n${summary}`

    const [doc] = await sbInsert('steering_documents', [{
      user_id: user.id,
      title: title || url,
      full_text: fullText,
      category: category || DEFAULT_CATEGORY,
      author: null,
      char_count: fullText.length,
      source_url: url,
      source_type: 'web',
      subject: subject || null,
      link_status: 'ok',
      http_status_code: linkCheck.statusCode,
      last_checked_at: new Date().toISOString(),
      is_valid: true,
    }])

    return Response.json({ document: { id: doc.id, title: doc.title, category: doc.category, subject: doc.subject, source_url: url, created_at: doc.created_at, linkCheck } })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}



