// app/api/draw-sessions/[id]/route.js
import { getCurrentUser } from '@/lib/session'
import { sbSelect } from '@/lib/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') === 'host' ? 'host' : 'player'
    const playerId = searchParams.get('playerId') || null

    const [session] = await sbSelect('draw_sessions', `?id=eq.${id}&select=*&limit=1`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

    if (role === 'host') {
      const user = await getCurrentUser()
      if (!user || user.id !== session.user_id) return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const players = await sbSelect('draw_players', `?session_id=eq.${id}&select=*&order=score.desc`)
    const guessesThisRound = session.current_round
      ? await sbSelect('draw_guesses', `?session_id=eq.${id}&round=eq.${session.current_round}&select=*&order=created_at.asc`)
      : []

    const isDrawer = playerId && playerId === session.current_drawer_id
    const iAlreadyGuessed = playerId ? guessesThisRound.some((g) => g.player_id === playerId && g.correct) : false

    const revealed = session.status === 'reveal' || session.status === 'finished'
    const shared = {
      status: session.status,
      currentRound: session.current_round,
      totalRounds: session.total_rounds,
      roundStartedAt: session.round_started_at,
      roundDurationSeconds: session.round_duration_seconds,
      canvasData: session.canvas_data,
      currentDrawerId: session.current_drawer_id,
      players,
      correctGuesserIds: guessesThisRound.filter((g) => g.correct).map((g) => g.player_id),
      joinCode: session.join_code,
    }

    if (role === 'host') {
      return Response.json({
        session: {
          ...shared,
          currentWord: session.current_word,
          guesses: guessesThisRound,
        },
      })
    }

    return Response.json({
      session: {
        ...shared,
        currentWord: (isDrawer || revealed) ? session.current_word : null,
        isDrawer,
        iAlreadyGuessed,
        myGuesses: playerId ? guessesThisRound.filter((g) => g.player_id === playerId) : [],
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
