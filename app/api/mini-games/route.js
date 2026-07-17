// app/api/mini-games/route.js
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbInsert } from '@/lib/supabase'
import { buildQuizPrompt, buildWordlePrompt, buildQuestionSet, generateMathRacerQuestions } from '@/lib/mini-games'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_TYPES = ['quiz', 'wordle', 'math_racer', 'muncher', 'fact_dash', 'tycoon', 'merge']

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { gameType, subject, topic, grade } = await request.json()
    if (!VALID_TYPES.includes(gameType)) {
      return Response.json({ error: `gameType must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    let gameData
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    if (gameType === 'quiz') {
      gameData = await buildQuizPrompt(anthropic, { subject, topic, grade })
    } else if (gameType === 'wordle') {
      gameData = await buildWordlePrompt(anthropic, { subject, topic, grade })
    } else if (gameType === 'muncher') {
      // more, shorter questions -- munching is a fast continuous loop, not
      // a stop-and-read-carefully format
      gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 12, numChoices: 4 })
    } else if (gameType === 'fact_dash') {
      // exactly 3 choices to map onto 3 runner lanes; more questions since
      // an endless runner burns through them fast as speed increases
      gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 15, numChoices: 3 })
    } else if (gameType === 'tycoon') {
      gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 10, numChoices: 4 })
    } else if (gameType === 'merge') {
      // fewer questions -- these are periodic bonus triggers during a
      // merge session, not read back-to-back like a quiz
      gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 8, numChoices: 4 })
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
