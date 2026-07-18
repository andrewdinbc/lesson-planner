'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

import { COLORS as C, FONT_BODY } from '@/lib/theme'
import { clampBlock, resolveTrackOverlaps } from '@/lib/timeline'

const WEEK_PX = 34 // width of one week column -- kept simple/uniform per Aj's
// "simplify, don't make it as dense as a real video editor" note, rather
// than zoom levels or a ruler with sub-week snapping.
const TRACK_HEIGHT = 56

export default function TimelinePage() {
  const [blocks, setBlocks] = useState([])
  const [totalWeeks, setTotalWeeks] = useState(36)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [selected, setSelected] = useState(null) // `${subject}::${unit_name}`
  const dragState = useRef(null)
  const trackRefs = useRef({})

  useEffect(() => {
    fetch('/api/teacher-inventories')
      .then((r) => r.json())
      .then((d) => {
        const days = d.inventory?.school_calendar_summary?.daysOfInstruction
        const weeks = days ? Math.round(days / 5) : 36
        setTotalWeeks(weeks)
        return fetch(`/api/timeline?totalWeeks=${weeks}`)
      })
      .then((r) => r.json())
      .then((d) => setBlocks((d.blocks || []).map((b, i) => ({ ...b, _localId: b.id || `${b.subject}::${b.unit_name}::${i}` }))))
      .finally(() => setLoading(false))
  }, [])

  const bySubject = blocks.reduce((acc, b) => {
    (acc[b.subject] ||= []).push(b)
    return acc
  }, {})
  const subjects = Object.keys(bySubject)

  const persist = useCallback((toSave) => {
    setSaving(true)
    fetch('/api/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: toSave }),
    }).finally(() => setSaving(false))
  }, [])

  function weekFromX(x, trackEl) {
    const rect = trackEl.getBoundingClientRect()
    const rel = x - rect.left
    return Math.max(1, Math.min(totalWeeks, Math.round(rel / WEEK_PX) + 1))
  }

  function startDrag(e, block, mode) {
    e.preventDefault()
    e.stopPropagation()
    setSelected(`${block.subject}::${block.unit_name}`)
    dragState.current = {
      id: block._localId,
      subject: block.subject,
      mode, // 'move' | 'resize-left' | 'resize-right'
      startX: e.clientX,
      origStart: block.start_week,
      origEnd: block.end_week,
    }
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragEnd)
  }

  function onDragMove(e) {
    const ds = dragState.current
    if (!ds) return
    const trackEl = trackRefs.current[ds.subject]
    if (!trackEl) return
    const deltaWeeks = Math.round((e.clientX - ds.startX) / WEEK_PX)

    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b._localId !== ds.id) return b
        if (ds.mode === 'move') {
          const width = ds.origEnd - ds.origStart
          const newStart = ds.origStart + deltaWeeks
          return { ...b, start_week: newStart, end_week: newStart + width }
        }
        if (ds.mode === 'resize-left') {
          return { ...b, start_week: ds.origStart + deltaWeeks }
        }
        if (ds.mode === 'resize-right') {
          return { ...b, end_week: ds.origEnd + deltaWeeks }
        }
        return b
      })
      const track = next.filter((b) => b.subject === ds.subject)
      const otherSubjects = next.filter((b) => b.subject !== ds.subject)
      const resolvedTrack = resolveTrackOverlaps(track, ds.id, totalWeeks)
      return [...otherSubjects, ...resolvedTrack]
    })
  }

  function onDragEnd() {
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', onDragEnd)
    const ds = dragState.current
    dragState.current = null
    if (!ds) return
    setBlocks((prev) => {
      persist(prev.filter((b) => b.subject === ds.subject))
      return prev
    })
  }

  async function resetToPriorities() {
    if (!confirm('Reset the timeline to match your current Unit Priorities? Any manual drag/resize changes will be lost.')) return
    setResetting(true)
    try {
      const res = await fetch(`/api/timeline?totalWeeks=${totalWeeks}`, { method: 'DELETE' })
      const data = await res.json()
      setBlocks((data.blocks || []).map((b, i) => ({ ...b, _localId: b.id || `${b.subject}::${b.unit_name}::${i}` })))
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>

  const timelineWidth = totalWeeks * WEEK_PX

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Year Timeline</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0, maxWidth: 640 }}>
          Each row is a subject. Drag a block to move it, or drag its edges to resize. Subjects don't need to run the whole year — leave gaps, or run one subject only half the year and hand the rest to another. Come back and adjust this anytime.
        </p>
        <p style={{ color: '#999', fontSize: 12, marginTop: -6 }}>
          📎 = resources added &nbsp; 📋 = assessment practices added
        </p>

        {blocks.length === 0 && (
          <div style={{ background: '#fdf3e3', border: '1px solid #e8c88a', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13, color: '#7a5a1e' }}>
            No units found yet. Set up your <a href="/units" style={{ color: C.navy }}>Unit Priorities</a> first — the timeline seeds its starting layout from there.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: '#888' }}>{totalWeeks} instructional weeks</span>
          {saving && <span style={{ fontSize: 12, color: '#888' }}>Saving…</span>}
          <a
            href="/print/unit-planner"
            style={{ marginLeft: 'auto', padding: '6px 14px', background: C.gold, color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
          >
            🖨️ Print / Download PDF
          </a>
          <button
            onClick={resetToPriorities} disabled={resetting}
            style={{ padding: '6px 14px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: '#888', cursor: 'pointer' }}
          >
            {resetting ? 'Resetting…' : 'Reset to Priorities'}
          </button>
        </div>

        {subjects.length > 0 && (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'auto', padding: '16px 16px 20px' }}>
            {/* Week ruler */}
            <div style={{ display: 'flex', marginLeft: 140, marginBottom: 6, width: timelineWidth }}>
              {Array.from({ length: totalWeeks }, (_, i) => (
                <div key={i} style={{
                  width: WEEK_PX, flexShrink: 0, fontSize: 9, color: '#aaa', textAlign: 'center',
                  borderLeft: (i + 1) % 4 === 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  {(i + 1) % 4 === 1 ? `Wk ${i + 1}` : ''}
                </div>
              ))}
            </div>

            {subjects.map((subject) => (
              <div key={subject} style={{ display: 'flex', alignItems: 'stretch', marginBottom: 4 }}>
                <div style={{
                  width: 140, flexShrink: 0, display: 'flex', alignItems: 'center',
                  fontSize: 12, fontWeight: 600, color: C.navy, paddingRight: 8,
                }}>
                  {subject}
                </div>
                <div
                  ref={(el) => { trackRefs.current[subject] = el }}
                  style={{
                    position: 'relative', height: TRACK_HEIGHT, width: timelineWidth,
                    background: '#f2f0ea', borderRadius: 6, flexShrink: 0,
                  }}
                >
                  {bySubject[subject].map((b) => {
                    const isSelected = selected === `${subject}::${b.unit_name}`
                    const left = (b.start_week - 1) * WEEK_PX
                    const width = Math.max(WEEK_PX, (b.end_week - b.start_week + 1) * WEEK_PX)
                    return (
                      <div
                        key={b.unit_name}
                        onMouseDown={(e) => startDrag(e, b, 'move')}
                        title={`${b.unit_name} — weeks ${b.start_week}–${b.end_week}`}
                        style={{
                          position: 'absolute', left, width, top: 4, bottom: 4,
                          background: b.color, borderRadius: 5, cursor: 'grab',
                          border: isSelected ? '2px solid #222' : '2px solid transparent',
                          display: 'flex', alignItems: 'center', padding: '0 8px',
                          boxSizing: 'border-box', overflow: 'hidden',
                        }}
                      >
                        <div
                          onMouseDown={(e) => startDrag(e, b, 'resize-left')}
                          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize' }}
                        />
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.unit_name}
                        </span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 3, flexShrink: 0, paddingRight: 10 }}>
                          {b.has_resources && <span title="Has resources" style={{ fontSize: 10 }}>📎</span>}
                          {b.has_assessment && <span title="Has assessment practices" style={{ fontSize: 10 }}>📋</span>}
                        </span>
                        <div
                          onMouseDown={(e) => startDrag(e, b, 'resize-right')}
                          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize' }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
