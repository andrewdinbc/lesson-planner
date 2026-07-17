// app/api/draw-sessions/[id]/guess/route.js
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { scoreGuess, normalizeGuess, DRAWER_BONUS_PER_GUESSER } from '@/lib/draw-game'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const { playerId, text } = await request.json()
    if (!playerId || !text?.trim()) return Response.json({ error: 'playerId and text are required' }, { status: 400 })

    const [session] = await sbSelect('draw_sessions', `?id=eq.${id}&select=*&limit=1`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
    if (session.status !== 'drawing') return Response.json({ error: 'No active round' }, { status: 400 })
    if (playerId === session.current_drawer_id) return Response.json({ error: "The drawer can't guess" }, { status: 400 })

    // already guessed correctly this round -- no-op, don't let a duplicate
    // submit re-score or re-award
    const already = await sbSelect('draw_guesses', `?session_id=eq.${id}&round=eq.${session.current_round}&player_id=eq.${playerId}&correct=eq.true&select=id&limit=1`)
    if (already.length) return Response.json({ correct: true, alreadyGuessed: true })

    const correct = normalizeGuess(text) === normalizeGuess(session.current_word || '')
    const elapsedMs = session.round_started_at ? Date.now() - new Date(session.round_started_at).getTime() : 0
    const points = correct ? scoreGuess(elapsedMs) : 0

    await sbInsert('draw_guesses', [{
      session_id: id, round: session.current_round, player_id: playerId, guess_text: text.trim(), correct, points_awarded: points,
    }])

    if (correct) {
      const [player] = await sbSelect('draw_players', `?id=eq.${playerId}&select=score&limit=1`)
      await sbUpdate('draw_players', `?id=eq.${playerId}`, { score: (player?.score || 0) + points })

      const [drawer] = await sbSelect('draw_players', `?id=eq.${session.current_drawer_id}&select=score&limit=1`)
      if (drawer) await sbUpdate('draw_players', `?id=eq.${session.current_drawer_id}`, { score: (drawer.score || 0) + DRAWER_BONUS_PER_GUESSER })

      // if everyone (minus the drawer) has now guessed correctly, auto-reveal
      const allPlayers = await sbSelect('draw_players', `?session_id=eq.${id}&select=id`)
      const guessers = allPlayers.filter((p) => p.id !== session.current_drawer_id)
      const correctSoFar = await sbSelect('draw_guesses', `?session_id=eq.${id}&round=eq.${session.current_round}&correct=eq.true&select=player_id`)
      const uniqueCorrect = new Set(correctSoFar.map((g) => g.player_id))
      if (guessers.length > 0 && guessers.every((p) => uniqueCorrect.has(p.id))) {
        await sbUpdate('draw_sessions', `?id=eq.${id}`, { status: 'reveal' })
      }
    }

    return Response.json({ correct, points })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
