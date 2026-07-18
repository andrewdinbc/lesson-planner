// app/api/units/add-url-resource/route.js
// URL counterpart to upload-resource -- teacher pastes a link to something
// they like using instead of a PDF. Fetches the page, strips it down to
// readable text, and stores it in forge_resources the same way an upload
// would, so both paths feed the same edit/remix -> steering/TPT pipeline.
import { getCurrentUser } from '@/lib/session'
import { sbInsert } from '@/lib/supabase'

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { url, subject, unitName } = await request.json()
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 })

    let title = url
    let text = ''
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HyperionForge/1.0)' } })
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const html = await res.text()
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch) title = titleMatch[1].trim()
      text = stripHtml(html).slice(0, 20000)
    } catch (e) {
      return Response.json({ error: `Couldn't fetch that URL: ${e.message}` }, { status: 422 })
    }

    const [forgeRow] = await sbInsert('forge_resources', [{
      user_id: user.id, subject: subject || null, unit_name: unitName || null,
      source_type: 'url', title, source_url: url,
      original_text: text,
    }])

    return Response.json({
      resource: {
        type: 'teacher_upload',
        label: title,
        detail: text.slice(0, 500),
        source_url: url,
        uploaded_at: new Date().toISOString(),
        forge_resource_id: forgeRow.id,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
