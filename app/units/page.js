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
  const [populating, setPopulating] = useState(false)
  const [populateResult, setPopulateResult] = useState(null)
  // 'checking' | 'missing' | 'present' | 'skipped-by-user'
  const [classSetupStatus, setClassSetupStatus] = useState('checking')
  const [expandedCompetency, setExpandedCompetency] = useState({}) // `${subject}::${unit_name}` -> bool

  async function populateFromCurriculum() {
    setPopulating(true)
    setPopulateResult(null)
    try {
      const res = await fetch('/api/unit-priorities/populate-from-curriculum', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to populate from curriculum')
      setUnits(data.units || [])
      setPopulateResult(data.results)
    } catch (e) {
      setPopulateResult({ error: e.message })
    } finally {
      setPopulating(false)
    }
  }

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

    // AI curriculum generation (both the Populate button here and plan
    // generation elsewhere) needs to know grade + subject to be grounded
    // in anything real -- surface that clearly rather than letting the
    // Populate button just silently do nothing/fail later.
    fetch('/api/class-setup')
      .then((r) => r.json())
      .then((d) => setClassSetupStatus(d.setup ? 'present' : 'missing'))
      .catch(() => setClassSetupStatus('missing'))
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

        {classSetupStatus === 'missing' && (
          <div style={{ background: '#fdf3e3', border: '1px solid #e8c88a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#7a5a1e', margin: '0 0 10px' }}>
              In order for AI to generate this information, we need to know what grade and subject you teach. Would you like to fill that out now?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href="/class-setup" style={{
                padding: '8px 16px', background: C.navy, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
                Yes, fill it out
              </a>
              <button
                onClick={() => setClassSetupStatus('skipped-by-user')}
                style={{ padding: '8px 16px', background: 'none', color: '#7a5a1e', border: `1px solid #e8c88a`, borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {classSetupStatus === 'skipped-by-user' && (
          <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: '#a33' }}>
            AI generation isn't possible without your grade and subject — you can still set units and priorities manually below, and fill this out later from the Dashboard.
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <button
            onClick={populateFromCurriculum} disabled={populating || classSetupStatus !== 'present'}
            title={classSetupStatus !== 'present' ? 'Fill out "What do you teach?" first' : 'Pulls real content from curriculum.gov.bc.ca for your grade(s) and groups it into units automatically -- for Language Arts, Math, Science, and Social Studies. Split grades are supported.'}
            style={{
              padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6,
              fontWeight: 600, fontSize: 13,
              cursor: (populating || classSetupStatus !== 'present') ? 'not-allowed' : 'pointer',
              opacity: (populating || classSetupStatus !== 'present') ? 0.5 : 1,
            }}
          >
            {populating ? 'Pulling from BC Curriculum… (can take up to a minute)' : '📖 Populate from BC Curriculum'}
          </button>
          {populateResult?.error && (
            <p style={{ fontSize: 12, color: '#a33', marginTop: 8 }}>{populateResult.error}</p>
          )}
          {populateResult?.populated && (
            <div style={{ fontSize: 12, color: '#1a7a3e', marginTop: 8 }}>
              ✓ {populateResult.populated.map((p) => `${p.subject} (${p.unitCount} units, grade${p.grades.length > 1 ? 's' : ''} ${p.grades.join('/')})`).join(', ')}
              {populateResult.skipped?.length > 0 && (
                <div style={{ color: '#a67c00', marginTop: 4 }}>
                  Skipped: {populateResult.skipped.map((s) => `${s.subject} (${s.reason})`).join('; ')}
                </div>
              )}
            </div>
          )}
        </div>

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
              {subjectUnits.map((u) => {
                const key = `${subject}::${u.unit_name}`
                const isExpanded = expandedCompetency[key]
                return (
                  <div key={u.unit_name} style={{ marginBottom: 12, opacity: u.removed ? 0.4 : 1, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="checkbox" checked={!u.removed} onChange={(e) => updateUnit(subject, u.unit_name, 'removed', !e.target.checked)} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                        {u.unit_name}
                        {u.grades?.length > 0 && <span style={{ fontSize: 11, color: '#999', marginLeft: 6, fontWeight: 400 }}>(Gr. {u.grades.join('/')})</span>}
                      </span>
                      <input
                        type="range" min="0.25" max="3" step="0.25" value={u.priority} disabled={u.removed}
                        onChange={(e) => updateUnit(subject, u.unit_name, 'priority', Number(e.target.value))}
                        style={{ width: 140 }}
                      />
                      <span style={{ fontSize: 12, color: '#888', width: 32 }}>{u.priority}×</span>
                    </div>

                    {/* Content is the primary focus, per Aj's instruction -- shown
                        directly, not hidden behind hover or a toggle. Curricular
                        Competency stays collapsed by default underneath it. */}
                    {u.content_summary && (
                      <p style={{ fontSize: 12, color: '#555', marginTop: 6, marginLeft: 30, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {u.content_summary}
                      </p>
                    )}

                    {u.curricular_competency && (
                      <div style={{ marginLeft: 30, marginTop: 6 }}>
                        <button
                          onClick={() => setExpandedCompetency((prev) => ({ ...prev, [key]: !prev[key] }))}
                          style={{ background: 'none', border: 'none', color: C.navy, fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          {isExpanded ? '▾ Hide' : '▸ Show'} Curricular Competency
                        </button>
                        {isExpanded && (
                          <p style={{ fontSize: 12, color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>{u.curricular_competency}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        <button onClick={save} disabled={saving} style={{ padding: '10px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save Priorities'}
        </button>
      </div>
    </div>
  )
}
