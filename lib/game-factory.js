// lib/game-factory.js
// The actual creation logic behind every game type, extracted so it can
// be called from two places identically:
//   1. app/api/mini-games/route.js, app/api/game-sessions/route.js,
//      app/api/draw-sessions/route.js -- the in-app routes, gated by a
//      logged-in lesson-planner teacher (getCurrentUser()).
//   2. app/api/games/create/route.js -- the cross-app route, gated by
//      the shared STEERING_SYNC_SECRET header instead of a login, for
//      other Chalk & Circuit products.
// Both paths produce identical rows/content; they only differ in how the
// caller is authorized and what gets stored in user_id/source_app/host_token.
import Anthropic from '@anthropic-ai/sdk'
import { sbInsert } from './supabase'
import { buildQuizPrompt, buildWordlePrompt, buildQuestionSet, generateMathRacerQuestions } from './mini-games'
import { generateJoinCode } from './live-game'
import { generateWordList } from './draw-game'
import { generateHostToken } from './game-schema'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Create a solo game (quiz, wordle, math_racer, muncher, fact_dash,
 * tycoon, merge). Returns the inserted mini_games row.
 */
export async function createSoloGame({ gameType, subject, topic, grade, userId = null, sourceApp = 'lesson-planner' }) {
  let gameData
  if (gameType === 'quiz') {
    gameData = await buildQuizPrompt(anthropic, { subject, topic, grade })
  } else if (gameType === 'wordle') {
    gameData = await buildWordlePrompt(anthropic, { subject, topic, grade })
  } else if (gameType === 'muncher') {
    gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 12, numChoices: 4 })
  } else if (gameType === 'fact_dash') {
    gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 15, numChoices: 3 })
  } else if (gameType === 'tycoon') {
    gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 10, numChoices: 4 })
  } else if (gameType === 'merge') {
    gameData = await buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 8, numChoices: 4 })
  } else if (gameType === 'math_racer') {
    gameData = generateMathRacerQuestions(grade)
  } else {
    throw new Error(`Unknown solo gameType: ${gameType}`)
  }

  const [game] = await sbInsert('mini_games', [{
    user_id: userId, game_type: gameType, subject: subject || null, topic: topic || null, grade: grade || null,
    game_data: gameData, source_app: sourceApp,
  }])
  return game
}

/**
 * Create a live quiz session (Live Event or 1v1 Duel). Generates the
 * underlying quiz content first, then wraps it in a game_sessions row.
 * When userId is null (cross-app creation), a host_token is generated so
 * the calling product can host without a lesson-planner login.
 */
export async function createLiveQuizSession({ subject, topic, grade, isDuel = false, userId = null, sourceApp = 'lesson-planner' }) {
  const game = await createSoloGame({ gameType: 'quiz', subject, topic, grade, userId, sourceApp })

  const hostToken = userId ? null : generateHostToken()
  let session = null
  for (let attempt = 0; attempt < 4 && !session; attempt++) {
    try {
      const [inserted] = await sbInsert('game_sessions', [{
        user_id: userId, mini_game_id: game.id, join_code: generateJoinCode(), status: 'lobby', current_question_index: 0,
        is_duel: !!isDuel, source_app: sourceApp, host_token: hostToken,
      }])
      session = inserted
    } catch (e) {
      if (attempt === 3) throw e
    }
  }
  return { game, session, hostToken }
}

/**
 * Create a Draw & Guess session. Generates the curriculum word list, then
 * creates the draw_sessions row. Same host_token pattern as live quiz.
 */
export async function createDrawSession({ subject, topic, grade, userId = null, sourceApp = 'lesson-planner' }) {
  const words = await generateWordList(anthropic, { subject, topic, grade, count: 8 })
  if (!words.length) throw new Error('Could not generate a word list for this topic')

  const hostToken = userId ? null : generateHostToken()
  let session = null
  for (let attempt = 0; attempt < 4 && !session; attempt++) {
    try {
      const [inserted] = await sbInsert('draw_sessions', [{
        user_id: userId, join_code: generateJoinCode(), status: 'lobby',
        subject: subject || null, topic: topic || null, words, total_rounds: Math.min(6, words.length),
        source_app: sourceApp, host_token: hostToken,
      }])
      session = inserted
    } catch (e) {
      if (attempt === 3) throw e
    }
  }
  return { session, hostToken }
}
