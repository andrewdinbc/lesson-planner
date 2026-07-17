// app/api/draw-sessions/[id]/control/route.js
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbUpdate } from '@/lib/supabase'
import { drawerForRound } from '@/lib/draw-game'

export async function POST(request, { params }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await params
    const { action } = await request.json()

    const [session] = await sbSelect('draw_sessions', `?id=eq.${id}&select=*&limit=1`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
    if (session.user_id !== user.id) return Response.json({ error: 'Not authorized' }, { status: 403 })

    let patch

    if (action === 'start') {
      if (session.status !== 'lobby') return Response.json({ error: 'Already started' }, { status: 400 })
      const players = await sbSelect('draw_players', `?session_id=eq.${id}&select=*`)
      if (players.length < 2) return Response.json({ error: 'Need at least 2 players (one draws, one guesses)' }, { status: 400 })
      const drawer = drawerForRound(players, 1)
      patch = {
        status: 'drawing', current_round: 1, current_word: session.words[0],
        current_drawer_id: drawer.id, round_started_at: new Date().toISOString(), canvas_data: [],
      }
    } else if (action === 'reveal') {
      if (session.status !== 'drawing') return Response.json({ error: 'No active round' }, { status: 400 })
      patch = { status: 'reveal' }
    } else if (action === 'next') {
      if (session.status !== 'reveal') return Response.json({ error: 'Reveal the current word first' }, { status: 400 })
      const nextRound = session.current_round + 1
      if (nextRound > session.total_rounds) {
        patch = { status: 'finished' }
      } else {
        const players = await sbSelect('draw_players', `?session_id=eq.${id}&select=*`)
        const drawer = drawerForRound(players, nextRound)
        patch = {
          status: 'drawing', current_round: nextRound, current_word: session.words[nextRound - 1],
          current_drawer_id: drawer.id, round_started_at: new Date().toISOString(), canvas_data: [],
        }
      }
    } else {
      return Response.json({ error: 'action must be start, reveal, or next' }, { status: 400 })
    }

    const [updated] = await sbUpdate('draw_sessions', `?id=eq.${id}`, patch)
    return Response.json({ session: updated })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
