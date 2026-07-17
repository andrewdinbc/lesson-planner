// app/api/game-sessions/[id]/control/route.js
// Host-only pacing controls, all requiring session ownership.
// action: 'start' (lobby -> active, question 0, timer starts)
//         'reveal' (active -> question_reveal, shows correct answer)
//         'next' (question_reveal -> active on the next question, timer
//                  restarts; or -> finished if that was the last question)
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbUpdate } from '@/lib/supabase'

export async function POST(request, { params }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { id } = await params
    const { action } = await request.json()

    const [session] = await sbSelect('game_sessions', `?id=eq.${id}&select=*&limit=1`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
    if (session.user_id !== user.id) return Response.json({ error: 'Not authorized' }, { status: 403 })

    let patch
    if (action === 'start') {
      if (session.status !== 'lobby') return Response.json({ error: 'Game already started' }, { status: 400 })
      patch = { status: 'active', current_question_index: 0, question_started_at: new Date().toISOString() }
    } else if (action === 'reveal') {
      if (session.status !== 'active') return Response.json({ error: 'Not in an active question' }, { status: 400 })
      patch = { status: 'question_reveal' }
    } else if (action === 'next') {
      if (session.status !== 'question_reveal') return Response.json({ error: 'Reveal the current answer first' }, { status: 400 })
      const [game] = await sbSelect('mini_games', `?id=eq.${session.mini_game_id}&select=game_data&limit=1`)
      const total = game?.game_data?.questions?.length || 0
      const nextIndex = session.current_question_index + 1
      patch = nextIndex >= total
        ? { status: 'finished' }
        : { status: 'active', current_question_index: nextIndex, question_started_at: new Date().toISOString() }
    } else {
      return Response.json({ error: 'action must be start, reveal, or next' }, { status: 400 })
    }

    const [updated] = await sbUpdate('game_sessions', `?id=eq.${id}`, patch)
    return Response.json({ session: updated })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
