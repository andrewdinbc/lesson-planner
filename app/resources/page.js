'use client'
import { useState, useEffect } from 'react'
import { COLORS as C, FONT_BODY } from '@/lib/theme'

// Per-teacher Resources -- separate feature from admin-only Steering
// Documents. Each teacher adds links/notes to things they personally
// like or have bought; these get referenced during plan generation
// alongside (not instead of) Aj's admin steering material.
export default function ResourcesPage() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/resources').then((r) => r.json()).then((d) => { setResources(d.resources || []); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function addResource(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await fetch('/api/resources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), url: url.trim() || null, notes: notes.trim() || null }),
      })
      setTitle(''); setUrl(''); setNotes('')
      load()
    } finally {
      setSaving(false)
    }
  }

  async function removeResource(id) {
    await fetch(`/api/resources?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Your Resources</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
          Add websites, tools, or materials you personally like using or have already bought. The AI will
          reference these where relevant when generating your plans -- separate from the curriculum background
          material already built into the system.
        </p>

        <form onSubmit={addResource} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 6 }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="e.g., Twinkl BC Resources, my favourite math games site"
              style={{ width: '100%', padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 6 }}>Link (optional)</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
              style={{ width: '100%', padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 6 }}>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="2"
              placeholder="What it's good for, when to use it…"
              style={{ width: '100%', padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'none' }} />
          </div>
          <button type="submit" disabled={saving} style={{
            padding: '10px 22px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8,
            fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Adding…' : '+ Add Resource'}
          </button>
        </form>

        {loading ? (
          <div style={{ color: '#888' }}>Loading…</div>
        ) : resources.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 32, textAlign: 'center', color: '#888' }}>
            No resources added yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resources.map((r) => (
              <div key={r.id} style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15 }}>
                    {r.url ? <a href={r.url} target="_blank" rel="noreferrer" style={{ color: C.navy }}>{r.title}</a> : r.title}
                  </div>
                  {r.notes && <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{r.notes}</div>}
                </div>
                <button onClick={() => removeResource(r.id)} style={{
                  background: 'none', border: 'none', color: '#a33', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
