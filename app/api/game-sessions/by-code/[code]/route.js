// app/api/game-sessions/by-code/[code]/route.js
import { sbSelect } from '@/lib/supabase'

export async function GET(request, { params }) {
  try {
    const { code } = await params
    const [session] = await sbSelect('game_sessions', `?join_code=eq.${code.toUpperCase()}&select=id,status&limit=1`)
    if (!session) return Response.json({ error: 'No game found with that code' }, { status: 404 })
    return Response.json({ session })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
