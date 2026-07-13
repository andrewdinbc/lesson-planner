'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Tooltip from '@/components/Tooltip'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }
const TYPE_LABEL = { year: 'Year', month: 'Month', week: 'Week', day: 'Day', lesson: 'Lesson' }

function GenerateForm() {
  const params = useSearchParams()
  const router = useRouter()
  const type = params.get('type') || 'year'
  const parentId = params.get('parentId') || null

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [theme, setTheme] = useState('')
  const [numProjects, setNumProjects] = useState('')
  const [numWorksheets, setNumWorksheets] = useState('')
  const [docs, setDocs] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([])
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/steering-documents').then((r) => r.json()).then((d) => setDocs(d.documents || [])).catch(() => {})
  }, [])

  function toggleDoc(id) {
    setSelectedDocs((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function generate(e) {
    e.preventDefault()
    setError(''); setGenerating(true); setResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, subject, grade, theme, numProjects, numWorksheets, parentId, steeringDocIds: selectedDocs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data.plan)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  function exportTxt() {
    const blob = new Blob([result.content.markdown], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.title.replace(/[^a-z0-9]+/gi, '_')}.txt`
    a.click()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 20px' }}>New {TYPE_LABEL[type]} Plan</h1>

        {!result ? (
          <form onSubmit={generate} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
              style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
                style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit' }} />
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade"
                style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit' }} />
            </div>
            <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme (optional)"
              style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input value={numProjects} onChange={(e) => setNumProjects(e.target.value)} placeholder="# hands-on projects"
                style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit' }} />
              <input value={numWorksheets} onChange={(e) => setNumWorksheets(e.target.value)} placeholder="# worksheets"
                style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit' }} />
            </div>

            {docs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.navy, fontWeight: 600, marginBottom: 6 }}>Ground this plan in steering documents:</div>
                {docs.map((d) => (
                  <label key={d.id} style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                    <input type="checkbox" checked={selectedDocs.includes(d.id)} onChange={() => toggleDoc(d.id)} /> {d.title}
                  </label>
                ))}
              </div>
            )}

            {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: '#c0392b', marginBottom: 16 }}>{error}</div>}

            <Tooltip text="Generates this lesson/unit plan using your steering documents to ground it — takes a moment, nothing is saved until it finishes." width={240}>
              <button type="submit" disabled={generating} style={{ padding: '12px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                {generating ? 'Generating…' : `Generate ${TYPE_LABEL[type]} Plan`}
              </button>
            </Tooltip>
          </form>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
            <h2 style={{ color: C.navy, marginTop: 0 }}>{result.title}</h2>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{result.content.markdown}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Tooltip text="Downloads this plan as a plain text file to your device.">
                <button onClick={exportTxt} style={{ padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  ⬇ Export .txt
                </button>
              </Tooltip>
              <Tooltip text="Returns to your dashboard — this plan stays saved either way.">
                <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 20px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                  Done — Back to Dashboard
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, fontFamily: 'Georgia, serif' }}>Loading…</div>}>
      <GenerateForm />
    </Suspense>
  )
}


