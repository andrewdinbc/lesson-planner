// lib/game-schema.js
// The canonical cross-app "Game Schema" (2026-07-18 request): a single
// source of truth describing every game type Chalk & Circuit products can
// inject, so any product -- Math Mastery, Assessment Tool, Student
// Portfolio, TeacherAssist -- can request a game the same documented way
// instead of each reimplementing quiz/wordle/racer/etc. logic itself.
// lesson-planner remains the one engine/host (this is where the actual
// game UIs and live-session infrastructure live); other products just
// call POST /api/games/create (see that route for the cross-app contract)
// and get back a URL to redirect a student/QR to.
//
// This mirrors the pattern already proven for steering documents
// (lib/steering-context.js + app/api/steering-documents/context/route.js):
// one shared secret (STEERING_SYNC_SECRET, reused here rather than adding
// a second ecosystem-wide secret to rotate/manage), one product hosts the
// capability, every product can call it.

export const GAME_CATEGORY = {
  SOLO: 'solo',           // one student, one device, plays independently
  LIVE_QUIZ: 'live_quiz',  // whole-class or 1v1, host screen + player devices, quiz content
  DRAW_GUESS: 'draw_guess', // whole-class, host screen + player devices, drawing content
}

/**
 * The full registry. `dataShape` is documentation (JSDoc-style comment
 * describing the game_data JSON), not a runtime validator -- kept simple
 * on purpose since every game type is currently generated server-side by
 * lesson-planner itself (lib/mini-games.js / lib/draw-game.js), not
 * supplied pre-built by the calling product. A calling product's job is
 * just: tell us gameType + subject/topic/grade, we generate and host it.
 */
export const GAME_TYPES = {
  quiz: {
    label: 'Quiz Game', category: GAME_CATEGORY.SOLO, inspiredBy: 'Blooket/Kahoot',
    dataShape: '{ questions: [{ question, choices: string[4], correctIndex }] }',
  },
  wordle: {
    label: 'Word Guess', category: GAME_CATEGORY.SOLO, inspiredBy: 'Wordle',
    dataShape: '{ word: string (4-7 letters), hint: string }',
  },
  math_racer: {
    label: 'Math Racer', category: GAME_CATEGORY.SOLO, inspiredBy: 'Drive Mad / Moto X3M',
    dataShape: '{ questions: [{ question, choices: number[4], correctIndex }], grade }',
  },
  muncher: {
    label: 'Muncher', category: GAME_CATEGORY.SOLO, inspiredBy: 'Slither.io / Agar.io',
    dataShape: '{ questions: [{ question, choices: string[4], correctIndex }] } (12 rounds)',
  },
  fact_dash: {
    label: 'Fact Dash', category: GAME_CATEGORY.SOLO, inspiredBy: 'Subway Surfers / Crossy Road',
    dataShape: '{ questions: [{ question, choices: string[3], correctIndex }] } (3-choice, 15 rounds)',
  },
  tycoon: {
    label: 'Trivia Tycoon', category: GAME_CATEGORY.SOLO, inspiredBy: 'Duck Duck Merge / Monkey Mart',
    dataShape: '{ questions: [{ question, choices: string[4], correctIndex }] } (10 rounds)',
  },
  merge: {
    label: 'Merge', category: GAME_CATEGORY.SOLO, inspiredBy: 'Duck Duck Merge (literal 2048)',
    dataShape: '{ questions: [{ question, choices: string[4], correctIndex }] } (8, periodic bonus triggers)',
  },
  live_quiz: {
    label: 'Live Event', category: GAME_CATEGORY.LIVE_QUIZ, inspiredBy: 'Kahoot',
    dataShape: 'same as quiz -- wrapped in a game_sessions row with host pacing + live leaderboard',
  },
  duel: {
    label: '1v1 Duel', category: GAME_CATEGORY.LIVE_QUIZ, inspiredBy: 'Kahoot 1v1',
    dataShape: 'same as quiz -- game_sessions row with is_duel=true, capped at 2 players, auto-starts',
  },
  draw_guess: {
    label: 'Draw & Guess', category: GAME_CATEGORY.DRAW_GUESS, inspiredBy: 'Skribbl.io',
    dataShape: '{ words: string[8] } stored on draw_sessions.words, one drawer rotates per round',
  },
}

export function isValidGameType(gameType) {
  return Object.prototype.hasOwnProperty.call(GAME_TYPES, gameType)
}

export function categoryFor(gameType) {
  return GAME_TYPES[gameType]?.category || null
}

/**
 * Generate a random bearer token for hosting a live/draw session when the
 * caller has no lesson-planner login to check against (a cross-app
 * request). Not a JWT -- just an opaque random string stored on the
 * session row and checked on every host-side request.
 */
export function generateHostToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
