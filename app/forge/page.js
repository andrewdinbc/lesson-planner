'use client'
import { useState, useEffect } from 'react'
import { COLORS as C, FONT_BODY } from '@/lib/theme'

// Project Forge (Aj, 2026-07-17): every PDF or URL a teacher uploads while
// building resources for a unit lands here too. Take the best parts, edit
// them, then either push into AI steering (live in generation immediately)
// or mark for a future standalone TPT listing.
const STATUS_LABELS = {
  raw: { label: 'Not reviewed yet', color: '#999' },
  edited: { label: 'Edited', color: '#a06b1f' },
  pushed_to_steering: { label: '✓ Live in AI Steering', color: '#1a7a3e' },
  marked_for_tpt: { label: '🏷 Marked for TPT', color: '#7a3c8a' },
  published_tpt: { label: '✓ Published on TPT', color: '#1a7a3e' },
}

export default function ForgePage() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({}) // id -> draft text
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    fetch('/api/forge')
      .then((r) => r.json())
      .then((d) => setResources(d.resources || []))
      .finally(() => setLoading(false))
  }, [])

  function draftFor(r) {
    return editing[r.id] !== undefined ? editing[r.id] : (r.edited_text || r.original_text || '')
  }

  async function saveEdit(r) {
    setBusyId(r.id)
    try {
      await fetch('/api/forge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, action: 'save_edit', edited_text: draftFor(r) }),
      })
      setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, edited_text: draftFor(r), status: 'edited' } : x)))
    } finally {
      setBusyId(null)
    }
  }

  async function runAction(r, action) {
    setBusyId(r.id)
    try {
      const res = await fetch('/api/forge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: action === 'push_to_steering' ? 'pushed_to_steering' : 'marked_for_tpt' } : x)))
    } catch (e) {
      alert(e.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div style={{ padding: 40, fontFamily: FONT_BODY }}>Loading…</div>

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 4 }}>Project Forge</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
        Everything you've uploaded or linked while building resources lands here. Edit it down to the parts you actually want, then either make it a standing AI preference or flag it for a future TPT listing.
      </p>

      {resources.length === 0 && (
        <p style={{ fontSize: 13, color: '#888' }}>Nothing here yet -- upload a PDF or add a URL from the Resources page.</p>
      )}

      {resources.map((r) => {
        const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.raw
        return (
          <div key={r.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
                  {r.title} <span style={{ fontSize: 10, color: '#999', fontWeight: 400 }}>({r.source_type === 'pdf' ? 'PDF' : 'URL'})</span>
                </div>
                {r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#888' }}>{r.source_url}</a>}
                {(r.subject || r.unit_name) && (
                  <div style={{ fontSize: 11, color: '#999' }}>{[r.subject, r.unit_name].filter(Boolean).join(' — ')}</div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: statusInfo.color, whiteSpace: 'nowrap' }}>{statusInfo.label}</span>
            </div>

            <textarea
              value={draftFor(r)}
              onChange={(e) => setEditing((prev) => ({ ...prev, [r.id]: e.target.value }))}
              rows={6}
              style={{ width: '100%', fontSize: 12, padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => saveEdit(r)} disabled={busyId === r.id}
                style={{ padding: '5px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
              >
                Save Edit
              </button>
              <button
                onClick={() => runAction(r, 'push_to_steering')} disabled={busyId === r.id || r.status === 'pushed_to_steering'}
                style={{ padding: '5px 12px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: r.status === 'pushed_to_steering' ? 'default' : 'pointer', opacity: r.status === 'pushed_to_steering' ? 0.6 : 1 }}
              >
                {r.status === 'pushed_to_steering' ? '✓ In AI Steering' : '→ Push to AI Steering'}
              </button>
              <button
                onClick={() => runAction(r, 'mark_for_tpt')} disabled={busyId === r.id || r.status === 'marked_for_tpt'}
                style={{ padding: '5px 12px', background: '#7a3c8a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: r.status === 'marked_for_tpt' ? 'default' : 'pointer', opacity: r.status === 'marked_for_tpt' ? 0.6 : 1 }}
              >
                {r.status === 'marked_for_tpt' ? '🏷 Marked for TPT' : '🏷 Mark for TPT'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
