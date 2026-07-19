'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { COLORS as C } from '@/lib/theme'

// Persistent, prominent resource-adding widget -- shows on the main
// dashboard and every page that follows, not tucked into one specific
// unit's card like the original per-unit upload button (which was too
// small/easy to miss, per Aj 2026-07-19). Subject-agnostic: whatever you
// add here isn't tied to one unit, it's just "things I use across
// whatever I'm teaching." Every PDF or URL added here also lands in
// Project Forge automatically (same /api/units/upload-resource and
// /api/units/add-url-resource routes the per-unit version uses, just
// called without a subject/unitName since this isn't unit-specific).
export default function GlobalResourceWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [addingUrl, setAddingUrl] = useState(false)
  const [urlText, setUrlText] = useState('')
  const [feedback, setFeedback] = useState(null) // { type: 'success'|'error', text }

  if (pathname?.startsWith('/auth')) return null

  async function uploadFile(file) {
    if (!file) return
    setUploading(true)
    setFeedback(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/units/upload-resource', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeedback({ type: 'success', text: `"${file.name}" added -- now in Project Forge too.` })
    } catch (e) {
      setFeedback({ type: 'error', text: `Couldn't upload: ${e.message}` })
    } finally {
      setUploading(false)
    }
  }

  async function addUrl() {
    const url = urlText.trim()
    if (!url) return
    setAddingUrl(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/units/add-url-resource', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeedback({ type: 'success', text: `Link added -- now in Project Forge too.` })
      setUrlText('')
    } catch (e) {
      setFeedback({ type: 'error', text: `Couldn't add that URL: ${e.message}` })
    } finally {
      setAddingUrl(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 24, left: 24, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: C.navy, color: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          fontSize: 15, fontWeight: 700, fontFamily: 'Georgia, serif',
        }}
      >
        📎 Add Resources
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 24, zIndex: 200, width: 420, maxWidth: 'calc(100vw - 48px)',
      background: '#fff', border: `2px solid ${C.navy}`, borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>
            Add resources to use in any subject you are teaching
          </h2>
          <p style={{ fontSize: 12, color: '#777', margin: '6px 0 0' }}>
            Upload a PDF, or paste a website URL you use while teaching. Everything you add here is
            saved automatically into Project Forge for editing and reuse.
          </p>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: '#999', padding: 0, marginLeft: 8 }}>×</button>
      </div>

      <div style={{ padding: '16px 20px 20px' }}>
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 16px', background: C.gold, color: '#fff', borderRadius: 8,
          fontSize: 15, fontWeight: 700, cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1,
        }}>
          {uploading ? 'Uploading…' : '📎 Upload a PDF Resource'}
          <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploading} onChange={(e) => uploadFile(e.target.files?.[0])} />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 11, color: '#999' }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: C.navy, margin: '0 0 6px' }}>
          Add a website URL you use while teaching
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUrl()}
            placeholder="https://…"
            style={{ flex: 1, fontSize: 13, padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 6 }}
          />
          <button
            onClick={addUrl}
            disabled={addingUrl || !urlText.trim()}
            style={{ padding: '9px 16px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: addingUrl || !urlText.trim() ? 0.5 : 1 }}
          >
            {addingUrl ? 'Adding…' : 'Add'}
          </button>
        </div>

        {feedback && (
          <p style={{ fontSize: 12, marginTop: 12, color: feedback.type === 'success' ? '#1a7a3e' : '#a33' }}>
            {feedback.type === 'success' ? '✓ ' : ''}{feedback.text}
          </p>
        )}
      </div>
    </div>
  )
}
