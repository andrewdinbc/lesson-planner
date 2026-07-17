// app/api/game-sessions/[id]/route.js
// Polled every ~2s by both the host screen and every player's device.
// ?role=host requires the requester to actually own the session (checked
// via auth) and returns the correct answer + live counts; the default
// player view never leaks the correct answer until the question is
// revealed.
import { getCurrentUser } from '@/lib/session'
import { sbSelect } from '@/lib/supabase'
import { shapeForPlayer, shapeForHost } from '@/lib/live-game'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') === 'host' ? 'host' : 'player'

    const [session] = await sbSelect('game_sessions', `?id=eq.${id}&select=*&limit=1`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

    if (role === 'host') {
      const user = await getCurrentUser()
      if (!user || user.id !== session.user_id) return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const [game] = await sbSelect('mini_games', `?id=eq.${session.mini_game_id}&select=game_data&limit=1`)
    const questions = game?.game_data?.questions || []

    if (role === 'player') {
      return Response.json({ session: shapeForPlayer(session, questions), joinCode: session.join_code })
    }

    const players = await sbSelect('game_players', `?session_id=eq.${id}&select=*&order=score.desc`)
    const answersThisQuestion = await sbSelect('game_answers', `?session_id=eq.${id}&question_index=eq.${session.current_question_index}&select=id`)

    return Response.json({ session: shapeForHost(session, questions, players, answersThisQuestion), joinCode: session.join_code })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
