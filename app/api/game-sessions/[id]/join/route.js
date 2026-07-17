// app/api/game-sessions/[id]/join/route.js
// Public, unauthenticated -- a student joins with just a nickname.
// Duel sessions cap at 2 players and auto-start the instant the second
// one joins -- no waiting on the host to hit Start, which is the whole
// point of a duel being a fast, spontaneous head-to-head rather than a
// full-class event with lobby ceremony.
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const { nickname } = await request.json()
    if (!nickname?.trim()) return Response.json({ error: 'nickname is required' }, { status: 400 })

    const [session] = await sbSelect('game_sessions', `?id=eq.${id}&select=*&limit=1`)
    if (!session) return Response.json({ error: 'Game not found' }, { status: 404 })
    if (session.status !== 'lobby') return Response.json({ error: 'This game has already started -- ask your teacher for a new code' }, { status: 400 })

    if (session.is_duel) {
      const existing = await sbSelect('game_players', `?session_id=eq.${id}&select=id`)
      if (existing.length >= 2) return Response.json({ error: 'This duel already has two players' }, { status: 400 })
    }

    const [player] = await sbInsert('game_players', [{ session_id: id, nickname: nickname.trim().slice(0, 24), score: 0 }])

    if (session.is_duel) {
      const allPlayers = await sbSelect('game_players', `?session_id=eq.${id}&select=id`)
      if (allPlayers.length === 2) {
        await sbUpdate('game_sessions', `?id=eq.${id}`, { status: 'active', current_question_index: 0, question_started_at: new Date().toISOString() })
      }
    }

    return Response.json({ player })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
