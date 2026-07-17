// lib/mini-games.js
// Implements the QR-code engagement games from Aj's spec (2026-07-17):
// when a lesson isn't landing, generate a real playable game on the fly
// -- a Blooket-style multiple-choice quiz or a Wordle-style word-guess
// game, themed to the subject/topic -- and put it behind a QR code the
// teacher projects. Students scan it on their own devices; no login, no
// app install.
//
// Scope note: this is a genuine single-player game per student (score
// tracking, real gameplay), not a live multiplayer show with a shared
// leaderboard like actual Blooket/Kahoot -- that needs real-time
// infrastructure (websockets, host/player roles, live scoreboard sync)
// that's a materially bigger build. What's here is honest and complete
// for what it is: scan, play immediately, no setup.

export async function buildQuizPrompt(anthropic, { subject, topic, grade }) {
  const prompt = `Generate a 8-question multiple-choice quiz game (Blooket/Kahoot-style) for students${grade ? ` in Grade ${grade}` : ''} on the subject "${subject || 'general knowledge'}"${topic ? `, specifically about: ${topic}` : ''}. Questions should be genuinely engaging and age-appropriate -- mix easy warm-ups with a couple of harder ones, keep wording short and punchy (this is read on a phone screen, not a worksheet).

Return ONLY a JSON object, no other text, no markdown fences:
{"questions": [{"question": "string", "choices": ["string","string","string","string"], "correctIndex": 0}]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
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
