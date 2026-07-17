'use client'
import { useState, useEffect, useCallback } from 'react'
import { playGameStart, playCorrect, playVictoryFanfare } from '@/lib/sounds'

export default function HostSessionPage({ params }) {
  const [sessionId, setSessionId] = useState(null)
  const [hostToken, setHostToken] = useState(null)
  const [data, setData] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)

  const poll = useCallback((id, token) => {
    const q = token ? `&hostToken=${token}` : ''
    fetch(`/api/game-sessions/${id}?role=host${q}`)
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
      const token = new URLSearchParams(window.location.search).get('hostToken')
      setHostToken(token)
      poll(p.id, token)
    })()
  }, [params, poll])

  useEffect(() => {
    if (!sessionId) return
    const interval = setInterval(() => poll(sessionId, hostToken), 2000)
    return () => clearInterval(interval)
  }, [sessionId, hostToken, poll])

  async function control(action) {
    setActing(true)
    try {
      await fetch(`/api/game-sessions/${sessionId}/control`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, hostToken }),
      })
      if (action === 'start') playGameStart()
      if (action === 'reveal') playCorrect()
      if (action === 'next' && data?.currentQuestionIndex + 1 >= data?.totalQuestions) playVictoryFanfare()
      poll(sessionId, hostToken)
    } finally {
      setActing(false)
    }
  }

  if (loading) return <Shell><p style={{ fontSize: 20 }}>Loading…</p></Shell>
  if (error || !data) return <Shell><p style={{ fontSize: 20 }}>{error || 'Session not found.'}</p></Shell>

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${joinCode}` : ''

  return (
    <Shell>
      {data.status === 'lobby' && data.isDuel && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>⚔️ 1v1 Duel</h1>
          <p style={{ opacity: 0.85, marginBottom: 16 }}>Starts automatically the instant both players join.</p>
          <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: 6, marginBottom: 20 }}>{joinCode}</div>
          {joinUrl && (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`}
              alt="Scan to join" style={{ borderRadius: 8, marginBottom: 20 }}
            />
          )}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <DuelSlot filled={data.playerCount >= 1} label="Player 1" />
            <div style={{ fontSize: 32, alignSelf: 'center', opacity: 0.6 }}>VS</div>
            <DuelSlot filled={data.playerCount >= 2} label="Player 2" />
          </div>
        </div>
      )}

      {data.status === 'lobby' && !data.isDuel && (
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
              {data.isDuel ? <DuelScoreBars players={data.leaderboard} /> : <Leaderboard players={data.leaderboard} compact />}
              <button onClick={() => control('next')} disabled={acting} style={{ ...bigBtnStyle, marginTop: 16 }}>
                {data.currentQuestionIndex + 1 >= data.totalQuestions ? '🏁 Show Final Results' : 'Next Question →'}
              </button>
            </>
          )}
        </div>
      )}

      {data.status === 'finished' && (
        <div style={{ textAlign: 'center' }}>
          {data.isDuel ? <DuelResult players={data.leaderboard} /> : (
            <>
              <h1 style={{ fontSize: 32, marginBottom: 20 }}>🏆 Final Results</h1>
              <Leaderboard players={data.leaderboard} />
            </>
          )}
        </div>
      )}
    </Shell>
  )
}

function DuelSlot({ filled, label }) {
  return (
    <div style={{
      width: 120, height: 120, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: filled ? '#1a7a3e' : 'rgba(255,255,255,0.1)', border: `2px dashed ${filled ? 'transparent' : 'rgba(255,255,255,0.3)'}`,
      fontSize: 15, fontWeight: 600,
    }}>
      {filled ? '✅ Ready!' : label}
    </div>
  )
}

function DuelScoreBars({ players }) {
  const [a, b] = players
  const max = Math.max(a?.score || 0, b?.score || 0, 1)
  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      {[a, b].filter(Boolean).map((p) => (
        <div key={p.id} style={{ marginBottom: 10, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 2 }}>
            <span>{p.nickname}</span><span style={{ fontWeight: 700 }}>{p.score}</span>
          </div>
          <div style={{ height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(p.score / max) * 100}%`, background: '#b57c2a', transition: 'width 0.4s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DuelResult({ players }) {
  const [a, b] = [...players].sort((x, y) => y.score - x.score)
  const tie = a?.score === b?.score
  return (
    <div>
      <h1 style={{ fontSize: 34, marginBottom: 16 }}>{tie ? "🤝 It's a Tie!" : `🏆 ${a?.nickname} Wins!`}</h1>
      <DuelScoreBars players={players} />
    </div>
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
