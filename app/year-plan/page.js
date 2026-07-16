'use client'
import { useState, useEffect, useCallback } from 'react'
import { CURRICULUM_MODELS } from '@/lib/curriculum-models'

import { COLORS as C, FONT_BODY } from '@/lib/theme'

export default function YearPlanPage() {
  const [modelKey, setModelKey] = useState('standards_based')
  const [periods, setPeriods] = useState([])
  const [windows, setWindows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weeksAvailable, setWeeksAvailable] = useState(38)
  const [calendarStatus, setCalendarStatus] = useState('unset') // 'unset' | 'uploading' | 'parsed' | 'defaulted' | 'error'
  const [calendarSummary, setCalendarSummary] = useState(null)
  const [calendarError, setCalendarError] = useState('')

  const load = useCallback((key, weeks) => {
    setLoading(true)
    fetch(`/api/year-plan-lens?model_key=${encodeURIComponent(key)}&weeks=${weeks}`)
      .then((r) => r.json())
      .then((d) => {
        setPeriods(d.periods || [])
        setWindows(d.windows || null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(modelKey, weeksAvailable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey])

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
    setPeriods(data.periods || periods)
    setWindows(data.windows || null)
    setSaving(false)
  }

  const total = periods.reduce((sum, p) => sum + Number(p.period_pct || 0), 0)
  const currentModel = CURRICULUM_MODELS.find((m) => m.key === modelKey)

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
      if (data.summary.daysOfInstruction) {
        const weeks = Math.round(data.summary.daysOfInstruction / 5)
        setWeeksAvailable(weeks)
        load(modelKey, weeks)
        setCalendarStatus('parsed')
      } else {
        setCalendarError("Found the file, but couldn't find a \"Days of instruction\" line in it — enter weeks manually below, or use \"I don't know\" for a rough default.")
        setCalendarStatus('error')
      }
    } catch (err) {
      setCalendarError(err.message)
      setCalendarStatus('error')
    }
  }

  function handleDontKnow() {
    // Rough BC default (~36 instructional weeks / 180 days) -- not tied
    // to any specific district, just a reasonable starting point until
    // the real calendar is uploaded.
    setWeeksAvailable(36)
    load(modelKey, 36)
    setCalendarStatus('defaulted')
    setCalendarSummary(null)
    setCalendarError('')
  }

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
          <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }} title="This determines how your year is structured into periods below.">
            Curriculum lens
          </label>
          <select
            value={modelKey}
            onChange={(e) => setModelKey(e.target.value)}
            style={{ width: '100%', padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14 }}
          >
            {CURRICULUM_MODELS.map((m) => (
              <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>
            ))}
          </select>
          {currentModel && <p style={{ fontSize: 12, color: '#888', marginTop: 8, marginBottom: 0 }}>{currentModel.summary}</p>}
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Instructional weeks available this year</div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <label
              title={`Upload your district's school calendar PDF -- we'll read the "Days of instruction" line and calculate weeks for you.`}
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
              title="Use a rough BC-wide default (36 weeks) until you upload your real calendar"
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
              ✓ Found {calendarSummary.daysOfInstruction} instructional days → {weeksAvailable} weeks.
              {calendarSummary.schoolOpening && ` Opens ${calendarSummary.schoolOpening}.`}
              {calendarSummary.lastDayOfSchool && ` Last day ${calendarSummary.lastDayOfSchool}.`}
            </div>
          )}
          {calendarStatus === 'defaulted' && (
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>
              Using a rough default of 36 weeks — upload your real calendar above anytime to replace this.
            </p>
          )}

          <label style={{ fontSize: 13 }} title="Same value used on the Unit Priorities page — keep these in sync. Auto-filled by the calendar upload above, but you can still edit it directly.">
            Or enter manually:
            <input
              type="number" value={weeksAvailable}
              onChange={(e) => {
                const v = Number(e.target.value)
                setWeeksAvailable(v)
                load(modelKey, v)
                setCalendarStatus('unset')
              }}
              style={{ marginLeft: 10, width: 80, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }}
            />
          </label>
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
            {periods.map((p) => {
              const w = windows ? windows.find((win) => win.period_label === p.period_label) : null
              return (
                <div key={p.period_label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 14 }}>{p.period_label}</span>
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
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={save} disabled={saving || loading}
          title="Normalizes all periods to sum to 100% and saves your allocation."
          style={{ padding: '10px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save Year Structure'}
        </button>
      </div>
    </div>
  )
}



// trigger redeploy
