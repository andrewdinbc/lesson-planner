'use client'
import { useState, useEffect } from 'react'
import { STEERING_CATEGORIES } from '../../lib/steering-categories'
import Tooltip from '@/components/Tooltip'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3', muted: '#8a7d6e' }

export default function SteeringPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Upload-a-book form state
  const [mode, setMode] = useState('upload') // 'upload' | 'paste' | 'web'
  const [file, setFile] = useState(null)
  const [webUrl, setWebUrl] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState(STEERING_CATEGORIES[2].key) // default: Actionable Resources
  const [pasteText, setPasteText] = useState('')
  const [uploading, setUploading] = useState(false)

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

  async function handleUpload(e) {
    e.preventDefault()
    setError('')
    if (mode !== 'web' && !title.trim()) { setError('Title is required'); return }

    setUploading(true)
    try {
      if (mode === 'upload') {
        if (!file) { setError('Choose a PDF file'); setUploading(false); return }
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', title.trim())
        formData.append('category', category)
        if (author.trim()) formData.append('author', author.trim())

        const res = await fetch('/api/steering-documents/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
      } else if (mode === 'paste') {
        if (!pasteText.trim()) { setError('Paste some text first'); setUploading(false); return }
        const res = await fetch('/api/steering-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), fullText: pasteText.trim(), category, author: author.trim() || null }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      } else {
        if (!webUrl.trim()) { setError('Enter a URL first'); setUploading(false); return }
        const res = await fetch('/api/steering-documents/web-source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webUrl.trim(), title: title.trim() || undefined, category }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch and summarize that page')
      }

      setTitle(''); setAuthor(''); setPasteText(''); setFile(null); setWebUrl('')
      await load()
    } catch (e) { setError(e.message) }
    setUploading(false)
  }

  async function removeDoc(id) {
    await fetch('/api/steering-documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }

  const grouped = STEERING_CATEGORIES.map((cat) => ({
    ...cat,
    docs: docs.filter((d) => (d.category || 'actionable_resources') === cat.key),
  }))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Steering Resources</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Upload full books or resources (PDF, 100+ pages fine) to guide how lesson plans get generated —
          organized into three categories, each used differently: Philosophy shapes the <em>why</em>,
          Psychology shapes the <em>how/pacing</em>, Actionable Resources supplies concrete techniques and
          activities pulled directly into the plan. Select which ones to apply on the Generate page.
        </p>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setMode('upload')}
              style={{
                padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                border: `1px solid ${C.border}`,
                background: mode === 'upload' ? C.navy : '#fff',
                color: mode === 'upload' ? '#fff' : C.navy,
              }}
            >
              📄 Upload PDF (book/resource)
            </button>
            <button
              onClick={() => setMode('paste')}
              style={{
                padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                border: `1px solid ${C.border}`,
                background: mode === 'paste' ? C.navy : '#fff',
                color: mode === 'paste' ? '#fff' : C.navy,
              }}
            >
              ✏️ Paste text (short excerpts)
            </button>
            <button
              onClick={() => setMode('web')}
              style={{
                padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                border: `1px solid ${C.border}`,
                background: mode === 'web' ? C.navy : '#fff',
                color: mode === 'web' ? '#fff' : C.navy,
              }}
            >
              🌐 Point at a website
            </button>
          </div>

          <form onSubmit={handleUpload}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'web' ? 'Title (optional - defaults to the URL)' : 'Title (e.g. Mindset: The New Psychology of Success)'}
              style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author (optional)"
              style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 14, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
            >
              {STEERING_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label} — {c.description}</option>
              ))}
            </select>

            {mode === 'upload' && (
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ width: '100%', marginBottom: 10 }}
              />
            )}
            {mode === 'paste' && (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste the text here…"
                rows={8}
                style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            )}
            {mode === 'web' && (
              <>
                <input
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://www.interventioncentral.org/"
                  style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 12, color: C.muted, marginTop: -4, marginBottom: 10 }}>
                  Fetches the page once and has Claude write a genuine summary of the concrete strategies
                  it describes (paraphrased, with the source linked) — added to steering context like any
                  other resource. Re-add later to refresh if the page changes.
                </p>
              </>
            )}

            <Tooltip text="Saves this source to your steering library, sorted into the category above — it'll ground every future generation that uses that category." width={240}>
              <button
                type="submit"
                disabled={uploading}
                style={{ padding: '10px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? 'Processing…' : mode === 'upload' ? '+ Upload & Extract' : '+ Add Document'}
              </button>
            </Tooltip>
          </form>
        </div>

        {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: '#c0392b', marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ color: C.muted, padding: 20 }}>Loading…</div>
        ) : (
          grouped.map((cat) => (
            <div key={cat.key} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 20px', background: C.navy, color: '#fff' }}>
                <div style={{ fontWeight: 700 }}>{cat.label} ({cat.docs.length})</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{cat.description}</div>
              </div>
              {cat.docs.length === 0 ? (
                <div style={{ padding: 16, color: C.muted, fontStyle: 'italic', fontSize: 13 }}>Nothing here yet.</div>
              ) : (
                cat.docs.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.navy }}>
                        {d.source_type === 'web' && '🌐 '}{d.title}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        {d.author ? `${d.author} · ` : ''}
                        {d.num_pages ? `${d.num_pages} pages · ` : ''}
                        {d.char_count ? `${Math.round(d.char_count / 1000)}k characters` : ''}
                        {d.source_url && (
                          <> · <a href={d.source_url} target="_blank" rel="noreferrer" style={{ color: C.gold }}>source ↗</a></>
                        )}
                      </div>
                    </div>
                    <Tooltip text="Removes this source from your steering library — future generations won't reference it anymore." width={220}>
                      <button
                        onClick={() => removeDoc(d.id)}
                        style={{ padding: '4px 10px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: '#c0392b', fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </Tooltip>
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}



