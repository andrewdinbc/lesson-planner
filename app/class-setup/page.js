'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { COLORS as C, FONT_BODY } from '@/lib/theme'

const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const SUBJECT_OPTIONS = [
  'English Language Arts', 'Mathematics', 'Science', 'Social Studies',
  'Physical & Health Education', 'Arts Education', 'Applied Design, Skills & Technologies',
  'Career Education', 'French', 'Other',
]

function toggle(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

export default function ClassSetupPage() {
  const authChecked = useRequireAuth()
  const router = useRouter()
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
        }
      })
      .catch(() => {})
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
      router.push('/year-plan')
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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>What do you teach?</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
          This comes first so everything after — your Year Plan's curriculum lens, Unit Priorities, generated
          content — is actually built around your real grades and subjects instead of guessing.
        </p>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Grade(s) you teach</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
