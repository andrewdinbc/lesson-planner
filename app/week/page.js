'use client'
import { useState, useEffect } from 'react'
import Tooltip from '@/components/Tooltip'

import { COLORS as C, FONT_BODY } from '@/lib/theme'
import { currentInstructionalWeek } from '@/lib/assessment-types'
import { activeUnitForSubjectThisWeek } from '@/lib/daily-plan'
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const BREAK_EMOJI = { Lunch: '🍽', Snack: '🍎', Recess: '⛳', Prep: '📎' }

function mondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}
function isoDate(d) { return d.toISOString().slice(0, 10) }

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
    teacher_name: '',
    room_number: '',
    notes: '',
  })
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [dragged, setDragged] = useState(null) // { day, blockId }
  const [classSetup, setClassSetup] = useState(null)
  const [weekNumber, setWeekNumber] = useState(null)
  const [schoolYear, setSchoolYear] = useState('')
  const [timelineBlocks, setTimelineBlocks] = useState([])
  const [weekEvents, setWeekEvents] = useState([])
  const [uploadingType, setUploadingType] = useState(null) // 'meeting_minutes' | 'week_at_a_glance' | null
  const [uploadResult, setUploadResult] = useState(null)

  const monday = mondayOf(new Date())
  const friday = new Date(monday); friday.setDate(friday.getDate() + 4)

  useEffect(() => {
    fetch('/api/weekly-schedule')
      .then((r) => r.json())
      .then((d) => {
        if (d.prefs) setPrefs((p) => ({ ...p, ...d.prefs }))
        if (d.schedule) setSchedule(d.schedule)
      })
      .finally(() => setLoading(false))

    fetch('/api/class-setup').then((r) => r.json()).then((d) => setClassSetup(d.setup || null)).catch(() => {})

    fetch('/api/teacher-inventories').then((r) => r.json()).then((d) => {
      const summary = d.inventory?.school_calendar_summary
      if (summary?.schoolOpeningDate) setWeekNumber(currentInstructionalWeek(summary.schoolOpeningDate))
      if (summary?.schoolYear) setSchoolYear(summary.schoolYear)
    }).catch(() => {})

    fetch('/api/timeline').then((r) => r.json()).then((d) => setTimelineBlocks(d.blocks || [])).catch(() => {})

    fetch(`/api/calendar-events?from=${isoDate(monday)}&to=${isoDate(friday)}`)
      .then((r) => r.json()).then((d) => setWeekEvents(d.events || [])).catch(() => {})
  }, [])

  async function uploadDoc(file, docType) {
    setUploadingType(docType)
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('docType', docType)
    try {
      const res = await fetch('/api/calendar-events/extract', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploadResult(data)
      // refresh this week's events in case any landed in the current week
      fetch(`/api/calendar-events?from=${isoDate(monday)}&to=${isoDate(friday)}`)
        .then((r) => r.json()).then((d) => setWeekEvents(d.events || [])).catch(() => {})
    } catch (e) {
      setUploadResult({ error: e.message })
    } finally {
      setUploadingType(null)
    }
  }

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
      // Pull real subject weights from the Unit Priority sliders
      // (app/units/page.js) rather than an even split - falls back to an
      // even split only if the teacher hasn't set any unit priorities yet.
      const upRes = await fetch('/api/unit-priorities')
      const upData = await upRes.json()
      let unitPriorities = {}
      if (upData.units && upData.units.length) {
        const bySubject = {}
        for (const u of upData.units) {
          if (u.removed) continue
          bySubject[u.subject] = (bySubject[u.subject] || 0) + Number(u.priority)
        }
        const total = Object.values(bySubject).reduce((a, b) => a + b, 0)
        if (total > 0) {
          for (const s in bySubject) unitPriorities[s] = bySubject[s] / total
        }
      }
      if (!Object.keys(unitPriorities).length) {
        unitPriorities = { 'Language Arts': 0.3, Mathematics: 0.3, Science: 0.2, 'Social Studies': 0.2 }
      }
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

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 12px' }}>📅 Weekly Teacher Schedule</h1>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12 }}>
            <label>Teacher Name
              <input value={prefs.teacher_name || ''} onChange={(e) => updatePref('teacher_name', e.target.value)} onBlur={savePrefsOnly}
                style={headerInputStyle} />
            </label>
            <label>Room #
              <input value={prefs.room_number || ''} onChange={(e) => updatePref('room_number', e.target.value)} onBlur={savePrefsOnly}
                style={headerInputStyle} />
            </label>
            <label>Grade / Class
              <div style={{ ...headerInputStyle, background: C.bg, color: '#666' }}>
                {classSetup?.grades?.length ? `Grade ${classSetup.grades.join('/')}` : '—'}
              </div>
            </label>
            <label>Subject Area
              <div style={{ ...headerInputStyle, background: C.bg, color: '#666' }}>
                {classSetup?.subjects?.length ? classSetup.subjects.join(', ') : '—'}
              </div>
            </label>
            <label>Week of
              <div style={{ ...headerInputStyle, background: C.bg, color: '#666' }}>
                {monday.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – {friday.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                {weekNumber && ` (Wk ${weekNumber})`}
              </div>
            </label>
            <label>School Year
              <div style={{ ...headerInputStyle, background: C.bg, color: '#666' }}>{schoolYear || '—'}</div>
            </label>
          </div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h2 style={{ color: C.navy, fontSize: 15, marginTop: 0 }}>📋 Upload from your school</h2>
          <p style={{ fontSize: 12, color: '#888', marginTop: -4 }}>
            Upload staff meeting minutes or your principal's "week at a glance" — dated events (fire drills, assemblies, PD days) are pulled out automatically and slotted into your schedule, bumping whatever was there to the next open spot for that subject.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ fontSize: 12, cursor: 'pointer', padding: '8px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6 }}>
              {uploadingType === 'meeting_minutes' ? 'Reading…' : '📄 Upload Staff Meeting Minutes'}
              <input type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && uploadDoc(e.target.files[0], 'meeting_minutes')} disabled={!!uploadingType} />
            </label>
            <label style={{ fontSize: 12, cursor: 'pointer', padding: '8px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6 }}>
              {uploadingType === 'week_at_a_glance' ? 'Reading…' : '🗓️ Upload Week at a Glance'}
              <input type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && uploadDoc(e.target.files[0], 'week_at_a_glance')} disabled={!!uploadingType} />
            </label>
          </div>
          {uploadResult?.error && <p style={{ fontSize: 12, color: '#a33', marginTop: 8 }}>{uploadResult.error}</p>}
          {uploadResult?.doc && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#333' }}>
              <p style={{ margin: '0 0 6px' }}>{uploadResult.doc.summary}</p>
              {uploadResult.events?.length > 0 && (
                <p style={{ margin: 0, color: '#1a7a3e' }}>
                  ✓ {uploadResult.events.length} event{uploadResult.events.length > 1 ? 's' : ''} added: {uploadResult.events.map((e) => e.title).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {weekEvents.length > 0 && (
          <div style={{ background: '#fdf3e3', border: '1px solid #e8c88a', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <h3 style={{ color: '#7a5a1e', fontSize: 13, margin: '0 0 6px' }}>📌 This week's calendar events</h3>
            {weekEvents.map((ev) => (
              <div key={ev.id} style={{ fontSize: 12, color: '#7a5a1e', marginBottom: 4 }}>
                <strong>{new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short' })}</strong>
                {ev.event_time ? ` ${ev.event_time}` : ''} — {ev.title}
                {ev.bump_note && <span style={{ color: '#a67c00' }}> ({ev.bump_note})</span>}
              </div>
            ))}
          </div>
        )}

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

          <h3 style={{ color: C.navy, fontSize: 14 }}>📋 Notes / Reminders for the Week</h3>
          <textarea value={prefs.notes || ''} onChange={(e) => updatePref('notes', e.target.value)} onBlur={savePrefsOnly}
            rows={3} placeholder="Anything to remember this week…"
            style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', marginBottom: 16 }} />

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
                    {(schedule.grid[day] || []).map((block, idx) => {
                      const activeUnit = weekNumber ? activeUnitForSubjectThisWeek(timelineBlocks, block.subject, weekNumber) : null
                      const emoji = BREAK_EMOJI[block.subject]
                      return (
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
                        <div style={{ fontWeight: 600 }}>{emoji ? `${emoji} ` : ''}{block.label}</div>
                        <div style={{ color: '#888' }}>{block.start_time} · {block.length_minutes}m</div>
                        {activeUnit && (
                          <div style={{ color: C.navy, fontWeight: 600, marginTop: 2, fontSize: 11 }}>📖 {activeUnit.unit_name}</div>
                        )}
                      </div>
                      )
                    })}
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

const headerInputStyle = { display: 'block', width: '100%', marginTop: 4, padding: 6, border: `1px solid #e3ddd0`, borderRadius: 6, fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 28 }

