// app/api/mini-games/route.js
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbInsert } from '@/lib/supabase'
import { buildQuizPrompt, buildWordlePrompt, generateMathRacerQuestions } from '@/lib/mini-games'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { gameType, subject, topic, grade } = await request.json()
    if (!['quiz', 'wordle', 'math_racer'].includes(gameType)) {
      return Response.json({ error: 'gameType must be quiz, wordle, or math_racer' }, { status: 400 })
    }

    let gameData
    if (gameType === 'quiz') {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      gameData = await buildQuizPrompt(anthropic, { subject, topic, grade })
    } else if (gameType === 'wordle') {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      gameData = await buildWordlePrompt(anthropic, { subject, topic, grade })
    } else {
      // math_racer is procedural, not an AI call -- instant, zero latency,
      // which matters for a fast-paced racing game teachers want to fire
      // up mid-class without a wait.
      gameData = generateMathRacerQuestions(grade)
    }

    const [game] = await sbInsert('mini_games', [{
      user_id: user.id, game_type: gameType, subject: subject || null, topic: topic || null, grade: grade || null, game_data: gameData,
    }])

    return Response.json({ game })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
