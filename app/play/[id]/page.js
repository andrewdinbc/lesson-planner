'use client'
import { useState, useEffect, useRef } from 'react'
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

  return (
    <Shell>
      {game.game_type === 'quiz' && <QuizGame game={game} />}
      {game.game_type === 'math_racer' && <MathRacerGame game={game} />}
      {game.game_type === 'muncher' && <MuncherGame game={game} />}
      {game.game_type === 'fact_dash' && <FactDashGame game={game} />}
      {game.game_type === 'tycoon' && <TycoonGame game={game} />}
      {game.game_type === 'wordle' && <WordleGame game={game} />}
    </Shell>
  )
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

// ── Muncher: eat-the-right-answer growth loop ──────────────────────
// Inspired by Slither.io/Agar.io's "the bigger you are, the more you can
// eat" satisfaction (top-requested mechanic on Xavier & Kashton's list).
// The current question's choices float as orbs around the arena; eating
// the CORRECT orb grows your blob and scores a point, eating a wrong one
// shrinks you back down (never below a floor size, so one mistake can't
// end the run). New orbs spawn for the next question as soon as the
// right one is eaten. Controlled by dragging/touching -- your blob eases
// toward the pointer, same feel as the reference games.
const MUNCH_ROUNDS = 12
function MuncherGame({ game }) {
  const questions = game.game_data?.questions || []
  const [qIdx, setQIdx] = useState(0)
  const [size, setSize] = useState(28)
  const [score, setScore] = useState(0)
  const [pos, setPos] = useState({ x: 50, y: 50 }) // percent-based, arena-relative
  const [target, setTarget] = useState({ x: 50, y: 50 })
  const [orbs, setOrbs] = useState([])
  const [finished, setFinished] = useState(false)
  const arenaRef = useRef(null)

  const q = questions[qIdx]

  // spawn orbs for the current question
  useEffect(() => {
    if (!q || finished) return
    const placed = q.choices.map((choice, i) => ({
      id: `${qIdx}-${i}`, label: choice, correct: i === q.correctIndex,
      x: 15 + Math.random() * 70, y: 15 + Math.random() * 70,
    }))
    setOrbs(placed)
  }, [qIdx, finished]) // eslint-disable-line react-hooks/exhaustive-deps

  // ease player position toward pointer target every frame (simple loop)
  useEffect(() => {
    if (finished) return
    const id = setInterval(() => {
      setPos((p) => ({ x: p.x + (target.x - p.x) * 0.15, y: p.y + (target.y - p.y) * 0.15 }))
    }, 40)
    return () => clearInterval(id)
  }, [target, finished])

  // collision check every frame
  useEffect(() => {
    if (finished || !orbs.length) return
    const playerRadiusPct = size / 8 // rough conversion from px size to arena-percent radius
    for (const orb of orbs) {
      const dx = orb.x - pos.x, dy = orb.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < playerRadiusPct + 4) {
        eat(orb)
        break
      }
    }
  }, [pos]) // eslint-disable-line react-hooks/exhaustive-deps

  function eat(orb) {
    if (orb.correct) {
      playCorrect()
      setSize((s) => Math.min(90, s + 6))
      setScore((s) => s + 1)
      if (qIdx + 1 >= Math.min(MUNCH_ROUNDS, questions.length)) { setFinished(true); playVictoryFanfare() }
      else setQIdx((i) => i + 1)
    } else {
      playWrong()
      setSize((s) => Math.max(20, s - 8))
      setOrbs((prev) => prev.filter((o) => o.id !== orb.id))
    }
  }

  function handlePointer(e) {
    const rect = arenaRef.current?.getBoundingClientRect()
    if (!rect) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setTarget({ x: Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100)), y: Math.max(4, Math.min(96, ((clientY - rect.top) / rect.height) * 100)) })
  }

  if (!questions.length) return <p>No questions in this game.</p>

  if (finished) {
    return (
      <div>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>🎉 You grew huge!</h1>
        <p style={{ fontSize: 20 }}>Score: {score} / {Math.min(MUNCH_ROUNDS, questions.length)}</p>
        <button onClick={() => window.location.reload()} style={playAgainStyle}>Play Again</button>
      </div>
    )
  }

  return (
    <div>
      <p style={{ opacity: 0.85, fontSize: 13, marginBottom: 6 }}>Drag to move · Eat the RIGHT answer · Score: {score}</p>
      <div
        ref={arenaRef}
        onMouseMove={handlePointer}
        onTouchMove={(e) => { e.preventDefault(); handlePointer(e) }}
        style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: 420, margin: '0 auto', background: 'rgba(0,0,0,0.2)', borderRadius: 16, overflow: 'hidden', touchAction: 'none', cursor: 'crosshair' }}
      >
        {orbs.map((orb) => (
          <div key={orb.id} style={{
            position: 'absolute', left: `${orb.x}%`, top: `${orb.y}%`, transform: 'translate(-50%,-50%)',
            background: '#fff', color: '#4a6fa5', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
          }}>
            {orb.label}
          </div>
        ))}
        <div style={{
          position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)',
          width: size, height: size, borderRadius: '50%', background: '#ffd23f',
          border: '3px solid #fff', transition: 'width 0.3s, height 0.3s',
        }} />
      </div>
      <p style={{ fontSize: 15, marginTop: 12 }}>{q?.question}</p>
    </div>
  )
}

// ── Fact Dash: 3-lane endless runner ────────────────────────────────
// Inspired by Subway Surfers/Crossy Road's "how long can you last, it
// keeps speeding up" loop. The question sits at the top; three gates
// (one per lane) approach carrying the three answer choices. Steer into
// the correct lane before the gate reaches you. Correct = pass through,
// next question, speed ticks up slightly. Wrong lane or missing the gate
// entirely = run ends, final distance/score shown.
const LANES = [0, 1, 2]
const DASH_START_SPEED = 1.6
const DASH_SPEED_STEP = 0.12
function FactDashGame({ game }) {
  const questions = game.game_data?.questions || []
  const [qIdx, setQIdx] = useState(0)
  const [lane, setLane] = useState(1)
  const [gateY, setGateY] = useState(-10) // percent from top, travels to ~90
  const [speed, setSpeed] = useState(DASH_START_SPEED)
  const [score, setScore] = useState(0)
  const [started, setStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const q = questions[qIdx % questions.length]

  useEffect(() => {
    if (!started || gameOver) return
    const id = setInterval(() => {
      setGateY((y) => {
        const next = y + speed
        if (next >= 82) {
          // gate reached the player line -- check the lane
          if (lane === q.correctIndex) {
            playCorrect()
            setScore((s) => s + 1)
            setSpeed((sp) => sp + DASH_SPEED_STEP)
            setQIdx((i) => i + 1)
            return -10
          } else {
            playWrong()
            setGameOver(true)
            return next
          }
        }
        return next
      })
    }, 45)
    return () => clearInterval(id)
  }, [started, gameOver, speed, lane, q]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleKey(e) {
    if (!started || gameOver) return
    if (e.key === 'ArrowLeft') setLane((l) => Math.max(0, l - 1))
    if (e.key === 'ArrowRight') setLane((l) => Math.min(2, l + 1))
  }
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function start() {
    setStarted(true)
    playGameStart()
  }

  if (!questions.length) return <p>No questions in this game.</p>

  if (!started) {
    return (
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>🏃 Fact Dash</h1>
        <p style={{ opacity: 0.85, marginBottom: 20 }}>Steer into the lane with the right answer before the gate reaches you. It speeds up the longer you last!</p>
        <button onClick={start} style={playAgainStyle}>Start</button>
      </div>
    )
  }

  if (gameOver) {
    return (
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>💥 Run Over!</h1>
        <p style={{ fontSize: 20 }}>You made it through {score} question{score === 1 ? '' : 's'}</p>
        <button onClick={() => window.location.reload()} style={playAgainStyle}>Run Again</button>
      </div>
    )
  }

  return (
    <div>
      <p style={{ opacity: 0.85, fontSize: 13, marginBottom: 6 }}>Score: {score} · Tap a lane or use ← →</p>
      <h2 style={{ fontSize: 18, marginBottom: 10 }}>{q.question}</h2>
      <div style={{ position: 'relative', height: 320, maxWidth: 360, margin: '0 auto', background: 'rgba(0,0,0,0.2)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: `${gateY}%`, left: 0, right: 0, display: 'flex' }}>
          {LANES.map((l) => (
            <div key={l} style={{
              flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, padding: '10px 4px',
              background: 'rgba(255,255,255,0.15)', margin: '0 3px', borderRadius: 8,
            }}>
              {q.choices[l]}
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: '82%', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.4)' }} />
        <div style={{ position: 'absolute', top: '84%', left: `${(lane / 3) * 100 + 16.5}%`, fontSize: 28, transform: 'translateX(-50%)' }}>🏃</div>
        <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, display: 'flex' }}>
          {LANES.map((l) => (
            <div key={l} onClick={() => setLane(l)} style={{ flex: 1, height: 40, cursor: 'pointer' }} />
          ))}
        </div>
      </div>
    </div>
  )
}


// ── Trivia Tycoon: correct-answers-earn-currency shop upgrade ──────
// Inspired by Duck Duck Merge ("make the highest level ducks to make the
// most money") and Monkey Mart/My Perfect Hotel's "level up the store"
// satisfaction. Coins come ONLY from correct answers -- there is no idle
// ticking -- so the progress loop stays tied to actually engaging with
// the content, unlike a pure clicker. Each coin threshold unlocks the
// next visual tier of the shop.
const TYCOON_TIERS = [
  { min: 0, emoji: '🏚️', label: 'Empty Lot' },
  { min: 100, emoji: '🏪', label: 'Corner Stand' },
  { min: 250, emoji: '🏬', label: 'Shop' },
  { min: 450, emoji: '🏢', label: 'Storefront' },
  { min: 700, emoji: '🏰', label: 'Flagship Store' },
  { min: 1000, emoji: '🏙️', label: 'Empire' },
]
const COINS_PER_CORRECT = 60
function TycoonGame({ game }) {
  const questions = game.game_data?.questions || []
  const [idx, setIdx] = useState(0)
  const [coins, setCoins] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)
  const [popup, setPopup] = useState(null) // "+60" floating text

  const q = questions[idx]
  const tier = [...TYCOON_TIERS].reverse().find((t) => coins >= t.min) || TYCOON_TIERS[0]
  const nextTier = TYCOON_TIERS.find((t) => t.min > coins)

  function pick(i) {
    if (selected !== null) return
    setSelected(i)
    setShowResult(true)
    if (i === q.correctIndex) {
      playCorrect()
      setCoins((c) => c + COINS_PER_CORRECT)
      setPopup(`+${COINS_PER_CORRECT}`)
    } else {
      playWrong()
      setPopup(null)
    }
    setTimeout(() => {
      setSelected(null)
      setShowResult(false)
      setPopup(null)
      if (idx + 1 < questions.length) setIdx(idx + 1)
      else { setFinished(true); playVictoryFanfare() }
    }, 1100)
  }

  if (!questions.length) return <p>No questions in this game.</p>

  if (finished) {
    return (
      <div>
        <h1 style={{ fontSize: 32, marginBottom: 4 }}>{tier.emoji}</h1>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>Your shop reached: {tier.label}!</h2>
        <p style={{ fontSize: 18, marginBottom: 16 }}>💰 {coins} coins earned</p>
        <button onClick={() => window.location.reload()} style={playAgainStyle}>Play Again</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 48, position: 'relative' }}>
          {tier.emoji}
          {popup && <span style={{ position: 'absolute', top: -10, right: -20, fontSize: 16, color: '#ffd23f', fontWeight: 700 }}>{popup}</span>}
        </div>
        <p style={{ fontSize: 13, opacity: 0.85, margin: '4px 0 0' }}>{tier.label} · 💰 {coins} coins</p>
        {nextTier && <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>{nextTier.min - coins} coins to {nextTier.label} {nextTier.emoji}</p>}
      </div>

      <p style={{ opacity: 0.8, fontSize: 13, marginBottom: 4 }}>Question {idx + 1} of {questions.length}</p>
      <h2 style={{ fontSize: 20, marginBottom: 20 }}>{q.question}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {q.choices.map((choice, i) => {
          let bg = 'rgba(255,255,255,0.15)'
          if (showResult) {
            if (i === q.correctIndex) bg = '#1a7a3e'
            else if (i === selected) bg = '#a33'
          }
          return (
            <button key={i} onClick={() => pick(i)} disabled={selected !== null} style={{
              padding: '16px 12px', fontSize: 15, fontWeight: 600, borderRadius: 10, border: 'none',
              background: bg, color: '#fff', cursor: selected === null ? 'pointer' : 'default',
            }}>
              {choice}
            </button>
          )
        })}
      </div>
    </div>
  )
}
