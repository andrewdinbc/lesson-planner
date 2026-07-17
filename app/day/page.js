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
            ? "Today's Scope & Sequence, built from your Weekly Schedule and this week's Year Timeline units. Meant to stay open on your desk — the current activity highlights automatically."
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
              return (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: isNow ? '18px 16px' : '12px 16px',
                  marginBottom: 8, borderRadius: 8,
                  background: isNow ? C.navy : (b.fixed ? '#f7f5f0' : '#fff'),
                  border: `1px solid ${isNow ? C.navy : C.border}`,
                  boxShadow: isNow ? '0 2px 10px rgba(28,53,87,0.25)' : 'none',
                  transition: 'all 0.3s ease',
                }}>
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

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
