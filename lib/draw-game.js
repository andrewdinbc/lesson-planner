// lib/draw-game.js
// Implements the Skribbl.io-style shared live drawing-and-guess event
// (2026-07-18 request) -- one player draws a curriculum term on their own
// device, everyone else sees it mirrored live and races to type the
// guess. Built on the same polling architecture as lib/live-game.js (the
// quiz live event), just polled faster on the drawing round (every ~800ms
// instead of 2s) since stroke sync needs to feel closer to real-time than
// a quiz question does. Canvas data is stored as a flat array of stroke
// paths on the session row itself and fully redrawn from that array on
// each poll -- simple and correct for a short curriculum-word sketch,
// even if it's not as bandwidth-efficient as true incremental deltas.

export async function generateWordList(anthropic, { subject, topic, grade, count = 8 }) {
  const prompt = `Generate a list of ${count} single curriculum vocabulary terms or short 2-word phrases for a Pictionary/Skribbl-style drawing game, for students${grade ? ` in Grade ${grade}` : ''} on the subject "${subject || 'general knowledge'}"${topic ? `, specifically about: ${topic}` : ''}. Each term must be something a student could actually attempt to DRAW (a concrete noun, process, or object -- not an abstract concept that can't be sketched). Keep each term short (1-3 words).

Return ONLY a JSON object, no other text, no markdown fences:
{"words": ["string", "string", ...]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = message.content.find((b) => b.type === 'text')?.text || '{}'
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  return parsed.words || []
}

// Same speed-scoring shape as lib/live-game.js's quiz scoring, but a
// longer window since drawing+guessing naturally takes longer than
// reading a multiple-choice question.
const GUESS_WINDOW_MS = 60000
const MAX_POINTS = 500
const MIN_POINTS = 100

export function scoreGuess(elapsedMs) {
  const clamped = Math.min(Math.max(elapsedMs, 0), GUESS_WINDOW_MS)
  const fraction = 1 - clamped / GUESS_WINDOW_MS
  return Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * fraction)
}

// Small flat bonus to the drawer per correct guesser -- rewards drawing
// clearly, same spirit as the reference game.
export const DRAWER_BONUS_PER_GUESSER = 50

/**
 * Normalize a guess for comparison: lowercase, trim, collapse whitespace,
 * strip punctuation. Forgiving on purpose -- "a dinosaur" should match
 * "dinosaur", trailing periods/exclamation points shouldn't matter.
 */
export function normalizeGuess(text) {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
}

/**
 * Pick the drawer for a given round from the joined player list, rotating
 * through join order. Simple and fair enough for a classroom-sized game
 * -- doesn't try to avoid repeats across a full session beyond the
 * natural round-robin, which is fine since round count is usually <=
 * player count anyway.
 */
export function drawerForRound(players, round) {
  if (!players.length) return null
  const sorted = [...players].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  return sorted[(round - 1) % sorted.length]
}
