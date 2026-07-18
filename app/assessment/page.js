'use client'
import { useState, useEffect } from 'react'
import { COLORS as C, FONT_BODY } from '@/lib/theme'
import { LA_CATEGORIES, categorizeLA } from '@/lib/language-arts-categories'

// Step 3 of the Content -> Resources -> Assessment flow (Aj, 2026-07-17).
// Teacher adds their own assessment practices, or has AI generate based on
// the assessment TYPES they want (checkboxes below), grounded in steering
// documents the same way Resources' generation is. "QR-code student
// submission" is its own type: picking it creates a qr_assessment_config
// row (see /api/qr-assessment) -- the backbone other TeacherAssist suite
// apps (Student Portfolio) read to actually run QR scanning + AI marking.
const LA_CAT_COLORS = {
  reading: { bg: '#eef6f0', border: '#b8dcc2', text: '#2f6b41' },
  writing: { bg: '#fbf3e9', border: '#e6c893', text: '#a06b1f' },
  oral: { bg: '#eef1fb', border: '#bcc7ef', text: '#3a4fa0' },
}

const ASSESSMENT_KINDS = [
  { key: 'entry_exit_ticket', label: 'Entry/Exit Tickets' },
  { key: 'quiz', label: 'Quizzes' },
  { key: 'performance_task', label: 'Performance Tasks' },
  { key: 'rubric', label: 'Rubrics' },
  { key: 'observation_checklist', label: 'Observation Checklists' },
  { key: 'self_assessment', label: 'Self-Assessment' },
  { key: 'peer_assessment', label: 'Peer Assessment' },
  { key: 'reflection_journal', label: 'Reflection Journals' },
  { key: 'summative_test', label: 'Summative Test' },
]

export default function AssessmentPage() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingKey, setGeneratingKey] = useState(null)
  const [noteText, setNoteText] = useState({})
  const [selectedKinds, setSelectedKinds] = useState({}) // unitKey -> Set of kind keys
  const [qrOpen, setQrOpen] = useState({}) // unitKey -> bool
  const [qrDraft, setQrDraft] = useState({}) // unitKey -> {title, instructions, rubric_text, due_date}
  const [qrSaving, setQrSaving] = useState(null)

  useEffect(() => {
    fetch('/api/unit-priorities')
      .then((r) => r.json())
      .then((d) => setUnits((d.units || []).filter((u) => !u.removed)))
      .finally(() => setLoading(false))
  }, [])

  const unitKey = (u) => `${u.subject}::${u.unit_name}`

  async function savePractices(u, practices) {
    const res = await fetch('/api/unit-priorities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: [{ subject: u.subject, unit_name: u.unit_name, assessment_practices: practices }] }),
    })
    if (res.ok) {
      setUnits((prev) => prev.map((x) => (x.subject === u.subject && x.unit_name === u.unit_name ? { ...x, assessment_practices: practices } : x)))
    }
  }

  function toggleKind(u, kindKey) {
    const key = unitKey(u)
    setSelectedKinds((prev) => {
      const current = new Set(prev[key] || [])
      current.has(kindKey) ? current.delete(kindKey) : current.add(kindKey)
      return { ...prev, [key]: current }
    })
    if (kindKey === 'qr_submission') {
      setQrOpen((prev) => ({ ...prev, [key]: !prev[key] }))
    }
  }

  async function generatePractices(u) {
    const key = unitKey(u)
    const kinds = [...(selectedKinds[key] || [])].filter((k) => k !== 'qr_submission')
    setGeneratingKey(key)
    try {
      const resourcesSummary = (u.resources || []).map((r) => r.label).join(', ')
      const res = await fetch('/api/units/generate-assessment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: u.subject, unitName: u.unit_name, contentSummary: u.content_summary,
          curricularCompetency: u.curricular_competency, resourcesSummary, grades: u.grades,
          assessmentKinds: kinds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await savePractices(u, [...(u.assessment_practices || []), ...data.practices])
    } catch (e) {
      alert(`Couldn't generate assessment ideas: ${e.message}`)
    } finally {
      setGeneratingKey(null)
    }
  }

  function addNote(u) {
    const key = unitKey(u)
    const text = (noteText[key] || '').trim()
    if (!text) return
    savePractices(u, [...(u.assessment_practices || []), { type: 'teacher_added', label: text, detail: '', assessmentKind: 'other', added_at: new Date().toISOString() }])
    setNoteText((prev) => ({ ...prev, [key]: '' }))
  }

  function removePractice(u, idx) {
    const next = (u.assessment_practices || []).filter((_, i) => i !== idx)
    savePractices(u, next)
  }

  async function saveQrConfig(u) {
    const key = unitKey(u)
    const draft = qrDraft[key] || {}
    if (!draft.title?.trim()) { alert('Give the QR assessment a title first.'); return }
    setQrSaving(key)
    try {
      const res = await fetch('/api/qr-assessment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: u.subject, unit_name: u.unit_name,
          title: draft.title, instructions: draft.instructions, rubric_text: draft.rubric_text, due_date: draft.due_date || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await savePractices(u, [...(u.assessment_practices || []), {
        type: 'teacher_added', label: draft.title, detail: draft.instructions || '',
        assessmentKind: 'qr_submission', qr_config_id: data.config.id, added_at: new Date().toISOString(),
      }])
      setQrDraft((prev) => ({ ...prev, [key]: {} }))
      setQrOpen((prev) => ({ ...prev, [key]: false }))
    } catch (e) {
      alert(`Couldn't save QR assessment: ${e.message}`)
    } finally {
      setQrSaving(null)
    }
  }

  const bySubject = units.reduce((acc, u) => {
    (acc[u.subject] ||= []).push(u)
    return acc
  }, {})

  const renderUnitAssessment = (u, colors) => {
    const key = unitKey(u)
    const kinds = selectedKinds[key] || new Set()
    return (
      <div key={key} style={{ background: '#fff', border: `1px solid ${colors?.border || C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{u.unit_name}</div>
        {u.content_summary && <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>{u.content_summary}</p>}

        {(u.assessment_practices || []).length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {u.assessment_practices.map((p, i) => (
              <li key={i} style={{ fontSize: 12, color: '#444', marginBottom: 4 }}>
                <strong>{p.label}</strong>
                {p.type === 'ai_generated' && <span style={{ fontSize: 9, color: colors?.text || C.gold, marginLeft: 6 }}>AI suggested</span>}
                {p.assessmentKind === 'qr_submission' && <span style={{ fontSize: 9, color: '#7a3c8a', marginLeft: 6 }}>📱 QR submission</span>}
                {p.detail && <div style={{ fontSize: 11, color: '#777' }}>{p.detail}</div>}
                <button onClick={() => removePractice(u, i)} style={{ fontSize: 10, color: '#a33', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>remove</button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>What kinds do you want?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ASSESSMENT_KINDS.map((k) => (
              <label key={k.key} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, border: `1px solid ${colors?.border || C.border}`, background: kinds.has(k.key) ? (colors?.bg || '#f0eee7') : '#fff', cursor: 'pointer' }}>
                <input type="checkbox" checked={kinds.has(k.key)} onChange={() => toggleKind(u, k.key)} style={{ margin: 0 }} />
                {k.label}
              </label>
            ))}
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, border: '1px solid #d9b8e8', background: kinds.has('qr_submission') ? '#f5eafa' : '#fff', cursor: 'pointer' }}>
              <input type="checkbox" checked={kinds.has('qr_submission')} onChange={() => toggleKind(u, 'qr_submission')} style={{ margin: 0 }} />
              📱 QR Student Submission
            </label>
          </div>
        </div>

        {qrOpen[key] && (
          <div style={{ marginTop: 10, background: '#f5eafa', border: '1px solid #d9b8e8', borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 11, color: '#7a3c8a', marginBottom: 6 }}>
              This creates the assessment definition -- students scan their own QR code to submit, AI marks it, and you review, all in <strong>Student Portfolio</strong>. Full ecosystem access unlocks this and everything else in the TeacherAssist suite.
            </div>
            <input
              placeholder="Assessment title"
              value={qrDraft[key]?.title || ''}
              onChange={(e) => setQrDraft((prev) => ({ ...prev, [key]: { ...prev[key], title: e.target.value } }))}
              style={{ width: '100%', fontSize: 12, padding: '5px 8px', border: '1px solid #d9b8e8', borderRadius: 5, marginBottom: 6, boxSizing: 'border-box' }}
            />
            <textarea
              placeholder="Instructions for students"
              value={qrDraft[key]?.instructions || ''}
              onChange={(e) => setQrDraft((prev) => ({ ...prev, [key]: { ...prev[key], instructions: e.target.value } }))}
              rows={2}
              style={{ width: '100%', fontSize: 12, padding: '5px 8px', border: '1px solid #d9b8e8', borderRadius: 5, marginBottom: 6, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => saveQrConfig(u)} disabled={qrSaving === key}
              style={{ padding: '5px 12px', background: '#7a3c8a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              {qrSaving === key ? 'Saving…' : 'Create QR Assessment'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => generatePractices(u)}
            disabled={generatingKey === key || kinds.size === 0 || (kinds.size === 1 && kinds.has('qr_submission'))}
            style={{ padding: '5px 12px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: (kinds.size === 0 || (kinds.size === 1 && kinds.has('qr_submission'))) ? 0.5 : 1 }}
          >
            {generatingKey === key ? 'Generating…' : '✨ AI Generate for selected kinds'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            value={noteText[key] || ''}
            onChange={(e) => setNoteText((prev) => ({ ...prev, [key]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addNote(u)}
            placeholder="Or just type an assessment practice you already use…"
            style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 5 }}
          />
          <button onClick={() => addNote(u)} style={{ padding: '5px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>Add</button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 40, fontFamily: FONT_BODY }}>Loading…</div>

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 4 }}>Assessment</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
        Step 3 of 3. Pick the kinds of assessment you want per unit and let AI suggest specifics, or add your own. QR Student Submission creates the assessment definition here -- the actual scan-and-mark flow lives in Student Portfolio.
      </p>

      {Object.entries(bySubject).map(([subject, subjectUnits]) => {
        const isLA = subject === 'Language Arts'
        return (
          <div key={subject} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, color: C.navy, marginBottom: 10 }}>{subject}</h2>
            {isLA ? (
              LA_CATEGORIES.map((cat) => {
                const catUnits = subjectUnits.filter((u) => {
                  const cats = u.la_categories?.length ? u.la_categories : [u.la_category || categorizeLA(u.unit_name, u.content_summary)]
                  return cats.includes(cat.key)
                })
                if (catUnits.length === 0) return null
                const colors = LA_CAT_COLORS[cat.key]
                return (
                  <div key={cat.key} style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 12, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{cat.label}</h3>
                    {catUnits.map((u) => renderUnitAssessment(u, colors))}
                  </div>
                )
              })
            ) : (
              subjectUnits.map((u) => renderUnitAssessment(u, null))
            )}
          </div>
        )
      })}

      {units.length === 0 && (
        <p style={{ fontSize: 13, color: '#888' }}>No units approved yet -- go back to Unit Priorities and approve some Content first.</p>
      )}
    </div>
  )
}
