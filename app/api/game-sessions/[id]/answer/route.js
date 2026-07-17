// app/api/game-sessions/[id]/answer/route.js
// Public, unauthenticated -- called by a player's device. One answer per
// player per question (enforced by the DB unique constraint on
// (player_id, question_index) -- a duplicate submit is just ignored,
// returning the already-recorded result rather than erroring, since a
// flaky mobile connection double-tapping submit shouldn't confuse a kid).
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { scoreAnswer } from '@/lib/live-game'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const { playerId, questionIndex, choiceIndex } = await request.json()
    if (!playerId || questionIndex === undefined || choiceIndex === undefined) {
      return Response.json({ error: 'playerId, questionIndex, choiceIndex are required' }, { status: 400 })
    }

    const existing = await sbSelect('game_answers', `?player_id=eq.${playerId}&question_index=eq.${questionIndex}&select=*&limit=1`)
    if (existing.length) return Response.json({ answer: existing[0], alreadyAnswered: true })

    const [session] = await sbSelect('game_sessions', `?id=eq.${id}&select=current_question_index,question_started_at,mini_game_id&limit=1`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
    if (session.current_question_index !== questionIndex) {
      return Response.json({ error: 'The question has already moved on' }, { status: 400 })
    }

    const [game] = await sbSelect('mini_games', `?id=eq.${session.mini_game_id}&select=game_data&limit=1`)
    const q = game?.game_data?.questions?.[questionIndex]
    if (!q) return Response.json({ error: 'Question not found' }, { status: 404 })

    const correct = choiceIndex === q.correctIndex
    const elapsedMs = session.question_started_at ? Date.now() - new Date(session.question_started_at).getTime() : 0
    const points = scoreAnswer(correct, elapsedMs)

    const [answer] = await sbInsert('game_answers', [{
      session_id: id, player_id: playerId, question_index: questionIndex, choice_index: choiceIndex, correct, points_awarded: points,
    }])

    if (points > 0) {
      const [player] = await sbSelect('game_players', `?id=eq.${playerId}&select=score&limit=1`)
      const newScore = (player?.score || 0) + points
      await sbUpdate('game_players', `?id=eq.${playerId}`, { score: newScore })
    }

    return Response.json({ answer, correct, points })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
