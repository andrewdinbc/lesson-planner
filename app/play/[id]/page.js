'use client'
import { useState, useEffect } from 'react'
import { scoreWordleGuess } from '@/lib/mini-games'
import { playClick, playCorrect, playWrong, playGameStart, playVictoryFanfare, playRaceAdvance } from '@/lib/sounds'

// Deliberately its own clean visual world (playful, kid-facing) rather
// than the teacher-tool theme in lib/theme.js -- students land here from
// a QR code with zero context, this should read as a game, not a piece
// of admin software.
const BG = 'linear-gradient(135deg, #4a6fa5 0%, #7a5aa5 100%)'

export default function PlayGamePage({ params }) {
  const [gameId, setGameId] = useState(null)
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const p = await params
      setGameId(p.id)
      try {
        const res = await fetch(`/api/mini-games/${p.id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not load this game')
        setGame(data.game)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [params])

  if (loading) return <Shell><p style={{ fontSize: 20 }}>Loading your game…</p></Shell>
  if (error || !game) return <Shell><p style={{ fontSize: 20 }}>{error || 'Game not found.'} Ask your teacher for a fresh QR code.</p></Shell>

  return <Shell>{game.game_type === 'quiz' ? <QuizGame game={game} /> : game.game_type === 'math_racer' ? <MathRacerGame game={game} /> : <WordleGame game={game} />}</Shell>
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', sans-serif", color: '#fff', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>{children}</div>
    </div>
  )
}

function QuizGame({ game }) {
  const questions = game.game_data?.questions || []
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)

  const q = questions[idx]

  function pick(i) {
    if (selected !== null) return
    setSelected(i)
    setShowResult(true)
    if (i === q.correctIndex) { setScore((s) => s + 1); playCorrect() } else { playWrong() }
    setTimeout(() => {
      setSelected(null)
      setShowResult(false)
      if (idx + 1 < questions.length) setIdx(idx + 1)
      else { setFinished(true); playVictoryFanfare() }
    }, 1200)
  }

  if (!questions.length) return <p>No questions in this game.</p>

  if (finished) {
    return (
      <div>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>🎉 Done!</h1>
        <p style={{ fontSize: 22 }}>You scored {score} / {questions.length}</p>
        <button onClick={() => window.location.reload()} style={playAgainStyle}>Play Again</button>
      </div>
    )
  }

  return (
    <div>
      <p style={{ opacity: 0.8, fontSize: 13, marginBottom: 4 }}>Question {idx + 1} of {questions.length} · Score: {score}</p>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>{q.question}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {q.choices.map((choice, i) => {
          let bg = 'rgba(255,255,255,0.15)'
          if (showResult) {
            if (i === q.correctIndex) bg = '#1a7a3e'
            else if (i === selected) bg = '#a33'
          }
          return (
            <button key={i} onClick={() => pick(i)} disabled={selected !== null} style={{
              padding: '18px 12px', fontSize: 16, fontWeight: 600, borderRadius: 10, border: 'none',
              background: bg, color: '#fff', cursor: selected === null ? 'pointer' : 'default', transition: 'background 0.2s',
            }}>
              {choice}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WordleGame({ game }) {
  const target = game.game_data?.word || ''
  const hint = game.game_data?.hint || ''
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState('playing') // 'playing' | 'won' | 'lost'
  const maxGuesses = 6

  function submitGuess() {
    if (current.length !== target.length) return
    const scored = scoreWordleGuess(current.toUpperCase(), target)
    const next = [...guesses, { letters: current.toUpperCase(), scored }]
    setGuesses(next)
    setCurrent('')
    if (current.toUpperCase() === target) { setStatus('won'); playVictoryFanfare() }
    else if (next.length >= maxGuesses) { setStatus('lost'); playWrong() }
    else playClick()
  }

  function handleKey(e) {
    if (status !== 'playing') return
    if (e.key === 'Enter') submitGuess()
    else if (e.key === 'Backspace') setCurrent((c) => c.slice(0, -1))
    else if (/^[a-zA-Z]$/.test(e.key) && current.length < target.length) setCurrent((c) => (c + e.key).toUpperCase())
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const colorFor = (s) => (s === 'correct' ? '#1a7a3e' : s === 'present' ? '#b57c2a' : 'rgba(255,255,255,0.15)')

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Word Guess</h1>
      <p style={{ opacity: 0.85, fontSize: 13, marginBottom: 16 }}>{hint}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginBottom: 16 }}>
        {Array.from({ length: maxGuesses }).map((_, row) => {
          const g = guesses[row]
          const letters = g ? g.letters.split('') : (row === guesses.length ? current.padEnd(target.length).split('') : new Array(target.length).fill(''))
          return (
            <div key={row} style={{ display: 'flex', gap: 6 }}>
              {letters.map((letter, col) => (
                <div key={col} style={{
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, borderRadius: 6,
                  background: g ? colorFor(g.scored[col]) : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}>
                  {letter.trim()}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {status === 'playing' && (
        <div>
          <input
            value={current} onChange={(e) => setCurrent(e.target.value.toUpperCase().slice(0, target.length).replace(/[^A-Z]/g, ''))}
            maxLength={target.length} autoFocus
            style={{ fontSize: 20, padding: 10, borderRadius: 8, border: 'none', textAlign: 'center', width: 200, marginRight: 8, textTransform: 'uppercase' }}
          />
          <button onClick={submitGuess} style={playAgainStyle}>Guess</button>
        </div>
      )}
      {status === 'won' && <h2 style={{ fontSize: 24 }}>🎉 You got it: {target}!</h2>}
      {status === 'lost' && <h2 style={{ fontSize: 22 }}>The word was: {target}</h2>}
      {status !== 'playing' && <button onClick={() => window.location.reload()} style={playAgainStyle}>Play Again</button>}
    </div>
  )
}

const playAgainStyle = { marginTop: 16, padding: '10px 24px', fontSize: 15, fontWeight: 700, borderRadius: 8, border: 'none', background: '#fff', color: '#4a6fa5', cursor: 'pointer' }

// Racing mini-game in the spirit of Blooket's racing mode: correct
// answers move YOUR racer forward; the bots creep forward on a steady
// timer regardless (so there's always a race happening, even if a
// student answers slowly) but a wrong answer costs no ground -- getting
// questions right is purely upside, which keeps it encouraging rather
// than punishing for a math-practice context.
const RACE_LENGTH = 20 // matches the 20 generated questions -- one correct answer = one step
const BOT_TICK_MS = 2600
const RACERS = [
  { key: 'you', emoji: '🚗', label: 'You', isPlayer: true },
  { key: 'bot1', emoji: '🚙', label: 'Rex', isPlayer: false },
  { key: 'bot2', emoji: '🏎️', label: 'Blaze', isPlayer: false },
]

function MathRacerGame({ game }) {
  const questions = game.game_data?.questions || []
  const [qIdx, setQIdx] = useState(0)
  const [positions, setPositions] = useState({ you: 0, bot1: 0, bot2: 0 })
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [winner, setWinner] = useState(null)
  const [started, setStarted] = useState(false)

  const q = questions[qIdx % questions.length]

  useEffect(() => {
    if (!started || winner) return
    const interval = setInterval(() => {
      setPositions((prev) => {
        const next = { ...prev }
        for (const bot of ['bot1', 'bot2']) {
          if (Math.random() < 0.6 && next[bot] < RACE_LENGTH) next[bot] += 1
        }
        if (next.bot1 >= RACE_LENGTH || next.bot2 >= RACE_LENGTH) {
          setWinner(next.bot1 >= RACE_LENGTH ? 'Rex' : 'Blaze')
          playWrong()
        }
        return next
      })
    }, BOT_TICK_MS)
    return () => clearInterval(interval)
  }, [started, winner])

  function start() {
    setStarted(true)
    playGameStart()
  }

  function pick(i) {
    if (selected !== null || winner) return
    setSelected(i)
    setShowResult(true)
    const correct = i === q.correctIndex
    if (correct) {
      playRaceAdvance()
      setPositions((prev) => {
        const next = { ...prev, you: Math.min(RACE_LENGTH, prev.you + 1) }
        if (next.you >= RACE_LENGTH) { setWinner('You'); playVictoryFanfare() }
        return next
      })
    } else {
      playWrong()
    }
    setTimeout(() => {
      setSelected(null)
      setShowResult(false)
      setQIdx((i2) => i2 + 1)
    }, 700)
  }

  if (!started) {
    return (
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>🏁 Math Racer</h1>
        <p style={{ opacity: 0.85, marginBottom: 20 }}>Answer correctly to move your car forward. First to the finish line wins!</p>
        <button onClick={start} style={playAgainStyle}>Start Race</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        {RACERS.map((r) => (
          <div key={r.key} style={{ position: 'relative', height: 34, marginBottom: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}>
            <div style={{
              position: 'absolute', left: `${(positions[r.key] / RACE_LENGTH) * 92}%`, top: 2, fontSize: 22,
              transition: 'left 0.4s ease',
            }}>
              {r.emoji}
            </div>
            <div style={{ position: 'absolute', right: 4, top: 8, fontSize: 16 }}>🏁</div>
          </div>
        ))}
      </div>

      {winner ? (
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>{winner === 'You' ? '🎉 You won the race!' : `${winner} won this time!`}</h1>
          <button onClick={() => window.location.reload()} style={playAgainStyle}>Race Again</button>
        </div>
      ) : (
        <div>
          <h1 style={{ fontSize: 30, marginBottom: 20 }}>{q.question} = ?</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {q.choices.map((choice, i) => {
              let bg = 'rgba(255,255,255,0.15)'
              if (showResult) {
                if (i === q.correctIndex) bg = '#1a7a3e'
                else if (i === selected) bg = '#a33'
              }
              return (
                <button key={i} onClick={() => pick(i)} disabled={selected !== null} style={{
                  padding: '18px 12px', fontSize: 18, fontWeight: 700, borderRadius: 10, border: 'none',
                  background: bg, color: '#fff', cursor: selected === null ? 'pointer' : 'default',
                }}>
                  {choice}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
