// app/api/game-sessions/[id]/join/route.js
// Public, unauthenticated -- a student joins with just a nickname.
import { sbSelect, sbInsert } from '@/lib/supabase'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const { nickname } = await request.json()
    if (!nickname?.trim()) return Response.json({ error: 'nickname is required' }, { status: 400 })

    const [session] = await sbSelect('game_sessions', `?id=eq.${id}&select=id,status&limit=1`)
    if (!session) return Response.json({ error: 'Game not found' }, { status: 404 })
    if (session.status !== 'lobby') return Response.json({ error: 'This game has already started -- ask your teacher for a new code' }, { status: 400 })

    const [player] = await sbInsert('game_players', [{ session_id: id, nickname: nickname.trim().slice(0, 24), score: 0 }])
    return Response.json({ player })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
