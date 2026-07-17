'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

export default function HostDrawSessionPage({ params }) {
  const [sessionId, setSessionId] = useState(null)
  const [hostToken, setHostToken] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const canvasRef = useRef(null)

  const poll = useCallback((id, token) => {
    const q = token ? `&hostToken=${token}` : ''
    fetch(`/api/draw-sessions/${id}?role=host${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setData(d.session)
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
    const interval = setInterval(() => poll(sessionId, hostToken), 800)
    return () => clearInterval(interval)
  }, [sessionId, hostToken, poll])

  useEffect(() => {
    if (!data?.canvasData || !canvasRef.current) return
    redrawCanvas(canvasRef.current, data.canvasData)
  }, [data?.canvasData])

  async function control(action) {
    setActing(true)
    try {
      await fetch(`/api/draw-sessions/${sessionId}/control`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, hostToken }),
      })
      poll(sessionId, hostToken)
    } finally {
      setActing(false)
    }
  }

  if (loading) return <Shell><p style={{ fontSize: 20 }}>Loading…</p></Shell>
  if (error || !data) return <Shell><p style={{ fontSize: 20 }}>{error || 'Session not found.'}</p></Shell>

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/draw/${data.joinCode}` : ''
  const drawer = data.players.find((p) => p.id === data.currentDrawerId)

  return (
    <Shell>
      {data.status === 'lobby' && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, opacity: 0.85, marginBottom: 4 }}>Draw &amp; Guess — Join at</h1>
          <div style={{ fontSize: 18, marginBottom: 16 }}>{typeof window !== 'undefined' ? window.location.host : ''}/draw</div>
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 6, marginBottom: 20 }}>{data.joinCode}</div>
          {joinUrl && (
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(joinUrl)}`} alt="Scan to join" style={{ borderRadius: 8, marginBottom: 20 }} />
          )}
          <h2 style={{ fontSize: 20, marginBottom: 20 }}>{data.players.length} player{data.players.length === 1 ? '' : 's'} joined (need at least 2)</h2>
          <button onClick={() => control('start')} disabled={acting || data.players.length < 2} style={bigBtnStyle}>
            {data.players.length < 2 ? 'Waiting for players…' : '▶ Start'}
          </button>
        </div>
      )}

      {(data.status === 'drawing' || data.status === 'reveal') && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ opacity: 0.8, fontSize: 14, marginBottom: 8 }}>
            Round {data.currentRound} of {data.totalRounds} · {drawer?.nickname} is drawing · {data.correctGuesserIds.length}/{data.players.length - 1} guessed
          </p>
          <canvas ref={canvasRef} width={500} height={375} style={{ background: '#fff', borderRadius: 10, maxWidth: '100%' }} />
          {data.status === 'reveal' && <h2 style={{ fontSize: 24, marginTop: 12 }}>The word was: {data.currentWord}</h2>}
          <div style={{ marginTop: 16 }}>
            {data.status === 'drawing' && <button onClick={() => control('reveal')} disabled={acting} style={bigBtnStyle}>Reveal Now</button>}
            {data.status === 'reveal' && (
              <button onClick={() => control('next')} disabled={acting} style={bigBtnStyle}>
                {data.currentRound >= data.totalRounds ? '🏁 Final Results' : 'Next Round →'}
              </button>
            )}
          </div>
          <Leaderboard players={data.players} compact />
        </div>
      )}

      {data.status === 'finished' && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, marginBottom: 20 }}>🏆 Final Results</h1>
          <Leaderboard players={data.players} />
        </div>
      )}
    </Shell>
  )
}

function redrawCanvas(canvas, strokes) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (const stroke of strokes) {
    if (!stroke?.points?.length) continue
    ctx.strokeStyle = stroke.color || '#000'
    ctx.lineWidth = stroke.size || 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    stroke.points.forEach((pt, i) => {
      const x = pt.x * canvas.width, y = pt.y * canvas.height
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
}

function Leaderboard({ players, compact }) {
  const medals = ['🥇', '🥈', '🥉']
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return (
    <div style={{ maxWidth: 380, margin: '16px auto 0' }}>
      {sorted.slice(0, compact ? 5 : 10).map((p, i) => (
        <div key={p.id} style={{
          display: 'flex', justifyContent: 'space-between', padding: '8px 14px', marginBottom: 5,
          background: 'rgba(255,255,255,0.12)', borderRadius: 8, fontSize: compact ? 13 : 16,
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

const bigBtnStyle = { padding: '14px 32px', fontSize: 18, fontWeight: 700, borderRadius: 12, border: 'none', background: '#b57c2a', color: '#fff', cursor: 'pointer' }
