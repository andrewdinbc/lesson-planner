'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }

export default function NewMicroUnitPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: '#8a7d6e' }}>Loading…</div>}>
      <NewMicroUnitForm />
    </Suspense>
  )
}

function NewMicroUnitForm() {
  const params = useSearchParams()
  const lessonPlanId = params.get('lessonPlanId')

  const [title, setTitle] = useState('')
  const [grade, setGrade] = useState('')
  const [strand, setStrand] = useState('')
  const [masteryPct, setMasteryPct] = useState(80)
  const [randomizable, setRandomizable] = useState(true)
  const [questionsText, setQuestionsText] = useState(
    '[\n  { "prompt": "{a} + {b} = ?", "answer_formula": "a+b" }\n]'
  )
  const [rangesText, setRangesText] = useState(
    '{\n  "a": { "min": 1, "max": 20 },\n  "b": { "min": 1, "max": 20 }\n}'
  )
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    try {
      const questions = JSON.parse(questionsText)
      const randomizable_ranges = randomizable ? JSON.parse(rangesText) : undefined
      const res = await fetch('/api/micro-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          grade,
          strand,
          defaultMasteryPct: Number(masteryPct),
          randomizable,
          lessonPlannerRef: lessonPlanId,
          questionTemplate: { questions, randomizable_ranges },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setResult({ ok: true, microUnit: data.microUnit })
    } catch (err) {
      setResult({ ok: false, error: err.message })
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ color: C.navy, fontSize: 24 }}>New Math Micro-Unit</h1>
        <p style={{ color: '#8a7d6e', fontSize: 13, marginBottom: 20 }}>
          Sends to Mastery Studio (self-paced, mastery-gated math practice) — this lesson stays linked as its origin.
        </p>

        <form onSubmit={handleSubmit} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              Grade
              <input value={grade} onChange={(e) => setGrade(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ flex: 1 }}>
              Strand
              <input value={strand} onChange={(e) => setStrand(e.target.value)} placeholder="e.g. algebra" style={inputStyle} />
            </label>
            <label style={{ flex: 1 }}>
              Default Mastery %
              <input type="number" min="0" max="100" value={masteryPct} onChange={(e) => setMasteryPct(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={randomizable} onChange={(e) => setRandomizable(e.target.checked)} />
            Randomizable (each student gets different numbers, same structure)
          </label>

          <label>
            Questions (JSON array — use {'{variableName}'} for placeholders)
            <textarea value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} rows={6} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
          </label>

          {randomizable && (
            <label>
              Variable Ranges (JSON)
              <textarea value={rangesText} onChange={(e) => setRangesText(e.target.value)} rows={4} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
            </label>
          )}

          <button type="submit" disabled={saving} style={{ padding: '10px 0', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Create Micro-Unit in Mastery Studio'}
          </button>

          {result && result.ok && (
            <div style={{ color: C.green, fontSize: 13 }}>✓ Created — visible in Mastery Studio's teacher dashboard.</div>
          )}
          {result && !result.ok && (
            <div style={{ color: '#b03a2e', fontSize: 13 }}>⚠️ {result.error}</div>
          )}
        </form>
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ddd4c2', borderRadius: 6, marginTop: 4, fontFamily: 'inherit', boxSizing: 'border-box' }
