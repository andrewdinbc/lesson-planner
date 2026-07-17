// app/api/mini-games/route.js
import { getCurrentUser } from '@/lib/session'
import { isValidGameType, categoryFor, GAME_CATEGORY } from '@/lib/game-schema'
import { createSoloGame } from '@/lib/game-factory'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { gameType, subject, topic, grade } = await request.json()
    if (!isValidGameType(gameType) || categoryFor(gameType) !== GAME_CATEGORY.SOLO) {
      return Response.json({ error: 'gameType must be a solo game type -- see lib/game-schema.js' }, { status: 400 })
    }

    const game = await createSoloGame({ gameType, subject, topic, grade, userId: user.id, sourceApp: 'lesson-planner' })
    return Response.json({ game })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
