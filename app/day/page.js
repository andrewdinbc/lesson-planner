'use client'
import { useState, useEffect, useCallback } from 'react'
import { COLORS as C, FONT_BODY } from '@/lib/theme'
import { resizeBlock, recomputeBlockTimes, QUICK_ACTIVITIES, currentBlockId } from '@/lib/daily-plan'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function DayPlanPage() {
  const [date, setDate] = useState(todayStr())
  const [blocks, setBlocks] = useState([])
  const [ttocNotes, setTtocNotes] = useState({ duty: '', reliableStudents: '', specialAttention: '', customNotes: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null) // block id currently in inline-edit mode
  const [swappingId, setSwappingId] = useState(null) // block id currently showing the activity quick-pick
  const [mode, setMode] = useState('board') // 'board' (desk display, default) | 'edit' (fine controls)
  const [now, setNow] = useState(new Date())
  const [aiPanelBlockId, setAiPanelBlockId] = useState(null) // which board block has the AI panel open
  const [aiTopic, setAiTopic] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null) // { title, content } pending Apply/Discard
  const [gameLoading, setGameLoading] = useState(false)
  const [gameResult, setGameResult] = useState(null) // { playUrl, gameType } | { error }

  // Live Board is meant to stay open on a desk during the school day --
  // re-check the clock every 30s so the "current activity" highlight
  // moves on its own without a page refresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])
  const activeId = date === todayStr() ? currentBlockId(blocks, now.toTimeString().slice(0, 5)) : null

  const load = useCallback((d) => {
    setLoading(true)
    fetch(`/api/daily-plan?date=${d}`)
      .then((r) => r.json())
      .then((data) => {
        setBlocks(data.plan?.blocks || [])
        setTtocNotes(data.plan?.ttoc_notes || { duty: '', reliableStudents: '', specialAttention: '', customNotes: '' })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(date) }, [date, load])

  function persist(nextBlocks, nextNotes) {
    setSaving(true)
    fetch('/api/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, blocks: nextBlocks ?? blocks, ttoc_notes: nextNotes ?? ttocNotes }),
    }).finally(() => setSaving(false))
  }

  function updateBlocks(next) {
    setBlocks(next)
    persist(next, undefined)
  }

  function handleResize(id, direction) {
    const next = recomputeBlockTimes(blocks.map((b) => (b.id === id ? resizeBlock(b, direction) : b)))
    updateBlocks(next)
  }

  function handleContentChange(id, field, value) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  }

  function commitEdit() {
    setEditingId(null)
    persist(blocks, undefined)
  }

  function swapActivity(id, newSubject) {
    const next = blocks.map((b) => (b.id === id ? { ...b, subject: newSubject, title: newSubject } : b))
    setSwappingId(null)
    updateBlocks(next)
  }

  function addBlock() {
    const last = blocks[blocks.length - 1]
    const nextStart = last ? addMinutes(last.start_time, last.length_minutes) : '09:00'
    const newBlock = { id: `${date}_new_${Date.now()}`, start_time: nextStart, length_minutes: 30, subject: 'New Activity', title: 'New Activity', content: '', fixed: false }
    updateBlocks([...blocks, newBlock])
  }

  function removeBlock(id) {
    updateBlocks(recomputeBlockTimes(blocks.filter((b) => b.id !== id)))
  }

  function updateTtoc(field, value) {
    const next = { ...ttocNotes, [field]: value }
    setTtocNotes(next)
  }

  function commitTtoc() {
    persist(undefined, ttocNotes)
  }

  function openAiPanel(id) {
    setAiPanelBlockId(aiPanelBlockId === id ? null : id)
    setAiTopic('')
    setAiSuggestion(null)
    setGameResult(null)
  }

  async function generateGame(block, gameType) {
    setGameLoading(true)
    setGameResult(null)
    try {
      const res = await fetch('/api/mini-games', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, subject: block.subject, topic: aiTopic, grade: '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const playUrl = `${window.location.origin}/play/${data.game.id}`
      setGameResult({ playUrl, gameType, gameId: data.game.id })
    } catch (e) {
      setGameResult({ error: e.message })
    } finally {
      setGameLoading(false)
    }
  }

  async function generateAndStartLive(block) {
    setGameLoading(true)
    setGameResult(null)
    try {
      const res = await fetch('/api/mini-games', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: 'quiz', subject: block.subject, topic: aiTopic, grade: '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      await startLiveSession(data.game.id)
      setAiPanelBlockId(null)
    } catch (e) {
      setGameResult({ error: e.message })
    } finally {
      setGameLoading(false)
    }
  }

  async function startLiveSession(gameId) {
    setGameLoading(true)
    try {
      const res = await fetch('/api/game-sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miniGameId: gameId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      window.open(`/host/${data.session.id}`, '_blank')
    } catch (e) {
      setGameResult((prev) => ({ ...prev, liveError: e.message }))
    } finally {
      setGameLoading(false)
    }
  }

  async function runAiAction(block, action) {
    if (action === 'custom' && !aiTopic.trim()) return
    setAiLoading(true)
    setAiSuggestion(null)
    try {
      const res = await fetch('/api/daily-plan/ai-modify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, subject: block.subject, length_minutes: block.length_minutes, topic: aiTopic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (action === 'skip') {
        applyAiSuggestion(block.id, data) // skip applies immediately, no review step
      } else {
        setAiSuggestion(data)
      }
    } catch (e) {
      setAiSuggestion({ title: null, content: `Couldn't reach AI — try again. (${e.message})` })
    } finally {
      setAiLoading(false)
    }
  }

  function applyAiSuggestion(blockId, suggestion) {
    const next = blocks.map((b) => (b.id === blockId ? { ...b, title: suggestion.title, subject: suggestion.title, content: suggestion.content } : b))
    updateBlocks(next)
    setAiPanelBlockId(null)
    setAiSuggestion(null)
    setAiTopic('')
  }

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 4px' }}>
          <h1 style={{ color: C.navy, fontSize: 28, margin: 0 }}>Daily Planner</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
              <button onClick={() => setMode('board')} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: mode === 'board' ? C.navy : '#fff', color: mode === 'board' ? '#fff' : C.navy }}>
                📋 Board
              </button>
              <button onClick={() => setMode('edit')} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: mode === 'edit' ? C.navy : '#fff', color: mode === 'edit' ? '#fff' : C.navy }}>
                ✏️ Edit
              </button>
            </div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }} />
          </div>
        </div>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
          {mode === 'board'
            ? "Today's Scope & Sequence, built from your Weekly Schedule and this week's Year Timeline units. Meant to stay open on your desk — the current activity highlights automatically. Click any block to skip it, re-engage a struggling class, or generate a fresh lesson on the fly."
            : "Starts from your Weekly Schedule template for this day, but edits here only affect this specific date. Click a block's title to edit its content, use +/- to resize, or click the subject to swap the activity."}
          {saving && <span style={{ color: '#999', marginLeft: 8 }}>Saving…</span>}
        </p>

        {mode === 'board' && (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            {blocks.length === 0 && (
              <p style={{ fontSize: 13, color: '#888' }}>No blocks yet for this day — switch to Edit to add some, or set up your <a href="/week" style={{ color: C.navy }}>Weekly Schedule</a> template first.</p>
            )}
            {blocks.map((b) => {
              const isNow = b.id === activeId
              const panelOpen = aiPanelBlockId === b.id
              return (
                <div key={b.id}>
                <div
                  onClick={() => openAiPanel(b.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: isNow ? '18px 16px' : '12px 16px',
                    marginBottom: panelOpen ? 0 : 8, borderRadius: panelOpen ? '8px 8px 0 0' : 8,
                    background: isNow ? C.navy : (b.fixed ? '#f7f5f0' : '#fff'),
                    border: `1px solid ${isNow ? C.navy : (panelOpen ? C.gold : C.border)}`,
                    boxShadow: isNow ? '0 2px 10px rgba(28,53,87,0.25)' : 'none',
                    transition: 'all 0.3s ease', cursor: 'pointer',
                  }}
                  title="Click to make an AI-based change to this activity"
                >
                  <div style={{ width: 90, fontSize: isNow ? 16 : 13, fontWeight: isNow ? 700 : 400, color: isNow ? '#fff' : '#888' }}>
                    {b.start_time}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: isNow ? 22 : 16, fontWeight: 700, color: isNow ? '#fff' : C.navy }}>
                      {isNow && '▶ '}{b.title || b.subject}
                    </div>
                    {b.content && (
                      <div style={{ fontSize: isNow ? 15 : 13, color: isNow ? '#e3ddd0' : '#666', marginTop: 2 }}>{b.content}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: isNow ? '#e3ddd0' : '#999' }}>{b.length_minutes}m</div>
                </div>

                {panelOpen && (
                  <div style={{ border: `1px solid ${C.gold}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 14, marginBottom: 8, background: '#fffdf7' }}>
                    {!aiSuggestion && !aiLoading && !gameResult && !gameLoading && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => runAiAction(b, 'skip')} style={aiActionBtnStyle}>⏭️ Skip this lesson</button>
                        <button onClick={() => runAiAction(b, 'engage')} style={aiActionBtnStyle}>⚡ Not landing — re-engage them</button>
                        <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
                          <input
                            value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') runAiAction(b, 'custom') }}
                            placeholder="Generate a lesson on…"
                            style={{ flex: 1, padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }}
                          />
                          <button onClick={() => runAiAction(b, 'custom')} disabled={!aiTopic.trim()} style={{ ...aiActionBtnStyle, opacity: aiTopic.trim() ? 1 : 0.5, cursor: aiTopic.trim() ? 'pointer' : 'not-allowed' }}>
                            Generate
                          </button>
                        </div>
                        <div style={{ width: '100%', borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#888' }}>Or make it a game (QR code, students play on their own devices):</span>
                          <button onClick={() => generateGame(b, 'quiz')} style={aiActionBtnStyle}>🎮 Quiz Game</button>
                          <button onClick={() => generateAndStartLive(b)} style={{ ...aiActionBtnStyle, background: '#4a2a6a', color: '#fff', borderColor: '#4a2a6a' }}>🏆 Live Event</button>
                          <button onClick={() => generateGame(b, 'wordle')} style={aiActionBtnStyle}>🔤 Word Guess</button>
                        </div>
                        <button onClick={() => setAiPanelBlockId(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}>Close</button>
                      </div>
                    )}
                    {aiLoading && <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Generating…</p>}
                    {gameLoading && <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Building your game…</p>}
                    {gameResult && !gameResult.error && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 13, color: '#333', margin: '0 0 10px' }}>Project this QR code — students scan it and play on their own device.</p>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(gameResult.playUrl)}`}
                          alt="Scan to play" style={{ borderRadius: 8, border: `1px solid ${C.border}` }}
                        />
                        <p style={{ fontSize: 11, color: '#888', marginTop: 8, wordBreak: 'break-all' }}>{gameResult.playUrl}</p>
                        {gameResult.gameType === 'quiz' && (
                          <div style={{ marginTop: 4, marginBottom: 4 }}>
                            <button onClick={() => startLiveSession(gameResult.gameId)} disabled={gameLoading} style={{ ...aiActionBtnStyle, background: '#4a2a6a', color: '#fff', borderColor: '#4a2a6a' }}>
                              🏆 Start Shared Live Event Instead
                            </button>
                            <p style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Opens a host screen in a new tab with a join code + live leaderboard — everyone answers together in real time.</p>
                            {gameResult.liveError && <p style={{ fontSize: 11, color: '#a33' }}>{gameResult.liveError}</p>}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                          <button onClick={() => { setGameResult(null); setAiTopic('') }} style={aiActionBtnStyle}>Close</button>
                          <button onClick={() => setAiPanelBlockId(null)} style={{ ...aiActionBtnStyle, background: C.green, color: '#fff', borderColor: C.green }}>Done — back to board</button>
                        </div>
                      </div>
                    )}
                    {gameResult?.error && (
                      <div>
                        <p style={{ fontSize: 13, color: '#a33' }}>Couldn't build the game — {gameResult.error}</p>
                        <button onClick={() => setGameResult(null)} style={aiActionBtnStyle}>Try again</button>
                      </div>
                    )}
                    {aiSuggestion && (
                      <div>
                        {aiSuggestion.title && <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{aiSuggestion.title}</div>}
                        <p style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', margin: '4px 0 10px' }}>{aiSuggestion.content}</p>
                        {aiSuggestion.title && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => applyAiSuggestion(b.id, aiSuggestion)} style={{ ...aiActionBtnStyle, background: C.green, color: '#fff', borderColor: C.green }}>✓ Apply to this block</button>
                            <button onClick={() => { setAiSuggestion(null); setAiTopic('') }} style={aiActionBtnStyle}>Discard</button>
                          </div>
                        )}
                        {!aiSuggestion.title && (
                          <button onClick={() => { setAiSuggestion(null) }} style={aiActionBtnStyle}>Close</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'edit' && (
        <>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          {blocks.length === 0 && (
            <p style={{ fontSize: 13, color: '#888' }}>No blocks yet for this day — add one below, or set up your <a href="/week" style={{ color: C.navy }}>Weekly Schedule</a> template first.</p>
          )}
          {blocks.map((b) => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 8px',
              borderBottom: `1px solid ${C.border}`, background: b.fixed ? '#f7f5f0' : '#fff',
            }}>
              <div style={{ width: 56, fontSize: 12, color: '#888', paddingTop: 4 }}>{b.start_time}</div>

              <div style={{ flex: 1 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <span
                    onClick={() => !b.fixed && setSwappingId(swappingId === b.id ? null : b.id)}
                    style={{ fontWeight: 700, fontSize: 14, color: C.navy, cursor: b.fixed ? 'default' : 'pointer', textDecoration: b.fixed ? 'none' : 'underline dotted' }}
                    title={b.fixed ? 'Fixed block' : 'Click to swap the activity'}
                  >
                    {b.subject}
                  </span>
                  {swappingId === b.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, padding: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 160 }}>
                      {QUICK_ACTIVITIES.map((a) => (
                        <div key={a} onClick={() => swapActivity(b.id, a)}
                          style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 4 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = C.bg}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {a}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 4 }}>
                  {editingId === b.id ? (
                    <textarea
                      autoFocus value={b.content} onChange={(e) => handleContentChange(b.id, 'content', e.target.value)}
                      onBlur={commitEdit}
                      placeholder="What's happening in this block today…"
                      rows={2}
                      style={{ width: '100%', fontSize: 12, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                  ) : (
                    <p
                      onClick={() => setEditingId(b.id)}
                      style={{ fontSize: 12, color: b.content ? '#555' : '#bbb', margin: 0, cursor: 'pointer', minHeight: 16 }}
                    >
                      {b.content || 'Click to add detail…'}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <button onClick={() => handleResize(b.id, 'grow')} title="Expand" style={resizeBtnStyle}>▲</button>
                <span style={{ fontSize: 10, color: '#999' }}>{b.length_minutes}m</span>
                <button onClick={() => handleResize(b.id, 'shrink')} title="Shrink" style={resizeBtnStyle}>▼</button>
              </div>

              {!b.fixed && (
                <button onClick={() => removeBlock(b.id)} title="Remove block" style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>✕</button>
              )}
            </div>
          ))}

          <button onClick={addBlock} style={{ marginTop: 12, padding: '8px 16px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            + Add block
          </button>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <h2 style={{ color: C.navy, fontSize: 16, marginTop: 0 }}>Substitute (TTOC) Notes</h2>
          <p style={{ fontSize: 12, color: '#888', marginTop: -6 }}>Fills the printable TTOC plan for this day, built from the blocks above.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ fontSize: 12 }}>Duty
              <input value={ttocNotes.duty} onChange={(e) => updateTtoc('duty', e.target.value)} onBlur={commitTtoc}
                placeholder="e.g. Morning duty" style={inputStyle} />
            </label>
            <label style={{ fontSize: 12 }}>Reliable students
              <input value={ttocNotes.reliableStudents} onChange={(e) => updateTtoc('reliableStudents', e.target.value)} onBlur={commitTtoc}
                placeholder="Comma-separated names" style={inputStyle} />
            </label>
            <label style={{ fontSize: 12, gridColumn: '1 / -1' }}>Special attention (excited/energetic behavior)
              <input value={ttocNotes.specialAttention} onChange={(e) => updateTtoc('specialAttention', e.target.value)} onBlur={commitTtoc}
                placeholder="Comma-separated names" style={inputStyle} />
            </label>
            <label style={{ fontSize: 12, gridColumn: '1 / -1' }}>Other notes
              <textarea value={ttocNotes.customNotes} onChange={(e) => updateTtoc('customNotes', e.target.value)} onBlur={commitTtoc}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
          </div>
        </div>

        <a href={`/print/ttoc-day?date=${date}`} style={{
          display: 'inline-block', padding: '10px 20px', background: C.gold, color: '#fff', borderRadius: 6,
          fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>
          🖨️ Generate Printable TTOC Plan
        </a>
        </>
        )}
      </div>
    </div>
  )
}

const resizeBtnStyle = { width: 22, height: 18, fontSize: 9, border: `1px solid #ccc`, background: '#fff', borderRadius: 3, cursor: 'pointer', lineHeight: 1, padding: 0 }
const inputStyle = { display: 'block', width: '100%', marginTop: 4, padding: 6, border: '1px solid #e3ddd0', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit' }
const aiActionBtnStyle = { padding: '8px 14px', background: '#fff', border: '1px solid #e3ddd0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#1c3557' }

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
