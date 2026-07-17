'use client'
import { useState, useEffect } from 'react'
import { COLORS as C, FONT_BODY, FONT_BRAND } from '@/lib/theme'
import { CURRICULUM_MODELS } from '@/lib/curriculum-models'
import { periodForWeek } from '@/lib/year-plan'

// Lens-aware layout: Subject-Centered reads most naturally as one table
// per subject (unit sequence + week range). Every other lens (thematic,
// inquiry, PBL, spiral, etc.) reads more naturally as one table per
// PERIOD/theme, showing which subjects' units land inside that period's
// window -- since in those lenses the period, not the subject, is the
// organizing unit a teacher (or a parent, or an administrator) would scan
// for first. This is the "lens-aware layout switching" from Aj's spec.
function isSubjectCentered(modelKey) {
  return modelKey === 'subject_centered'
}

export default function ScopeSequencePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/teacher-inventories')
      .then((r) => r.json())
      .then((d) => {
        const days = d.inventory?.school_calendar_summary?.daysOfInstruction
        const weeks = days ? Math.round(days / 5) : 36
        return fetch(`/api/print/scope-sequence?totalWeeks=${weeks}`)
      })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>
  if (!data || data.error) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Couldn't load your plan yet — set up Year Plan and Unit Priorities first.</div>

  const { modelKey, grades, subjects, periods, units, timelineBlocks, totalWeeks } = data
  const modelLabel = CURRICULUM_MODELS.find((m) => m.key === modelKey)?.label || modelKey
  const subjectCentered = isSubjectCentered(modelKey)

  const unitsBySubject = units.reduce((acc, u) => {
    (acc[u.subject] ||= []).push(u)
    return acc
  }, {})
  const timelineBySubject = timelineBlocks.reduce((acc, b) => {
    (acc[b.subject] ||= []).push(b)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; }
          .print-section { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ padding: '16px 32px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="print-page" style={{ maxWidth: 800, margin: '0 auto', background: '#fff', padding: 40 }}>
        <div style={{ textAlign: 'center', borderBottom: `2px solid ${C.navy}`, paddingBottom: 16, marginBottom: 24 }}>
          <h1 style={{ fontFamily: FONT_BRAND, color: C.navy, fontSize: 28, margin: 0 }}>Scope &amp; Sequence</h1>
          <p style={{ fontSize: 13, color: '#666', margin: '6px 0 0' }}>
            {grades.length > 0 && `Grade${grades.length > 1 ? 's' : ''} ${grades.join('/')} · `}
            {modelLabel} · {totalWeeks} instructional weeks
          </p>
        </div>

        {subjectCentered ? (
          // ── Subject-Centered layout: one table per subject ──
          Object.keys(unitsBySubject).length === 0 ? (
            <p style={{ fontSize: 13, color: '#888' }}>No units set up yet — visit Unit Priorities first.</p>
          ) : Object.entries(unitsBySubject).map(([subject, subjectUnits]) => {
            const blocks = timelineBySubject[subject] || []
            return (
              <div key={subject} className="print-section" style={{ marginBottom: 28 }}>
                <h2 style={{ color: C.navy, fontSize: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 6, marginBottom: 10 }}>{subject}</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#888' }}>
                      <th style={{ padding: '4px 8px 4px 0' }}>Unit</th>
                      <th style={{ padding: '4px 8px' }}>Weeks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectUnits.map((u) => {
                      const block = blocks.find((b) => b.unit_name === u.unit_name)
                      return (
                        <tr key={u.unit_name} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: '6px 8px 6px 0', fontWeight: 600 }}>{u.unit_name}</td>
                          <td style={{ padding: '6px 8px', color: '#666' }}>
                            {block ? `Wk ${block.start_week}–${block.end_week}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })
        ) : (
          // ── Theme/period-centered layout (all other lenses): one
          // section per period, listing which subjects/units fall inside
          // that period's week window ──
          periods.length === 0 ? (
            <p style={{ fontSize: 13, color: '#888' }}>No Year Structure periods set up yet — visit Year Plan first.</p>
          ) : periods.map((p) => {
            // Any unit whose timeline block overlaps this period's week
            // window at all gets listed under it -- a unit can span two
            // periods if the teacher's manual timeline edits created that
            // overlap; that's shown rather than hidden.
            const relevantBlocks = timelineBlocks.filter((b) => b.start_week <= p.endWeek && b.end_week >= p.startWeek)
            return (
              <div key={p.period_label} className="print-section" style={{ marginBottom: 28 }}>
                <h2 style={{ color: C.navy, fontSize: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 6, marginBottom: 4 }}>
                  {p.period_label}
                </h2>
                <p style={{ fontSize: 11, color: '#999', margin: '0 0 10px' }}>
                  Weeks {p.startWeek}–{p.endWeek} ({p.weekCount} weeks, {Math.round(p.period_pct)}% of the year)
                </p>
                {relevantBlocks.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>No units currently scheduled in this window.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#888' }}>
                        <th style={{ padding: '4px 8px 4px 0' }}>Subject</th>
                        <th style={{ padding: '4px 8px' }}>Unit</th>
                        <th style={{ padding: '4px 8px' }}>Weeks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relevantBlocks.map((b) => (
                        <tr key={`${b.subject}::${b.unit_name}`} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: '6px 8px 6px 0', color: '#666' }}>{b.subject}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{b.unit_name}</td>
                          <td style={{ padding: '6px 8px', color: '#666' }}>Wk {b.start_week}–{b.end_week}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })
        )}

        <p style={{ fontSize: 10, color: '#bbb', textAlign: 'center', marginTop: 32, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          Generated from your live Lesson Planner data — reflects manual edits made on the Year Timeline page.
        </p>
      </div>
    </div>
  )
}
