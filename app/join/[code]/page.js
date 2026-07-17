'use client'
import { useState, useEffect, useCallback } from 'react'
import { playClick, playCorrect, playWrong, playVictoryFanfare } from '@/lib/sounds'

const BG = 'linear-gradient(135deg, #4a6fa5 0%, #7a5aa5 100%)'
const STORAGE_KEY_PREFIX = 'live_quiz_player_'

export default function JoinGamePage({ params }) {
  const [code, setCode] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [nickname, setNickname] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [data, setData] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [lastResult, setLastResult] = useState(null) // { correct, points }
  const [score, setScore] = useState(0)

  useEffect(() => {
    (async () => {
      const p = await params
      const c = (p.code || '').toUpperCase()
      setCode(c)
      try {
        const res = await fetch(`/api/game-sessions/by-code/${c}`)
        const d = await res.json()
        if (res.ok) {
          setSessionId(d.session.id)
          const saved = localStorage.getItem(STORAGE_KEY_PREFIX + d.session.id)
          if (saved) setPlayerId(saved)
        } else {
          setJoinError(d.error)
        }
      } catch {
        setJoinError('Could not connect. Check the code and try again.')
      }
    })()
  }, [params])

  const poll = useCallback(() => {
    if (!sessionId) return
    fetch(`/api/game-sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d.session)
      })
  }, [sessionId])

  useEffect(() => {
    if (!sessionId || !playerId) return
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [sessionId, playerId, poll])

  // Reset the "answered" flag whenever the question index changes.
  useEffect(() => { setAnswered(false); setLastResult(null) }, [data?.currentQuestionIndex])

  // Fire the fanfare exactly once when the game wraps up, not on every
  // poll tick while the finished screen stays mounted.
  useEffect(() => {
    if (data?.status === 'finished') playVictoryFanfare()
  }, [data?.status])

  async function join() {
    if (!nickname.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(`/api/game-sessions/${sessionId}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not join')
      setPlayerId(d.player.id)
      localStorage.setItem(STORAGE_KEY_PREFIX + sessionId, d.player.id)
    } catch (e) {
      setJoinError(e.message)
    } finally {
      setJoining(false)
    }
  }

  async function submitAnswer(choiceIndex) {
    if (answered) return
    setAnswered(true)
    playClick()
    try {
      const res = await fetch(`/api/game-sessions/${sessionId}/answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, questionIndex: data.currentQuestionIndex, choiceIndex }),
      })
      const d = await res.json()
      if (res.ok) {
        setLastResult({ correct: d.correct, points: d.points })
        setScore((s) => s + (d.points || 0))
        if (d.correct) playCorrect(); else playWrong()
      }
    } catch { /* keep answered=true either way -- retrying a live quiz answer isn't worth the complexity */ }
  }

  if (joinError && !sessionId) return <Shell><p style={{ fontSize: 18 }}>{joinError}</p></Shell>
  if (!sessionId) return <Shell><p style={{ fontSize: 18 }}>Connecting…</p></Shell>

  if (!playerId) {
    return (
      <Shell>
        <h1 style={{ fontSize: 26, marginBottom: 16 }}>Join Game</h1>
        <p style={{ opacity: 0.85, marginBottom: 16 }}>Code: {code}</p>
        <input
          value={nickname} onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Your name" maxLength={24} autoFocus
          style={{ fontSize: 18, padding: 12, borderRadius: 8, border: 'none', textAlign: 'center', width: 220, marginBottom: 12 }}
        />
        <br />
        <button onClick={join} disabled={joining || !nickname.trim()} style={playBtnStyle}>
          {joining ? 'Joining…' : 'Join'}
        </button>
        {joinError && <p style={{ color: '#ffd', marginTop: 12 }}>{joinError}</p>}
      </Shell>
    )
  }

  if (!data || data.status === 'lobby') {
    return <Shell><h1 style={{ fontSize: 24 }}>You're in! 🎉</h1><p style={{ opacity: 0.85 }}>Waiting for the host to start…</p></Shell>
  }

  if (data.status === 'active' && data.question) {
    return (
      <Shell>
        <p style={{ opacity: 0.8, fontSize: 13, marginBottom: 4 }}>Question {data.currentQuestionIndex + 1} of {data.totalQuestions} · Score: {score}</p>
        <h1 style={{ fontSize: 22, marginBottom: 20 }}>{data.question.question}</h1>
        {!answered ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {data.question.choices.map((choice, i) => (
              <button key={i} onClick={() => submitAnswer(i)} style={{
                padding: '18px 12px', fontSize: 16, fontWeight: 600, borderRadius: 10, border: 'none',
                background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
              }}>
                {choice}
              </button>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 18 }}>
            {lastResult ? (lastResult.correct ? `✅ Correct! +${lastResult.points}` : '❌ Not quite') : 'Answer locked in — waiting for everyone else…'}
          </p>
        )}
      </Shell>
    )
  }

  if (data.status === 'question_reveal' && data.question) {
    return (
      <Shell>
        <p style={{ fontSize: 16, marginBottom: 8 }}>The answer was:</p>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>{data.question.choices[data.question.correctIndex]}</h1>
        <p style={{ fontSize: 18 }}>{lastResult ? (lastResult.correct ? `✅ You got it! +${lastResult.points}` : '❌ You missed that one') : "Didn't answer in time"}</p>
        <p style={{ opacity: 0.8, marginTop: 16 }}>Your score: {score}</p>
      </Shell>
    )
  }

  if (data.status === 'finished') {
    return (
      <Shell>
        <h1 style={{ fontSize: 30, marginBottom: 12 }}>🏁 Game Over!</h1>
        <p style={{ fontSize: 22 }}>Your final score: {score}</p>
      </Shell>
    )
  }

  return <Shell><p>…</p></Shell>
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', sans-serif", color: '#fff', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>{children}</div>
    </div>
  )
}

const playBtnStyle = { padding: '12px 32px', fontSize: 16, fontWeight: 700, borderRadius: 8, border: 'none', background: '#fff', color: '#4a6fa5', cursor: 'pointer' }
