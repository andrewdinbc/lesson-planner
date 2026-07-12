import Anthropic from '@anthropic-ai/sdk'
import { sbInsert } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { DEFAULT_CATEGORY } from '@/lib/steering-categories'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// "Point the AI at a website" steering source, alongside upload-a-PDF and
// paste-text. Doesn't scrape and store the site verbatim (copyright, and
// sites change) - fetches it once at add-time and has Claude produce a
// genuine, substantial paraphrased synthesis of the concrete strategies/
// frameworks present, with clear source attribution. Re-fetchable later
// via the same endpoint if the teacher wants a refresh.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { url, title, category } = await request.json()
    if (!url) return Response.json({ error: 'url required' }, { status: 400 })

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

    const prompt = `You are building a reference summary for a teacher's lesson-planning tool. Below is raw
extracted text from a webpage. Write a substantial, well-organized summary (in your own words,
not quoted) of the concrete teaching strategies, frameworks, or resources described - this will be
used to ground lesson generation in real best practices from this source. Focus on anything
actionable a teacher could apply directly. Include the names of specific named strategies/
techniques if the page describes them, since those names are useful to reference. Do not
reproduce large blocks of the original wording - paraphrase and synthesize.

URL: ${url}

Raw page text:
${pageText}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = response.content.find((b) => b.type === 'text')?.text || ''
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
    }])

    return Response.json({ document: { id: doc.id, title: doc.title, category: doc.category, source_url: url, created_at: doc.created_at } })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
