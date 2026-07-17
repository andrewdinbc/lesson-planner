'use client'
import { useState, useEffect, useCallback } from 'react'
import { CURRICULUM_MODELS } from '@/lib/curriculum-models'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { useRouter } from 'next/navigation'

import { COLORS as C, FONT_BODY } from '@/lib/theme'

// Weeks are derived from start/end date, counting weekdays only (Mon-Fri)
// and dividing by 5 -- an approximation that doesn't subtract holidays
// inside the range, same acknowledged approximation as the previous
// raw-number input, just driven by dates now instead of asking the
// teacher to do that math themselves.
function weekdaysBetween(startStr, endStr) {
  if (!startStr || !endStr) return 0
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  if (end < start) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Default "I don't know" range: Sept 1 of the school year currently
// underway (or about to start) through June 30 the following year.
// Not tied to any specific district -- just a reasonable BC-wide default.
function defaultSchoolYearRange() {
  const now = new Date()
  const month = now.getMonth() // 0-indexed, so August = 7
  const startYear = month >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return {
    start: `${startYear}-09-01`,
    end: `${startYear + 1}-06-30`,
  }
}

export default function YearPlanPage() {
  const authChecked = useRequireAuth()
  const router = useRouter()
  const [modelKey, setModelKey] = useState('subject_centered')
  const [periods, setPeriods] = useState([])
  const [windows, setWindows] = useState(null)
  const [teacherGrades, setTeacherGrades] = useState([])
  const [newSubjectName, setNewSubjectName] = useState('')
  const [addingSubject, setAddingSubject] = useState(false)
  const [openQA, setOpenQA] = useState(null) // period_label currently expanded
  const [moreSubjectsOpen, setMoreSubjectsOpen] = useState(false) // expandable section for smaller-share subjects
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaAnswer, setQaAnswer] = useState('')
  const [qaLoading, setQaLoading] = useState(false)

  async function askSubjectQA(periodLabel) {
    if (!qaQuestion.trim()) return
    setQaLoading(true)
    setQaAnswer('')
    try {
      const res = await fetch('/api/year-plan/subject-qa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qaQuestion.trim(), subject: periodLabel, grade: teacherGrades.join('/'), modelKey }),
      })
      const data = await res.json()
      setQaAnswer(data.answer || data.error || 'No answer returned.')
    } catch (e) {
      setQaAnswer("Couldn't reach the AI — try again in a moment.")
    } finally {
      setQaLoading(false)
    }
  }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [calendarStatus, setCalendarStatus] = useState('unset') // 'unset' | 'uploading' | 'parsed' | 'defaulted' | 'error'
  const [calendarSummary, setCalendarSummary] = useState(null)
  const [calendarError, setCalendarError] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const weeksAvailable = Math.round(weekdaysBetween(startDate, endDate) / 5) || 38

  const load = useCallback((key, weeks) => {
    setLoading(true)
    fetch(`/api/year-plan-lens?model_key=${encodeURIComponent(key)}&weeks=${weeks}`)
      .then((r) => r.json())
      .then((d) => {
        setPeriods(d.periods || [])
        setWindows(d.windows || null)
        setTeacherGrades(d.grades || [])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(modelKey, weeksAvailable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey])

  useEffect(() => {
    if (startDate && endDate) load(modelKey, weeksAvailable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  function updatePeriodPct(periodLabel, value) {
    setPeriods((prev) => prev.map((p) => (p.period_label === periodLabel ? { ...p, period_pct: value } : p)))
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/year-plan-lens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_key: modelKey,
        periods: periods.map((p) => ({ period_label: p.period_label, period_pct: p.period_pct })),
        totalInstructionalWeeksAvailable: weeksAvailable,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) return
    // Save & Continue -- previously this just saved and sat there with no
    // next step. Moves the teacher forward to Unit Priorities, which is
    // the natural next stage after the year's overall structure is set.
    router.push('/units')
  }

  async function addSubject() {
    if (!newSubjectName.trim()) return
    setAddingSubject(true)
    try {
      const res = await fetch('/api/year-plan-lens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_key: modelKey, period_label: newSubjectName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setPeriods(data.periods || periods)
        setNewSubjectName('')
      }
    } finally {
      setAddingSubject(false)
    }
  }

  const total = periods.reduce((sum, p) => sum + Number(p.period_pct || 0), 0)
  const currentModel = CURRICULUM_MODELS.find((m) => m.key === modelKey)

  // Auto-expand Advanced if the currently selected/saved lens lives there,
  // so a returning teacher's choice isn't hidden behind the collapsed section.
  useEffect(() => {
    if (currentModel?.tier === 'advanced') setAdvancedOpen(true)
  }, [currentModel])
  const basicModels = CURRICULUM_MODELS.filter((m) => m.tier === 'basic')
  const advancedModels = CURRICULUM_MODELS.filter((m) => m.tier === 'advanced')

  async function handleCalendarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCalendarStatus('uploading')
    setCalendarError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/school-calendar', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not read that PDF')
      setCalendarSummary(data.summary)
      if (data.summary.schoolOpeningDate && data.summary.lastDayDate) {
        setStartDate(data.summary.schoolOpeningDate)
        setEndDate(data.summary.lastDayDate)
        setCalendarStatus('parsed')
      } else if (data.summary.daysOfInstruction) {
        // Fallback: no dates found, but we do have a day count -- use
        // today's default range shape and just note the day count instead.
        const { start, end } = defaultSchoolYearRange()
        setStartDate(start)
        setEndDate(end)
        setCalendarStatus('parsed')
      } else {
        setCalendarError("Found the file, but couldn't find dates or a \"Days of instruction\" line in it -- enter the start/end dates manually below, or use \"I don't know\" for a rough default.")
        setCalendarStatus('error')
      }
    } catch (err) {
      setCalendarError(err.message)
      setCalendarStatus('error')
    }
  }

  function handleDontKnow() {
    const { start, end } = defaultSchoolYearRange()
    setStartDate(start)
    setEndDate(end)
    setCalendarStatus('defaulted')
    setCalendarSummary(null)
    setCalendarError('')
  }

  if (!authChecked) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Year Plan</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
          Choose the lens your year is organized around, then adjust how much of the year each period gets.
          Raising one period pulls proportionally from the others so the year always adds up to 100%.
          This changes grouping, framing, and time-weighting only — total instructional hours, term dates, and
          your fixed Weekly Schedule blocks stay exactly as set elsewhere.
        </p>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 10 }} title="This determines how your year is structured into periods below.">
            Curriculum lens — each option's one-line meaning is shown beside it
          </label>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', margin: '4px 0 6px' }}>
            Basic — close to how most teachers already plan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {basicModels.map((m) => (
              <button
                key={m.key} type="button" onClick={() => setModelKey(m.key)}
                title={m.summary}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 12px',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  border: `1px solid ${modelKey === m.key ? C.gold : C.border}`,
                  background: modelKey === m.key ? '#fff8ee' : '#fff',
                }}
              >
                <span style={{ fontSize: 18 }}>{m.emoji}</span>
                <span style={{ fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' }}>
                  {m.label}
                </span>
                {m.popular && (
                  <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ⭐ Popular
                  </span>
                )}
                <span style={{ color: '#888', fontSize: 12 }}>— {m.oneLine}</span>
              </button>
            ))}
          </div>

          <button
            type="button" onClick={() => setAdvancedOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', margin: '4px 0 6px', padding: 0,
            }}
          >
            <span style={{ display: 'inline-block', transform: advancedOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
            Advanced — a bigger structural shift {advancedOpen ? '' : `(${advancedModels.length})`}
          </button>
          {advancedOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {advancedModels.map((m) => (
                <button
                  key={m.key} type="button" onClick={() => setModelKey(m.key)}
                  title={m.summary}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '10px 12px',
                    borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    border: `1px solid ${modelKey === m.key ? C.gold : C.border}`,
                    background: modelKey === m.key ? '#fff8ee' : '#fff',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <span style={{ fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' }}>{m.label}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>— {m.oneLine}</span>
                </button>
              ))}
            </div>
          )}

          {currentModel && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{currentModel.summary}</p>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>School year dates</div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <label
              title={`Upload your district's school calendar PDF -- we'll read the start/end dates and calculate weeks for you.`}
              style={{
                display: 'inline-block', padding: '8px 16px', background: C.gold, color: '#fff', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              📅 Upload district calendar (PDF)
              <input type="file" accept="application/pdf" onChange={handleCalendarUpload} style={{ display: 'none' }} />
            </label>

            <button
              onClick={handleDontKnow}
              title="Use a rough Sept 1 - June 30 default until you upload your real calendar"
              style={{
                padding: '8px 16px', background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              I don't know
            </button>
          </div>

          {calendarStatus === 'uploading' && <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>Reading your calendar…</p>}
          {calendarStatus === 'error' && <p style={{ fontSize: 12, color: '#a33', margin: '0 0 10px' }}>{calendarError}</p>}
          {calendarStatus === 'parsed' && calendarSummary && (
            <div style={{ fontSize: 12, color: '#1a7a3e', margin: '0 0 10px', background: '#eef8f0', padding: '8px 12px', borderRadius: 6 }}>
              ✓ Set from your calendar{calendarSummary.daysOfInstruction ? ` (${calendarSummary.daysOfInstruction} instructional days on file)` : ''}.
            </div>
          )}
          {calendarStatus === 'defaulted' && (
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>
              Using a rough Sept 1 – June 30 default — upload your real calendar above anytime to replace this.
            </p>
          )}

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13 }}>
              First day of school
              <input
                type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCalendarStatus('unset') }}
                style={{ display: 'block', marginTop: 4, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Last day of school
              <input
                type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCalendarStatus('unset') }}
                style={{ display: 'block', marginTop: 4, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }}
              />
            </label>
            <div style={{ fontSize: 13, color: '#888' }}>
              ≈ <strong style={{ color: C.navy }}>{weeksAvailable}</strong> instructional weeks
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Loading…</div>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ color: C.navy, fontSize: 16, margin: 0 }}>Year Structure</h2>
              <span style={{ fontSize: 12, color: Math.round(total) === 100 ? C.green : C.gold }}>
                {Math.round(total)}% allocated
              </span>
            </div>
            {(() => {
              // Subjects below this share of the year are secondary (electives,
              // rotary blocks, etc.) and collapse into an expandable section at
              // the bottom instead of competing for space with the core subjects.
              const PRIMARY_THRESHOLD_PCT = 15
              const primaryPeriods = periods.filter((p) => Number(p.period_pct) >= PRIMARY_THRESHOLD_PCT)
              const secondaryPeriods = periods.filter((p) => Number(p.period_pct) < PRIMARY_THRESHOLD_PCT)

              const renderPeriod = (p) => {
                const w = windows ? windows.find((win) => win.period_label === p.period_label) : null
                return (
                  <div key={p.period_label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ flex: 1, fontSize: 14 }}>
                        {p.period_label}
                        {teacherGrades.length > 0 && modelKey === 'subject_centered' && (
                          <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>
                            (Grade{teacherGrades.length > 1 ? 's' : ''} {teacherGrades.join('/')})
                          </span>
                        )}
                      </span>
                      <input
                        type="range" min="5" max="70" step="1" value={Math.round(p.period_pct)}
                        onChange={(e) => updatePeriodPct(p.period_label, Number(e.target.value))}
                        style={{ width: 160 }}
                        title="Adjust this period's share of the year. Other periods rebalance proportionally when you save."
                      />
                      <span style={{ fontSize: 12, color: '#888', width: 40 }}>{Math.round(p.period_pct)}%</span>
                    </div>
                    {w && (
                      <div style={{ fontSize: 11, color: '#999', marginLeft: 0, marginTop: 2 }}>
                        Weeks {w.startWeek}–{w.endWeek} ({w.weekCount} weeks)
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const isOpen = openQA === p.period_label
                        setOpenQA(isOpen ? null : p.period_label)
                        if (!isOpen) { setQaQuestion(''); setQaAnswer('') }
                      }}
                      style={{ background: 'none', border: 'none', color: C.navy, fontSize: 11, cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}
                    >
                      {openQA === p.period_label ? '▾ Hide' : '▸ Ask AI about'} {p.period_label}
                    </button>

                    {openQA === p.period_label && (
                      <div style={{ background: '#f7f5f0', border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={qaQuestion} onChange={(e) => setQaQuestion(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') askSubjectQA(p.period_label) }}
                            placeholder={`e.g. "What should ${p.period_label} cover this term?"`}
                            style={{ flex: 1, padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }}
                          />
                          <button
                            onClick={() => askSubjectQA(p.period_label)}
                            disabled={qaLoading || !qaQuestion.trim()}
                            style={{
                              padding: '8px 14px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6,
                              fontSize: 12, fontWeight: 600, cursor: qaQuestion.trim() ? 'pointer' : 'not-allowed',
                              opacity: qaQuestion.trim() ? 1 : 0.5,
                            }}
                          >
                            {qaLoading ? 'Asking…' : 'Ask'}
                          </button>
                        </div>
                        {qaAnswer && (
                          <p style={{ fontSize: 13, color: '#333', marginTop: 10, marginBottom: 0, whiteSpace: 'pre-wrap' }}>{qaAnswer}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <>
                  {primaryPeriods.map(renderPeriod)}

                  {secondaryPeriods.length > 0 && (
                    <div style={{ marginTop: primaryPeriods.length > 0 ? 8 : 0 }}>
                      <button
                        type="button"
                        onClick={() => setMoreSubjectsOpen((v) => !v)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', margin: '4px 0 10px', padding: 0,
                        }}
                      >
                        <span style={{ display: 'inline-block', transform: moreSubjectsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
                        More subjects {moreSubjectsOpen ? '' : `(${secondaryPeriods.length})`}
                      </button>
                      {moreSubjectsOpen && secondaryPeriods.map(renderPeriod)}
                    </div>
                  )}
                </>
              )
            })()}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <input
                value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Add another subject…"
                onKeyDown={(e) => { if (e.key === 'Enter') addSubject() }}
                style={{ flex: 1, padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }}
              />
              <button
                onClick={addSubject} disabled={addingSubject || !newSubjectName.trim()}
                style={{
                  padding: '8px 16px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6,
                  fontSize: 13, fontWeight: 600, cursor: newSubjectName.trim() ? 'pointer' : 'not-allowed',
                  opacity: newSubjectName.trim() ? 1 : 0.5,
                }}
              >
                {addingSubject ? 'Adding…' : '+ Add Subject'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={save} disabled={saving || loading}
          title="Normalizes all periods to sum to 100% and saves your allocation."
          style={{ padding: '10px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  )
}





