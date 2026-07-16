'use client'
import { useState, useEffect } from 'react'

import { COLORS as C, FONT_BODY } from '@/lib/theme'
const ALWAYS_HIGH_SCRUTINY = ['Language Arts', 'Mathematics']

export default function UnitsPage() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mismatch, setMismatch] = useState(null)
  // Default of 36 weeks matches a real BC district calendar (Cowichan
  // Valley SD, 2025-26: 180 instructional days / 5) rather than an
  // arbitrary round number -- used only until the teacher's own uploaded
  // calendar (from the Year Plan page) is available, which always wins.
  const [weeksAvailable, setWeeksAvailable] = useState(36)
  const [weeksSource, setWeeksSource] = useState('default') // 'default' | 'calendar'

  useEffect(() => {
    fetch('/api/unit-priorities')
      .then((r) => r.json())
      .then((d) => setUnits(d.units || []))
      .finally(() => setLoading(false))

    // Same source of truth as the Year Plan page's calendar upload --
    // teacher_inventories.school_calendar_summary. If they've already
    // uploaded their real district calendar there, use it here too
    // instead of duplicating the upload UI on this page.
    fetch('/api/teacher-inventories')
      .then((r) => r.json())
      .then((d) => {
        const days = d.inventory?.school_calendar_summary?.daysOfInstruction
        if (days) {
          setWeeksAvailable(Math.round(days / 5))
          setWeeksSource('calendar')
        }
      })
      .catch(() => {})
  }, [])

  const bySubject = units.reduce((acc, u) => {
    (acc[u.subject] ||= []).push(u)
    return acc
  }, {})

  function updateUnit(subject, unit_name, field, value) {
    setUnits((prev) => prev.map((u) => (u.subject === subject && u.unit_name === unit_name ? { ...u, [field]: value } : u)))
  }

  async function save() {
    setSaving(true)
    const updates = units.map((u) => ({ subject: u.subject, unit_name: u.unit_name, priority: u.priority, high_scrutiny: u.high_scrutiny, removed: u.removed }))
    const res = await fetch('/api/unit-priorities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, totalInstructionalWeeksAvailable: weeksAvailable }),
    })
    const data = await res.json()
    setMismatch(data.mismatch)
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Unit Priorities</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
          All units start at equal priority. Raise a slider to give a unit more time this year (e.g. Fractions or Algebra typically need more than others). Uncheck a unit to remove it from this year's plan.
        </p>

        {mismatch && (
          <div style={{ background: '#fdf3e3', border: '1px solid #e8c88a', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: '#7a5a1e' }}>
            ⚠️ {mismatch.message}
          </div>
        )}

        {Object.entries(bySubject).map(([subject, subjectUnits]) => {
          const isHighScrutiny = ALWAYS_HIGH_SCRUTINY.includes(subject) || subjectUnits.some((u) => u.high_scrutiny)
          return (
            <div key={subject} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ color: C.navy, fontSize: 16, margin: 0 }}>{subject}</h2>
                {!ALWAYS_HIGH_SCRUTINY.includes(subject) && (
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#888' }}>
                    <input
                      type="checkbox"
                      checked={isHighScrutiny}
                      onChange={(e) => subjectUnits.forEach((u) => updateUnit(subject, u.unit_name, 'high_scrutiny', e.target.checked))}
                    />
                    Give this subject extra scrutiny
                  </label>
                )}
              </div>
              {subjectUnits.map((u) => (
                <div key={u.unit_name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, opacity: u.removed ? 0.4 : 1 }}>
                  <input type="checkbox" checked={!u.removed} onChange={(e) => updateUnit(subject, u.unit_name, 'removed', !e.target.checked)} />
                  <span style={{ flex: 1, fontSize: 14 }}>{u.unit_name}</span>
                  <input
                    type="range" min="0.25" max="3" step="0.25" value={u.priority} disabled={u.removed}
                    onChange={(e) => updateUnit(subject, u.unit_name, 'priority', Number(e.target.value))}
                    style={{ width: 140 }}
                  />
                  <span style={{ fontSize: 12, color: '#888', width: 32 }}>{u.priority}×</span>
                </div>
              ))}
            </div>
          )
        })}

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <label style={{ fontSize: 13 }}>
            Instructional weeks available this year
            <input
              type="number" value={weeksAvailable}
              onChange={(e) => { setWeeksAvailable(Number(e.target.value)); setWeeksSource('manual') }}
              style={{ marginLeft: 10, width: 80, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }}
            />
          </label>
          <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>
            {weeksSource === 'calendar' && '✓ From your uploaded district calendar (set on the Year Plan page).'}
            {weeksSource === 'default' && "Using a standard 36-week default until you upload your district calendar on the Year Plan page."}
            {weeksSource === 'manual' && 'Manually overridden.'}
          </p>
        </div>

        <button onClick={save} disabled={saving} style={{ padding: '10px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save Priorities'}
        </button>
      </div>
    </div>
  )
}

