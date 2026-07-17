// app/api/draw-sessions/[id]/stroke/route.js
// Only the current drawer should call this in practice (enforced loosely
// client-side by only showing drawing tools to the drawer); a stray call
// from someone else just adds an extra stroke, which is a minor nuisance
// not a security issue since there's nothing sensitive in a sketch.
import { sbSelect, sbUpdate } from '@/lib/supabase'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const { stroke, clear } = await request.json()

    const [session] = await sbSelect('draw_sessions', `?id=eq.${id}&select=canvas_data&limit=1`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

    const nextCanvas = clear ? [] : [...(session.canvas_data || []), stroke]
    await sbUpdate('draw_sessions', `?id=eq.${id}`, { canvas_data: nextCanvas })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
