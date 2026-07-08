'use client'
import { useState, useEffect } from 'react'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }

export default function SteeringPage() {
  const [docs, setDocs] = useState([])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/steering-documents')
      if (res.status === 401) { window.location.href = '/login'; return }
      const d = await res.json()
      setDocs(d.documents || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addDoc(e) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !text.trim()) return
    try {
      const res = await fetch('/api/steering-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), fullText: text.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setTitle(''); setText('')
      await load()
    } catch (e) { setError(e.message) }
  }

  async function removeDoc(id) {
    await fetch('/api/steering-documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Steering Documents</h1>
        <p style={{ color: '#8a7d6e', fontSize: 14, marginBottom: 24 }}>
          Full texts (curriculum guides, exemplar units, policy docs) used as background context
          when generating plans — select which ones to apply on the Generate page.
        </p>

        <form onSubmit={addDoc} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title (e.g. BC Science Curriculum Grade 5)"
            style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full text here…"
            rows={8}
            style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ padding: '10px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            + Add Document
          </button>
        </form>

        {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: '#c0392b', marginBottom: 16 }}>{error}</div>}

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: C.navy, color: '#fff', fontWeight: 700 }}>
            {docs.length} document{docs.length === 1 ? '' : 's'}
          </div>
          {loading ? (
            <div style={{ padding: 20, color: '#8a7d6e' }}>Loading…</div>
          ) : docs.length === 0 ? (
            <div style={{ padding: 20, color: '#8a7d6e', fontStyle: 'italic' }}>No documents yet.</div>
          ) : (
            docs.map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: `1px solid ${C.border}` }}>
                <span>{d.title}</span>
                <button onClick={() => removeDoc(d.id)} style={{ padding: '4px 10px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: '#c0392b', fontSize: 12 }}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
