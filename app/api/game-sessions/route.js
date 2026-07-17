// app/api/game-sessions/route.js
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbInsert } from '@/lib/supabase'
import { generateJoinCode } from '@/lib/live-game'

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { miniGameId } = await request.json()
    if (!miniGameId) return Response.json({ error: 'miniGameId is required' }, { status: 400 })

    const [game] = await sbSelect('mini_games', `?id=eq.${miniGameId}&select=id,game_type&limit=1`)
    if (!game) return Response.json({ error: 'Quiz not found' }, { status: 404 })
    if (game.game_type !== 'quiz') return Response.json({ error: 'Live sessions are only supported for quiz games' }, { status: 400 })

    // Retry a couple times on the rare join-code collision (unique constraint)
    let session = null
    for (let attempt = 0; attempt < 4 && !session; attempt++) {
      try {
        const [inserted] = await sbInsert('game_sessions', [{
          user_id: user.id, mini_game_id: miniGameId, join_code: generateJoinCode(), status: 'lobby', current_question_index: 0,
        }])
        session = inserted
      } catch (e) {
        if (attempt === 3) throw e
      }
    }

    return Response.json({ session })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
