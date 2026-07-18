'use client'
import { useState, useEffect } from 'react'
import { COLORS as C, FONT_BODY, FONT_BRAND } from '@/lib/theme'

// Printable Content | Resources | Assessment planner, styled after Aj's
// uploaded 3-Month Math Planner sample. Curriculum-lens-driven grouping
// into >= ~3-month periods (see /api/print/unit-planner + lib/print-
// planner), break-aware date ranges, split-class "Both Grades" middle
// column. Print/Download PDF buttons -- window.print() the same way
// scope-sequence does; no separate PDF library needed since browser print-
// to-PDF handles that natively.
export default function UnitPlannerPrintPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/print/unit-planner')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>
  if (!data || data.error) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Couldn't load your plan yet — set up Unit Priorities and Timeline first.</div>

  const { printPeriods, schoolYear } = data

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; }
          .print-section { break-inside: avoid; page-break-after: always; }
          .print-section:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="no-print" style={{ padding: '16px 32px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/timeline" style={{ color: C.navy, fontSize: 13 }}>← Timeline</a>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          🖨️ Print / Download as PDF
        </button>
      </div>

      {printPeriods.length === 0 && (
        <p style={{ padding: 32, fontSize: 13, color: '#888' }}>No timeline blocks found yet — set up your <a href="/timeline">Timeline</a> first.</p>
      )}

      {printPeriods.map((period, i) => {
        const gradeCols = period.grades.length > 1 ? period.grades : []
        return (
          <div key={i} className="print-page print-section" style={{ maxWidth: 1000, margin: '20px auto', background: '#fff', padding: 40 }}>
            <div style={{ textAlign: 'center', borderBottom: `2px solid ${C.navy}`, paddingBottom: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {period.subject} {period.grades.length > 0 ? `— Grade${period.grades.length > 1 ? 's' : ''} ${period.grades.join('/')}` : ''}
              </p>
              <h1 style={{ fontFamily: FONT_BRAND, color: C.navy, fontSize: 24, margin: '4px 0' }}>
                {period.unitNames.slice(0, 2).join(' & ')}{period.unitNames.length > 2 ? ` +${period.unitNames.length - 2} more` : ''}
              </h1>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{period.dateLabel}{schoolYear ? ` · ${schoolYear} School Year` : ''}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: C.navy, color: '#fff' }}>
                  {gradeCols.length > 1 ? (
                    <>
                      {gradeCols.map((g) => <th key={g} style={{ padding: 8, textAlign: 'left', border: '1px solid #fff2' }}>Grade {g} Content</th>)}
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #fff2' }}>Both Grades</th>
                    </>
                  ) : (
                    <th style={{ padding: 8, textAlign: 'left', border: '1px solid #fff2' }}>Content</th>
                  )}
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #fff2' }}>Resources</th>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #fff2' }}>Assessment Practices</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ verticalAlign: 'top' }}>
                  {gradeCols.length > 1 ? (
                    <>
                      {gradeCols.map((g) => (
                        <td key={g} style={{ padding: 8, border: `1px solid ${C.border}` }}>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {(period.content.perGrade[g] || []).map((u, j) => (
                              <li key={j} style={{ marginBottom: 6 }}>
                                <strong>{u.unit_name}</strong>
                                {u.content_summary && <div style={{ color: '#666' }}>{u.content_summary}</div>}
                              </li>
                            ))}
                          </ul>
                        </td>
                      ))}
                      <td style={{ padding: 8, border: `1px solid ${C.border}`, background: '#faf8f2' }}>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {period.content.bothGrades.map((u, j) => (
                            <li key={j} style={{ marginBottom: 6 }}>
                              <strong>{u.unit_name}</strong>
                              {u.content_summary && <div style={{ color: '#666' }}>{u.content_summary}</div>}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </>
                  ) : (
                    <td style={{ padding: 8, border: `1px solid ${C.border}` }}>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {[...period.content.bothGrades, ...Object.values(period.content.perGrade).flat()].map((u, j) => (
                          <li key={j} style={{ marginBottom: 6 }}>
                            <strong>{u.unit_name}</strong>
                            {u.content_summary && <div style={{ color: '#666' }}>{u.content_summary}</div>}
                            {u.curricular_competency && <div style={{ color: '#888', fontStyle: 'italic' }}>{u.curricular_competency}</div>}
                          </li>
                        ))}
                      </ul>
                    </td>
                  )}

                  <td style={{ padding: 8, border: `1px solid ${C.border}` }}>
                    {period.resources.length === 0 ? (
                      <span style={{ color: '#999' }}>—</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {period.resources.map((r, j) => (
                          <li key={j} style={{ marginBottom: 6 }}>
                            {r.label}
                            {r.detail && <div style={{ color: '#666' }}>{r.detail.slice(0, 120)}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>

                  <td style={{ padding: 8, border: `1px solid ${C.border}` }}>
                    {period.assessment.length === 0 ? (
                      <span style={{ color: '#999' }}>—</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {period.assessment.map((p, j) => (
                          <li key={j} style={{ marginBottom: 6 }}>
                            {p.label}
                            {p.assessmentKind === 'qr_submission' && <span style={{ fontSize: 9, color: '#7a3c8a' }}> 📱</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 16 }}>
              {period.subject} Department | BC Curriculum | {schoolYear || ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}
