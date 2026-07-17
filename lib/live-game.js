// lib/live-game.js
// Implements the shared live quiz event (Kahoot/Blooket-style) from Aj's
// spec (2026-07-17): host projects a join code/QR, students join on their
// own devices with a nickname, everyone answers the SAME question at the
// SAME time, the host controls pacing (reveal → next), and a live
// leaderboard updates as scores come in. Built on polling (2s interval on
// the client) rather than websockets -- this codebase's existing pattern
// is direct REST over Supabase (see lib/supabase.js's header comment
// about avoiding the SDK), and a 2s poll is imperceptible for a
// classroom-paced quiz. If this ever needs true sub-second sync, Supabase
// Realtime is the natural upgrade path, but polling is simpler and
// robust for what a live classroom quiz actually needs.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I -- easy to read off a projector

export function generateJoinCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

// Time-based scoring, Kahoot-style: faster correct answers score more.
// Question is assumed to have a soft 20s answer window for scoring
// purposes (not a hard cutoff -- a late answer still counts, it just
// scores near the floor). Correct = 200-1000 points on a sliding scale;
// wrong = 0.
const SCORE_WINDOW_MS = 20000
const MAX_POINTS = 1000
const MIN_POINTS = 200

export function scoreAnswer(correct, elapsedMs) {
  if (!correct) return 0
  const clamped = Math.min(Math.max(elapsedMs, 0), SCORE_WINDOW_MS)
  const fraction = 1 - clamped / SCORE_WINDOW_MS
  return Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * fraction)
}

/**
 * Shape a session + its quiz questions for a PLAYER's poll response --
 * never includes correctIndex for the current question unless the
 * session has moved to 'question_reveal' or 'finished', so a curious
 * student can't peek at devtools and see the answer early.
 */
export function shapeForPlayer(session, questions) {
  const q = questions[session.current_question_index]
  const revealed = session.status === 'question_reveal' || session.status === 'finished'
  return {
    status: session.status,
    currentQuestionIndex: session.current_question_index,
    totalQuestions: questions.length,
    question: q ? {
      question: q.question,
      choices: q.choices,
      ...(revealed ? { correctIndex: q.correctIndex } : {}),
    } : null,
    questionStartedAt: session.question_started_at,
  }
}

/**
 * Shape for the HOST's poll response -- includes the correct answer
 * always (host needs it to narrate/confirm), plus live counts.
 */
export function shapeForHost(session, questions, players, answersThisQuestion) {
  const q = questions[session.current_question_index]
  return {
    status: session.status,
    currentQuestionIndex: session.current_question_index,
    totalQuestions: questions.length,
    question: q || null,
    playerCount: players.length,
    answeredCount: answersThisQuestion.length,
    leaderboard: [...players].sort((a, b) => b.score - a.score),
  }
}
