// app/api/games/create/route.js
// The cross-app contract from Aj's "Game Schema" request (2026-07-18):
// any Chalk & Circuit product -- Math Mastery, Assessment Tool, Student
// Portfolio, TeacherAssist -- can request a game without needing a
// lesson-planner login, the same way products already pull steering
// documents via app/api/steering-documents/context/route.js. Reuses that
// same shared secret (STEERING_SYNC_SECRET) rather than adding a second
// ecosystem-wide secret to manage.
//
// Usage from another product's server-side route:
//   const res = await fetch('https://lesson-planner-liart.vercel.app/api/games/create', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', 'x-game-sync-secret': process.env.STEERING_SYNC_SECRET },
//     body: JSON.stringify({ gameType: 'quiz', subject: 'Fractions', topic: 'equivalent fractions', grade: '5', sourceApp: 'math-mastery' }),
//   })
//   const data = await res.json()
//   // data.kind === 'solo'  -> { gameId, playUrl }                          -- redirect a single student / show one QR
//   // data.kind === 'live'  -> { sessionId, hostUrl, joinUrl, joinCode }    -- project hostUrl, QR the joinUrl
//   // data.kind === 'draw'  -> { sessionId, hostUrl, joinUrl, joinCode }    -- same, for Draw & Guess
//
// See lib/game-schema.js for the full GAME_TYPES registry (what gameType
// values are valid and what each one's content looks like).
import { isValidGameType, categoryFor, GAME_CATEGORY } from '@/lib/game-schema'
import { createSoloGame, createLiveQuizSession, createDrawSession } from '@/lib/game-factory'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const syncSecret = request.headers.get('x-game-sync-secret')
  if (!syncSecret || !process.env.STEERING_SYNC_SECRET || syncSecret !== process.env.STEERING_SYNC_SECRET) {
    return Response.json({ error: 'Not authorized' }, { status: 401 })
  }

  try {
    const { gameType, subject, topic, grade, sourceApp } = await request.json()
    if (!isValidGameType(gameType)) {
      return Response.json({ error: `Unknown gameType "${gameType}" -- see lib/game-schema.js GAME_TYPES for valid values` }, { status: 400 })
    }
    if (!sourceApp) {
      return Response.json({ error: 'sourceApp is required (e.g. "math-mastery", "assessment-tool") -- used for attribution/analytics' }, { status: 400 })
    }

    const origin = new URL(request.url).origin
    const category = categoryFor(gameType)

    if (category === GAME_CATEGORY.SOLO) {
      const game = await createSoloGame({ gameType, subject, topic, grade, userId: null, sourceApp })
      return Response.json({ kind: 'solo', gameId: game.id, playUrl: `${origin}/play/${game.id}` })
    }

    if (category === GAME_CATEGORY.LIVE_QUIZ) {
      const { session, hostToken } = await createLiveQuizSession({
        subject, topic, grade, isDuel: gameType === 'duel', userId: null, sourceApp,
      })
      return Response.json({
        kind: 'live', sessionId: session.id, joinCode: session.join_code,
        hostUrl: `${origin}/host/${session.id}?hostToken=${hostToken}`,
        joinUrl: `${origin}/join/${session.join_code}`,
      })
    }

    if (category === GAME_CATEGORY.DRAW_GUESS) {
      const { session, hostToken } = await createDrawSession({ subject, topic, grade, userId: null, sourceApp })
      return Response.json({
        kind: 'draw', sessionId: session.id, joinCode: session.join_code,
        hostUrl: `${origin}/host-draw/${session.id}?hostToken=${hostToken}`,
        joinUrl: `${origin}/draw/${session.join_code}`,
      })
    }

    return Response.json({ error: 'Unhandled game category' }, { status: 500 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
