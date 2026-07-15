'use client'
import { useState, useEffect } from 'react'
import Tooltip from '@/components/Tooltip'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function WeekPage() {
  const [prefs, setPrefs] = useState({
    school_start_time: '08:45',
    school_end_time: '14:45',
    lunch_start_time: '11:45',
    lunch_duration_minutes: 45,
    block_length_minutes: 45,
    prep_periods_per_week: 3,
    am_core_preference: true,
    fixed_blocks: [],
  })
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [dragged, setDragged] = useState(null) // { day, blockId }

  useEffect(() => {
    fetch('/api/weekly-schedule')
      .then((r) => r.json())
      .then((d) => {
        if (d.prefs) setPrefs((p) => ({ ...p, ...d.prefs }))
        if (d.schedule) setSchedule(d.schedule)
      })
      .finally(() => setLoading(false))
  }, [])

  function updatePref(key, value) {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  function addFixedBlock() {
    setPrefs((p) => ({
      ...p,
      fixed_blocks: [...p.fixed_blocks, { subject: 'PE', day: 'Mon', start_time: '09:30', length_minutes: 45, label: 'PE' }],
    }))
  }
  function updateFixedBlock(i, field, value) {
    setPrefs((p) => {
      const fb = [...p.fixed_blocks]
      fb[i] = { ...fb[i], [field]: value }
      return { ...p, fixed_blocks: fb }
    })
  }
  function removeFixedBlock(i) {
    setPrefs((p) => ({ ...p, fixed_blocks: p.fixed_blocks.filter((_, idx) => idx !== i) }))
  }

  async function savePrefsOnly() {
    setError('')
    const res = await fetch('/api/weekly-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefs }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Save failed')
  }

  async function generate() {
    setError(''); setGenerating(true)
    try {
      await savePrefsOnly()
      // even split across LA/Math/Science/SS as a starting default until
      // the Unit Priority sliders feed real weights in
      const unitPriorities = { 'Language Arts': 0.3, Mathematics: 0.3, Science: 0.2, 'Social Studies': 0.2 }
      const res = await fetch('/api/weekly-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate: true, unitPriorities }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setSchedule(data.schedule)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  function onDrop(day, dropIndex) {
    if (!dragged || dragged.day !== day) { setDragged(null); return }
    const dayBlocks = schedule.grid[day]
    const fromIndex = dayBlocks.findIndex((b) => b.id === dragged.blockId)
    if (fromIndex === -1) { setDragged(null); return }
    const reordered = [...dayBlocks]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    // recompute times sequentially, honoring fixed anchors
    let cursor = null
    const recomputed = reordered.map((b) => {
      if (b.fixed) { cursor = null; return b }
      if (cursor === null) {
        const [h, m] = b.start_time.split(':').map(Number)
        cursor = h * 60 + m
      }
      const start_time = `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`
      cursor += b.length_minutes
      return { ...b, start_time }
    })
    const newGrid = { ...schedule.grid, [day]: recomputed }
    setSchedule({ ...schedule, grid: newGrid })
    setDragged(null)
    fetch('/api/weekly-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid: newGrid, scheduleId: schedule.id }),
    })
  }

  if (loading) return <div style={{ padding: 32, fontFamily: 'Georgia, serif' }}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 20px' }}>Weekly Schedule Builder</h1>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h2 style={{ color: C.navy, fontSize: 16, marginTop: 0 }}>Schedule Setup</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <label style={{ fontSize: 13 }}>School start
              <input type="time" value={prefs.school_start_time} onChange={(e) => updatePref('school_start_time', e.target.value)}
                style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13 }}>School end
              <input type="time" value={prefs.school_end_time} onChange={(e) => updatePref('school_end_time', e.target.value)}
                style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13 }}>Block length (min)
              <input type="number" value={prefs.block_length_minutes} onChange={(e) => updatePref('block_length_minutes', Number(e.target.value))}
                style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13 }}>Lunch start
              <input type="time" value={prefs.lunch_start_time} onChange={(e) => updatePref('lunch_start_time', e.target.value)}
                style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13 }}>Lunch length (min)
              <input type="number" value={prefs.lunch_duration_minutes} onChange={(e) => updatePref('lunch_duration_minutes', Number(e.target.value))}
                style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13 }}>Prep periods / week
              <input type="number" value={prefs.prep_periods_per_week} onChange={(e) => updatePref('prep_periods_per_week', Number(e.target.value))}
                style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 4 }} />
            </label>
          </div>

          <Tooltip text="When on, Literacy and Numeracy get first claim on morning slots before other subjects.">
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <input type="checkbox" checked={prefs.am_core_preference} onChange={(e) => updatePref('am_core_preference', e.target.checked)} />
              Core subjects (Literacy/Numeracy) in the morning
            </label>
          </Tooltip>

          <h3 style={{ color: C.navy, fontSize: 14 }}>Fixed blocks (PE, Library, non-contact, banded literacy…)</h3>
          {prefs.fixed_blocks.map((fb, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={fb.label} onChange={(e) => updateFixedBlock(i, 'label', e.target.value)} placeholder="Label"
                style={{ flex: 2, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }} />
              <select value={fb.day} onChange={(e) => updateFixedBlock(i, 'day', e.target.value)}
                style={{ flex: 1, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input type="time" value={fb.start_time} onChange={(e) => updateFixedBlock(i, 'start_time', e.target.value)}
                style={{ flex: 1, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }} />
              <input type="number" value={fb.length_minutes} onChange={(e) => updateFixedBlock(i, 'length_minutes', Number(e.target.value))}
                style={{ width: 70, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }} />
              <button onClick={() => removeFixedBlock(i)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button onClick={addFixedBlock} style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
            + Add fixed block
          </button>

          {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: '#c0392b', marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={savePrefsOnly} style={{ padding: '10px 20px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
              Save Setup
            </button>
            <button onClick={generate} disabled={generating} style={{ padding: '10px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
              {generating ? 'Populating…' : 'Populate Weekly Schedule'}
            </button>
          </div>
        </div>

        {schedule && (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
            <h2 style={{ color: C.navy, fontSize: 16, marginTop: 0 }}>{schedule.week_label}</h2>
            <p style={{ fontSize: 12, color: '#888', marginTop: -8 }}>Drag a block to reposition it — everything else in that day shifts to make room.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {DAYS.map((day) => (
                <div key={day}>
                  <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6, textAlign: 'center' }}>{day}</div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(day, schedule.grid[day].length)}
                    style={{ minHeight: 300, border: `1px dashed ${C.border}`, borderRadius: 6, padding: 4 }}
                  >
                    {(schedule.grid[day] || []).map((block, idx) => (
                      <div
                        key={block.id}
                        draggable={!block.fixed}
                        onDragStart={() => setDragged({ day, blockId: block.id })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.stopPropagation(); onDrop(day, idx) }}
                        style={{
                          background: block.fixed ? '#eee' : block.subject === 'Language Arts' || block.subject === 'Mathematics' ? '#e8f3ec' : '#fdf6ea',
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          padding: '6px 8px',
                          marginBottom: 4,
                          fontSize: 12,
                          cursor: block.fixed ? 'default' : 'grab',
                          opacity: block.fixed ? 0.85 : 1,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{block.label}</div>
                        <div style={{ color: '#888' }}>{block.start_time} · {block.length_minutes}m</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
