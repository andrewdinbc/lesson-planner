'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { playClick, playCorrect, playGameStart, playVictoryFanfare } from '@/lib/sounds'

const BG = 'linear-gradient(135deg, #4a6fa5 0%, #7a5aa5 100%)'
const STORAGE_KEY_PREFIX = 'draw_game_player_'
const COLORS = ['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00']

export default function DrawJoinPage({ params }) {
  const [code, setCode] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [nickname, setNickname] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [data, setData] = useState(null)
  const [guessText, setGuessText] = useState('')
  const [lastGuessResult, setLastGuessResult] = useState(null)
  const prevStatus = useRef(null)

  useEffect(() => {
    (async () => {
      const p = await params
      const c = (p.code || '').toUpperCase()
      setCode(c)
      try {
        const res = await fetch(`/api/draw-sessions/by-code/${c}`)
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
    const q = playerId ? `?playerId=${playerId}` : ''
    fetch(`/api/draw-sessions/${sessionId}${q}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d.session) })
  }, [sessionId, playerId])

  useEffect(() => {
    if (!sessionId || !playerId) return
    poll()
    const interval = setInterval(poll, 800)
    return () => clearInterval(interval)
  }, [sessionId, playerId, poll])

  useEffect(() => {
    if (data?.status && data.status !== prevStatus.current) {
      if (data.status === 'drawing') playGameStart()
      if (data.status === 'finished') playVictoryFanfare()
      prevStatus.current = data.status
    }
  }, [data?.status])

  useEffect(() => { setGuessText(''); setLastGuessResult(null) }, [data?.currentRound])

  async function join() {
    if (!nickname.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(`/api/draw-sessions/${sessionId}/join`, {
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

  async function submitGuess() {
    if (!guessText.trim() || data?.iAlreadyGuessed) return
    playClick()
    try {
      const res = await fetch(`/api/draw-sessions/${sessionId}/guess`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, text: guessText }),
      })
      const d = await res.json()
      if (res.ok) {
        setLastGuessResult(d)
        if (d.correct) playCorrect()
        setGuessText('')
      }
    } catch { /* transient network hiccup -- the guess box just stays editable, they can retry */ }
  }

  if (joinError && !sessionId) return <Shell><p style={{ fontSize: 18 }}>{joinError}</p></Shell>
  if (!sessionId) return <Shell><p style={{ fontSize: 18 }}>Connecting…</p></Shell>

  if (!playerId) {
    return (
      <Shell>
        <h1 style={{ fontSize: 26, marginBottom: 16 }}>Join Draw &amp; Guess</h1>
        <p style={{ opacity: 0.85, marginBottom: 16 }}>Code: {code}</p>
        <input
          value={nickname} onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Your name" maxLength={24} autoFocus
          style={{ fontSize: 18, padding: 12, borderRadius: 8, border: 'none', textAlign: 'center', width: 220, marginBottom: 12 }}
        />
        <br />
        <button onClick={join} disabled={joining || !nickname.trim()} style={btnStyle}>{joining ? 'Joining…' : 'Join'}</button>
        {joinError && <p style={{ color: '#ffd', marginTop: 12 }}>{joinError}</p>}
      </Shell>
    )
  }

  if (!data || data.status === 'lobby') {
    return <Shell><h1 style={{ fontSize: 24 }}>You're in! 🎉</h1><p style={{ opacity: 0.85 }}>Waiting for the host to start…</p></Shell>
  }

  if (data.status === 'drawing' || data.status === 'reveal') {
    return data.isDrawer
      ? <DrawerView sessionId={sessionId} data={data} />
      : <GuesserView data={data} guessText={guessText} setGuessText={setGuessText} submitGuess={submitGuess} lastGuessResult={lastGuessResult} />
  }

  if (data.status === 'finished') {
    const me = data.players.find((p) => p.id === playerId)
    return (
      <Shell>
        <h1 style={{ fontSize: 30, marginBottom: 12 }}>🏁 Game Over!</h1>
        <p style={{ fontSize: 22 }}>Your final score: {me?.score ?? 0}</p>
      </Shell>
    )
  }

  return <Shell><p>…</p></Shell>
}

function DrawerView({ sessionId, data }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const currentStroke = useRef(null)
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(4)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }, [])

  // redraw from server canvas data whenever it updates from elsewhere
  // (shouldn't normally happen since only this device draws, but keeps
  // the drawer's own view consistent after a round change)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const stroke of data.canvasData || []) {
      if (!stroke?.points?.length) continue
      ctx.strokeStyle = stroke.color || '#000'
      ctx.lineWidth = stroke.size || 4
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath()
      stroke.points.forEach((pt, i) => {
        const x = pt.x * canvas.width, y = pt.y * canvas.height
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
  }, [data.currentRound]) // eslint-disable-line react-hooks/exhaustive-deps

  function pointFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height }
  }

  function start(e) {
    drawing.current = true
    currentStroke.current = { color, size, points: [pointFromEvent(e)] }
    drawLocal()
  }
  function move(e) {
    if (!drawing.current) return
    currentStroke.current.points.push(pointFromEvent(e))
    drawLocal()
  }
  async function end() {
    if (!drawing.current) return
    drawing.current = false
    if (currentStroke.current?.points.length > 1) {
      await fetch(`/api/draw-sessions/${sessionId}/stroke`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stroke: currentStroke.current }),
      })
    }
    currentStroke.current = null
  }
  function drawLocal() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const s = currentStroke.current
    if (!s || s.points.length < 2) return
    const p1 = s.points[s.points.length - 2], p2 = s.points[s.points.length - 1]
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.size
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height)
    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height)
    ctx.stroke()
  }
  async function clearCanvas() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    await fetch(`/api/draw-sessions/${sessionId}/stroke`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: true }),
    })
  }

  return (
    <Shell wide>
      <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Round {data.currentRound} of {data.totalRounds} · {data.correctGuesserIds.length} guessed so far</p>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>You're drawing:</h1>
      <h2 style={{ fontSize: 30, marginBottom: 14, color: '#ffd23f' }}>{data.currentWord}</h2>
      <canvas
        ref={canvasRef} width={340} height={255}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={(e) => { e.preventDefault(); start(e) }} onTouchMove={(e) => { e.preventDefault(); move(e) }} onTouchEnd={end}
        style={{ background: '#fff', borderRadius: 10, touchAction: 'none', maxWidth: '100%' }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, alignItems: 'center' }}>
        {COLORS.map((c) => (
          <div key={c} onClick={() => setColor(c)} style={{
            width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
            border: color === c ? '3px solid #fff' : '3px solid transparent',
          }} />
        ))}
        <input type="range" min="2" max="12" value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ width: 70 }} />
        <button onClick={clearCanvas} style={{ ...btnStyle, padding: '6px 14px', fontSize: 12 }}>Clear</button>
      </div>
      {data.status === 'reveal' && <h2 style={{ fontSize: 20, marginTop: 16 }}>Round over — word was {data.currentWord}!</h2>}
    </Shell>
  )
}

function GuesserView({ data, guessText, setGuessText, submitGuess, lastGuessResult }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const stroke of data.canvasData || []) {
      if (!stroke?.points?.length) continue
      ctx.strokeStyle = stroke.color || '#000'
      ctx.lineWidth = stroke.size || 4
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath()
      stroke.points.forEach((pt, i) => {
        const x = pt.x * canvas.width, y = pt.y * canvas.height
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
  }, [data.canvasData])

  return (
    <Shell wide>
      <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>Round {data.currentRound} of {data.totalRounds} · Guess what's being drawn!</p>
      <canvas ref={canvasRef} width={340} height={255} style={{ background: '#fff', borderRadius: 10, maxWidth: '100%', marginBottom: 12 }} />
      {data.status === 'reveal' ? (
        <h2 style={{ fontSize: 22 }}>The word was: {data.currentWord}</h2>
      ) : data.iAlreadyGuessed ? (
        <p style={{ fontSize: 18 }}>✅ You got it! Waiting for others…</p>
      ) : (
        <div>
          <input
            value={guessText} onChange={(e) => setGuessText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
            placeholder="Type your guess…" autoFocus
            style={{ fontSize: 16, padding: 10, borderRadius: 8, border: 'none', textAlign: 'center', width: 220, marginRight: 8 }}
          />
          <button onClick={submitGuess} style={btnStyle}>Guess</button>
          {lastGuessResult && !lastGuessResult.correct && <p style={{ marginTop: 8, opacity: 0.85 }}>Not quite — try again!</p>}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children, wide }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', sans-serif", color: '#fff', textAlign: 'center' }}>
      <div style={{ maxWidth: wide ? 420 : 380, width: '100%' }}>{children}</div>
    </div>
  )
}

const btnStyle = { padding: '10px 24px', fontSize: 15, fontWeight: 700, borderRadius: 8, border: 'none', background: '#fff', color: '#4a6fa5', cursor: 'pointer' }
