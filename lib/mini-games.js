// lib/mini-games.js
// Implements the QR-code engagement games from Aj's spec (2026-07-17,
// expanded 2026-07-18 with mechanics from a student-sourced list of
// favorite web games -- Xavier and Kashton's picks). Each mode reuses the
// same underlying multiple-choice question content (buildQuestionSet)
// behind a different play mechanic, matched to what made the reference
// game fun:
//   quiz        -- Blooket/Kahoot-style straight multiple choice
//   wordle      -- Wordle-style word guess
//   math_racer  -- racing (Drive Mad / Moto X3M's "beat the level" pull)
//   muncher     -- eat-the-right-answer growth loop (Slither.io / Agar.io's
//                  "bigger you are, more you can eat" satisfaction)
//   fact_dash   -- 3-lane endless runner, speeds up over time (Subway
//                  Surfers / Crossy Road's "how long can you last")
//
// Scope note: these are genuine single-player games per student (real
// gameplay, real scoring), not live multiplayer shows -- math_racer and
// quiz also have a live shared-event mode (lib/live-game.js) for a
// projected group event; muncher/fact_dash are solo-only for now.
// Consciously NOT built from the reference list: dress-up/customization
// games (no natural curricular hook without becoming a pure reward-unlock
// cosmetic system), real-time multiplayer drawing-and-guess games like
// Skribbl.io (needs the same live-session infrastructure as the quiz
// event, but with freehand canvas sync -- a bigger separate build),
// physics rage-platformers like Level Devil/Tunnel Rush (satisfying
// because of precise physics tuning, which doesn't map to curriculum
// content at all), and idle clickers like Cookie Clicker (the core loop
// is progress-while-not-engaging, which is the opposite of what a
// re-engagement tool needs -- flagged rather than built for that reason).

export async function buildQuizPrompt(anthropic, { subject, topic, grade }) {
  return buildQuestionSet(anthropic, { subject, topic, grade, numQuestions: 8, numChoices: 4 })
}

/**
 * Shared multiple-choice question generator behind Quiz, Muncher, and
 * Fact Dash -- each mode just wants a different shape of the same
 * underlying content (more/fewer questions, 3 vs 4 choices), not a
 * different generation approach.
 */
export async function buildQuestionSet(anthropic, { subject, topic, grade, numQuestions = 8, numChoices = 4 }) {
  const prompt = `Generate a ${numQuestions}-question multiple-choice quiz (Blooket/Kahoot-style) for students${grade ? ` in Grade ${grade}` : ''} on the subject "${subject || 'general knowledge'}"${topic ? `, specifically about: ${topic}` : ''}. Each question needs exactly ${numChoices} short answer choices. Questions should be genuinely engaging and age-appropriate -- mix easy warm-ups with a couple of harder ones, keep wording short and punchy (this is read on a phone screen mid-game, not a worksheet).

Return ONLY a JSON object, no other text, no markdown fences:
{"questions": [{"question": "string", "choices": [${Array(numChoices).fill('"string"').join(',')}], "correctIndex": 0}]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: Math.max(1200, numQuestions * 180),
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = message.content.find((b) => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function buildWordlePrompt(anthropic, { subject, topic, grade }) {
  const prompt = `Pick ONE single vocabulary word for a Wordle-style guessing game for students${grade ? ` in Grade ${grade}` : ''} on the subject "${subject || 'general knowledge'}"${topic ? `, specifically about: ${topic}` : ''}. The word must be 4-7 letters, a real English word (or a correctly-spelled proper curriculum term), all letters A-Z only, no spaces or hyphens -- it needs to work in a letter-by-letter guessing grid. Pick something a student would actually learn in this lesson, not a random unrelated word.

Return ONLY a JSON object, no other text, no markdown fences:
{"word": "UPPERCASE_WORD", "hint": "one short sentence hint relating it to the lesson, without giving away the word"}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = message.content.find((b) => b.type === 'text')?.text || '{}'
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  return { word: (parsed.word || '').toUpperCase().replace(/[^A-Z]/g, ''), hint: parsed.hint || '' }
}

/**
 * Wordle guess evaluation: for each letter in `guess`, returns 'correct'
 * (right letter, right spot), 'present' (right letter, wrong spot), or
 * 'absent'. Standard two-pass algorithm so repeated letters are scored
 * correctly (a letter only counts as "present" as many times as it
 * actually still appears in the remaining, unmatched part of the word).
 */
export function scoreWordleGuess(guess, target) {
  const result = new Array(guess.length).fill('absent')
  const targetLetters = target.split('')
  const used = new Array(target.length).fill(false)

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === targetLetters[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue
    const idx = targetLetters.findIndex((l, j) => l === guess[i] && !used[j])
    if (idx !== -1) {
      result[i] = 'present'
      used[idx] = true
    }
  }
  return result
}

/**
 * Math Racer question set -- generated procedurally (not an AI call) so
 * restarting a race is instant with zero latency, which matters for a
 * fast-paced racing game where the whole point is quick-fire answers.
 * Difficulty scales with grade: lower grades get addition/subtraction
 * with small numbers, upper grades add multiplication/division and
 * larger ranges. 20 questions is enough for a full race regardless of
 * how fast a given class answers.
 */
export function generateMathRacerQuestions(grade) {
  const g = parseInt(grade, 10) || 4
  const ops = g <= 2 ? ['+', '-']
    : g <= 4 ? ['+', '-', '×']
    : ['+', '-', '×', '÷']
  const maxNum = g <= 2 ? 10 : g <= 4 ? 20 : g <= 6 ? 100 : 200

  const questions = []
  for (let i = 0; i < 20; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)]
    let a = 1 + Math.floor(Math.random() * maxNum)
    let b = 1 + Math.floor(Math.random() * maxNum)
    let answer
    if (op === '+') answer = a + b
    else if (op === '-') { if (b > a) [a, b] = [b, a]; answer = a - b }
    else if (op === '×') { a = 1 + Math.floor(Math.random() * Math.min(12, maxNum)); b = 1 + Math.floor(Math.random() * 12); answer = a * b }
    else { b = 1 + Math.floor(Math.random() * 12); answer = 1 + Math.floor(Math.random() * 12); a = b * answer } // ÷ built from a clean multiplication so it always divides evenly

    // 3 plausible wrong choices near the real answer
    const wrongs = new Set()
    while (wrongs.size < 3) {
      const delta = (1 + Math.floor(Math.random() * 5)) * (Math.random() < 0.5 ? -1 : 1)
      const w = answer + delta
      if (w !== answer && w >= 0) wrongs.add(w)
    }
    const choices = shuffle([answer, ...wrongs])
    questions.push({ question: `${a} ${op} ${b}`, choices, correctIndex: choices.indexOf(answer) })
  }
  return { questions, grade: g }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

