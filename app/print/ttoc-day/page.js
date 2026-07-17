'use client'
import { useState, useEffect } from 'react'
import { COLORS as C, FONT_BODY, FONT_BRAND } from '@/lib/theme'
import { buildTtocPlan } from '@/lib/daily-plan'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TtocDayPrintPage() {
  const [date, setDate] = useState('')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('date') || new Date().toISOString().slice(0, 10)
    setDate(d)
    fetch(`/api/daily-plan?date=${d}`)
      .then((r) => r.json())
      .then((data) => setPlan(data.plan))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>
  if (!plan) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>No plan found for this date.</div>

  const dayName = DAY_NAMES[new Date(date + 'T00:00:00').getDay()]
  const ttoc = buildTtocPlan(dayName, plan.blocks || [], plan.ttoc_notes)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print" style={{ padding: '16px 32px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href={`/day?date=${date}`} style={{ color: C.navy, fontSize: 13 }}>← Back to Daily Planner</a>
        <button onClick={() => window.print()} style={{ padding: '8px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', background: '#fff', padding: 40 }}>
        <h1 style={{ fontFamily: FONT_BRAND, color: C.navy, fontSize: 26, textAlign: 'center', marginBottom: 4 }}>{ttoc.dayLabel}</h1>

        <p style={{ fontSize: 13, color: '#333' }}>
          Thanks for coming in for me. Please do not feel like you need to use any of these items if you have other activities that you enjoy.
        </p>

        <ol style={{ fontSize: 13, color: '#333', paddingLeft: 20 }}>
          {ttoc.standardNotes.map((n, i) => <li key={i} style={{ marginBottom: 4 }}>{n}</li>)}
        </ol>

        {ttoc.customNotes && (
          <p style={{ fontSize: 13, color: '#333', background: '#f7f5f0', padding: 10, borderRadius: 6 }}>{ttoc.customNotes}</p>
        )}

        <h2 style={{ fontSize: 15, color: C.navy, marginTop: 20 }}>A tentative schedule is as follows</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: `1px solid ${C.border}` }}>
          <tbody>
            {ttoc.blocks.map((b) => (
              <tr key={b.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: 8, width: 90, verticalAlign: 'top', fontWeight: 600, color: '#333' }}>
                  {b.start_time} – {addMinutes(b.start_time, b.length_minutes)}
                </td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: C.navy }}>{b.title || b.subject}</div>
                  {b.content && <div style={{ color: '#555', marginTop: 2, whiteSpace: 'pre-wrap' }}>{b.content}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
