'use client'
import { useState, useEffect, useCallback } from 'react'
import { playGameStart, playCorrect, playVictoryFanfare } from '@/lib/sounds'

export default function HostSessionPage({ params }) {
  const [sessionId, setSessionId] = useState(null)
  const [data, setData] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)

  const poll = useCallback((id) => {
    fetch(`/api/game-sessions/${id}?role=host`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setData(d.session)
        setJoinCode(d.joinCode)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    (async () => {
      const p = await params
      setSessionId(p.id)
      poll(p.id)
    })()
  }, [params, poll])

  useEffect(() => {
    if (!sessionId) return
    const interval = setInterval(() => poll(sessionId), 2000)
    return () => clearInterval(interval)
  }, [sessionId, poll])

  async function control(action) {
    setActing(true)
    try {
      await fetch(`/api/game-sessions/${sessionId}/control`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (action === 'start') playGameStart()
      if (action === 'reveal') playCorrect()
      if (action === 'next' && data?.currentQuestionIndex + 1 >= data?.totalQuestions) playVictoryFanfare()
      poll(sessionId)
    } finally {
      setActing(false)
    }
  }

  if (loading) return <Shell><p style={{ fontSize: 20 }}>Loading…</p></Shell>
  if (error || !data) return <Shell><p style={{ fontSize: 20 }}>{error || 'Session not found.'}</p></Shell>

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${joinCode}` : ''

  return (
    <Shell>
      {data.status === 'lobby' && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, opacity: 0.85, marginBottom: 4 }}>Join at</h1>
          <div style={{ fontSize: 20, marginBottom: 16 }}>{typeof window !== 'undefined' ? window.location.host : ''}/join</div>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 8, marginBottom: 20 }}>{joinCode}</div>
          {joinUrl && (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(joinUrl)}`}
              alt="Scan to join" style={{ borderRadius: 8, marginBottom: 20 }}
            />
          )}
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>{data.playerCount} player{data.playerCount === 1 ? '' : 's'} joined</h2>
          <button onClick={() => control('start')} disabled={acting || data.playerCount === 0} style={bigBtnStyle}>
            {data.playerCount === 0 ? 'Waiting for players…' : '▶ Start Game'}
          </button>
        </div>
      )}

      {(data.status === 'active' || data.status === 'question_reveal') && data.question && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 8 }}>
            Question {data.currentQuestionIndex + 1} of {data.totalQuestions} · {data.answeredCount}/{data.playerCount} answered
          </p>
          <h1 style={{ fontSize: 32, marginBottom: 24 }}>{data.question.question}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            {data.question.choices.map((choice, i) => (
              <div key={i} style={{
                padding: '20px 16px', fontSize: 18, fontWeight: 600, borderRadius: 10,
                background: data.status === 'question_reveal'
                  ? (i === data.question.correctIndex ? '#1a7a3e' : 'rgba(255,255,255,0.1)')
                  : 'rgba(255,255,255,0.15)',
              }}>
                {choice}
              </div>
            ))}
          </div>
          {data.status === 'active' && (
            <button onClick={() => control('reveal')} disabled={acting} style={bigBtnStyle}>Reveal Answer</button>
          )}
          {data.status === 'question_reveal' && (
            <>
              <Leaderboard players={data.leaderboard} compact />
              <button onClick={() => control('next')} disabled={acting} style={{ ...bigBtnStyle, marginTop: 16 }}>
                {data.currentQuestionIndex + 1 >= data.totalQuestions ? '🏁 Show Final Results' : 'Next Question →'}
              </button>
            </>
          )}
        </div>
      )}

      {data.status === 'finished' && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, marginBottom: 20 }}>🏆 Final Results</h1>
          <Leaderboard players={data.leaderboard} />
        </div>
      )}
    </Shell>
  )
}

function Leaderboard({ players, compact }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      {players.slice(0, compact ? 5 : 10).map((p, i) => (
        <div key={p.id} style={{
          display: 'flex', justifyContent: 'space-between', padding: '10px 16px', marginBottom: 6,
          background: 'rgba(255,255,255,0.12)', borderRadius: 8, fontSize: compact ? 15 : 18,
        }}>
          <span>{medals[i] || `${i + 1}.`} {p.nickname}</span>
          <span style={{ fontWeight: 700 }}>{p.score}</span>
        </div>
      ))}
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1c3557 0%, #4a2a6a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30,
      fontFamily: "'Segoe UI', sans-serif", color: '#fff',
    }}>
      <div style={{ maxWidth: 700, width: '100%' }}>{children}</div>
    </div>
  )
}

const bigBtnStyle = { padding: '16px 40px', fontSize: 20, fontWeight: 700, borderRadius: 12, border: 'none', background: '#b57c2a', color: '#fff', cursor: 'pointer' }
