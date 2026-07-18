// app/api/style-profiles/push-to-steering/route.js
// Pushes a blended style_profiles entry into steering_documents, framed
// explicitly as a STYLE lens for generation -- "write in this genre/feel"
// -- never as content to reproduce. Live in every future AI generation
// call immediately via buildSteeringContext(), same as any other steering
// document.
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const [profile] = await sbSelect('style_profiles', `?id=eq.${id}&user_id=eq.${user.id}&select=*`)
    if (!profile) return Response.json({ error: 'Not found' }, { status: 404 })

    const fullText = `STYLE/GENRE PREFERENCE (not content to reproduce -- write ORIGINAL material in this style): ${profile.blended_style_text}`

    const [doc] = await sbInsert('steering_documents', [{
      user_id: user.id,
      title: `Style Profile: ${profile.name}`,
      full_text: fullText,
      category: 'actionable_resources',
      source_type: 'style_profile',
    }])

    await sbUpdate('style_profiles', `?id=eq.${id}&user_id=eq.${user.id}`, {
      pushed_to_steering_doc_id: doc.id, updated_at: new Date().toISOString(),
    })

    return Response.json({ ok: true, steering_doc_id: doc.id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
