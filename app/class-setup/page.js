'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { COLORS as C, FONT_BODY } from '@/lib/theme'

const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
// NOTE: these strings must exactly match lib/unit-priorities.js's
// DEFAULT_UNITS keys and lib/bc-curriculum.js's SUBJECT_SLUG_MAP keys --
// "Language Arts" not "English Language Arts", "Physical Education" not
// "Physical & Health Education". A prior version of this list used
// different wording than the rest of the codebase, which would have
// silently broken subject matching (e.g. the BC Curriculum
// auto-population feature checking CORE_SUBJECTS.includes(subject)).
const SUBJECT_OPTIONS = [
  'Language Arts', 'Mathematics', 'Science', 'Social Studies',
  'Physical Education', 'Art', 'Music', 'Applied Design, Skills & Technologies',
  'Health & Career Education', 'French', 'Other',
]

function toggle(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function ClassSetupInner() {
  const authChecked = useRequireAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prefilledFromPlan, setPrefilledFromPlan] = useState(false)
  const [grades, setGrades] = useState([])
  const [subjects, setSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/class-setup')
      .then((r) => r.json())
      .then((d) => {
        if (d.setup) {
          setGrades(d.setup.grades || [])
          setSubjects(d.setup.subjects || [])
        } else {
          // No saved setup yet -- if we arrived here from Upload &
          // Modify My Previous Plan with inferred values, pre-fill from
          // those instead of starting blank. Still fully editable/
          // overridable before saving.
          const gParam = searchParams.get('grades')
          const sParam = searchParams.get('subjects')
          if (gParam || sParam) {
            const g = gParam ? gParam.split(',').filter(Boolean) : []
            const s = sParam ? sParam.split(',').filter(Boolean) : []
            if (g.length) setGrades(g)
            if (s.length) setSubjects(s)
            if (g.length || s.length) setPrefilledFromPlan(true)
          }
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setError('')
    if (grades.length === 0 || subjects.length === 0) {
      setError('Pick at least one grade and one subject.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/class-setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades, subjects }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      router.push('/dashboard')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!authChecked) return null

  const pill = (active) => ({
    padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? C.gold : C.border}`,
    background: active ? '#fff8ee' : '#fff',
    color: active ? C.navy : '#666',
  })
  const allPill = (allSelected) => ({
    padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${C.navy}`,
    background: allSelected ? C.navy : '#fff',
    color: allSelected ? '#fff' : C.navy,
  })

  const allGradesSelected = grades.length === GRADE_OPTIONS.length
  const allSubjectsSelected = subjects.length === SUBJECT_OPTIONS.length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>What do you teach?</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
          This comes first so everything after — your Year Plan's curriculum lens, Unit Priorities, generated
          content — is actually built around your real grades and subjects instead of guessing.
        </p>

        {prefilledFromPlan && (
          <div style={{ background: '#eef8f0', border: '1px solid #b8e0c4', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#1a7a3e' }}>
            ✓ Pre-filled from your uploaded plan — double-check these and adjust anything before saving.
          </div>
        )}

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Grade(s) you teach</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setGrades(allGradesSelected ? [] : [...GRADE_OPTIONS])}
              title={allGradesSelected ? 'Clear all grades' : 'Select every grade (K-12)'}
              style={allPill(allGradesSelected)}
            >
              All
            </button>
            {GRADE_OPTIONS.map((g) => (
              <button key={g} type="button" onClick={() => setGrades((prev) => toggle(prev, g))} style={pill(grades.includes(g))}>
                {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Subject(s) you teach</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSubjects(allSubjectsSelected ? [] : [...SUBJECT_OPTIONS])}
              title={allSubjectsSelected ? 'Clear all subjects' : 'Select every subject (typical for elementary generalist teachers)'}
              style={allPill(allSubjectsSelected)}
            >
              All
            </button>
            {SUBJECT_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setSubjects((prev) => toggle(prev, s))} style={pill(subjects.includes(s))}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: '#a33', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button onClick={save} disabled={saving} style={{
          padding: '10px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8,
          fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving…' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  )
}

export default function ClassSetupPage() {
  return (
    <Suspense fallback={null}>
      <ClassSetupInner />
    </Suspense>
  )
}
