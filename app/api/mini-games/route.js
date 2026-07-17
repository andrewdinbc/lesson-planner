// app/api/mini-games/route.js
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbInsert } from '@/lib/supabase'
import { buildQuizPrompt, buildWordlePrompt } from '@/lib/mini-games'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { gameType, subject, topic, grade } = await request.json()
    if (gameType !== 'quiz' && gameType !== 'wordle') {
      return Response.json({ error: 'gameType must be quiz or wordle' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const gameData = gameType === 'quiz'
      ? await buildQuizPrompt(anthropic, { subject, topic, grade })
      : await buildWordlePrompt(anthropic, { subject, topic, grade })

    const [game] = await sbInsert('mini_games', [{
      user_id: user.id, game_type: gameType, subject: subject || null, topic: topic || null, grade: grade || null, game_data: gameData,
    }])

    return Response.json({ game })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
