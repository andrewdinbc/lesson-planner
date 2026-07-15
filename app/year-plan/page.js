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
          <label style={{ fontSize: 13 }} title="Same value used on the Unit Priorities page — keep these in sync.">
            Instructional weeks available this year
            <input
              type="number" value={weeksAvailable}
              onChange={(e) => {
                const v = Number(e.target.value)
                setWeeksAvailable(v)
                load(modelKey, v)
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
