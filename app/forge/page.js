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
  tpt_package_ready: { label: '📦 TPT Package Ready', color: '#7a3c8a' },
  published_tpt: { label: '✓ Published on TPT', color: '#1a7a3e' },
}

export default function ForgePage() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({}) // id -> draft text
  const [busyId, setBusyId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    fetch('/api/forge')
      .then((r) => r.json())
      .then((d) => setResources(d.resources || []))
      .finally(() => setLoading(false))
  }, [])

  async function bulkImportTpt(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      const res = await fetch('/api/forge/bulk-upload-tpt', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResources((prev) => [...(data.imported || []), ...prev])
      setImportResult({ count: data.imported.length, errors: data.errors })
    } catch (e) {
      setImportResult({ count: 0, errors: [{ error: e.message }] })
    } finally {
      setImporting(false)
    }
  }

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

  async function generateTptPackage(r) {
    setBusyId(r.id)
    try {
      const res = await fetch('/api/forge/generate-tpt-package', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'tpt_package_ready', tpt_package: data.tpt_package } : x)))
    } catch (e) {
      alert(`Couldn't generate TPT package: ${e.message}`)
    } finally {
      setBusyId(null)
    }
  }

  function downloadTptPackage(r) {
    const p = r.tpt_package
    if (!p) return
    const text = `PRODUCT TITLE\n${p.productTitle}\n\nDESCRIPTION\n${p.description}\n\nPREVIEW BLURB\n${p.previewBlurb}\n\nSUGGESTED TAGS\n${(p.suggestedTags || []).join(', ')}\n\nSUGGESTED PRICE RANGE\n${p.suggestedPriceRange}\n\n--- SELLER NOTE (not for the public listing) ---\n${p.sellerNote}\n`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(r.title || 'tpt-package').replace(/[^a-z0-9]+/gi, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
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

      <div style={{ background: '#fff', border: '1px solid #d9b8e8', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#7a3c8a', marginBottom: 4 }}>📚 Import Your TPT Purchases</div>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>
          Upload PDFs of resources you've already bought on TPT -- they'll land here to edit/remix and push into AI Steering, so generation can draw on material you already own. PDF only for now.
        </p>
        <label style={{ display: 'inline-block', padding: '6px 14px', background: '#7a3c8a', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {importing ? 'Importing…' : '📎 Choose PDF(s) to Import'}
          <input
            type="file" accept="application/pdf" multiple style={{ display: 'none' }}
            disabled={importing}
            onChange={(e) => bulkImportTpt(e.target.files)}
          />
        </label>
        {importResult && (
          <div style={{ marginTop: 8, fontSize: 11 }}>
            {importResult.count > 0 && <span style={{ color: '#1a7a3e' }}>✓ Imported {importResult.count} file{importResult.count > 1 ? 's' : ''}.</span>}
            {importResult.errors?.length > 0 && (
              <div style={{ color: '#a33', marginTop: 4 }}>
                {importResult.errors.map((e, i) => <div key={i}>{e.filename ? `${e.filename}: ` : ''}{e.error}</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {resources.map((r) => {
        const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.raw
        return (
          <div key={r.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
                  {r.title} <span style={{ fontSize: 10, color: '#999', fontWeight: 400 }}>({r.source_type === 'pdf' ? 'PDF' : 'URL'})</span>
                  {r.origin === 'tpt_purchase' && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#7a3c8a', background: '#f5eafa', border: '1px solid #d9b8e8', borderRadius: 4, padding: '1px 6px', marginLeft: 6 }}>
                      📚 TPT Purchase
                    </span>
                  )}
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
                onClick={() => runAction(r, 'mark_for_tpt')} disabled={busyId === r.id || ['marked_for_tpt', 'tpt_package_ready'].includes(r.status)}
                style={{ padding: '5px 12px', background: '#7a3c8a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: ['marked_for_tpt', 'tpt_package_ready'].includes(r.status) ? 'default' : 'pointer', opacity: ['marked_for_tpt', 'tpt_package_ready'].includes(r.status) ? 0.6 : 1 }}
              >
                {['marked_for_tpt', 'tpt_package_ready'].includes(r.status) ? '🏷 Marked for TPT' : '🏷 Mark for TPT'}
              </button>
              {['marked_for_tpt', 'tpt_package_ready'].includes(r.status) && (
                <button
                  onClick={() => generateTptPackage(r)} disabled={busyId === r.id}
                  style={{ padding: '5px 12px', background: '#fff', border: '1px solid #7a3c8a', color: '#7a3c8a', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  {busyId === r.id ? 'Generating…' : r.tpt_package ? '↻ Regenerate TPT Package' : '📦 Generate TPT Package'}
                </button>
              )}
            </div>

            {r.tpt_package && (
              <div style={{ marginTop: 10, background: '#f5eafa', border: '1px solid #d9b8e8', borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7a3c8a', marginBottom: 6 }}>TPT Listing Prep -- copy/paste into your TPT listing form</div>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 4 }}><strong>Title:</strong> {r.tpt_package.productTitle}</div>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 4, whiteSpace: 'pre-wrap' }}><strong>Description:</strong> {r.tpt_package.description}</div>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 4 }}><strong>Preview blurb:</strong> {r.tpt_package.previewBlurb}</div>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 4 }}><strong>Tags:</strong> {(r.tpt_package.suggestedTags || []).join(', ')}</div>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}><strong>Suggested price:</strong> {r.tpt_package.suggestedPriceRange}</div>
                <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginBottom: 8 }}>Seller note (not part of the listing): {r.tpt_package.sellerNote}</div>
                <button
                  onClick={() => downloadTptPackage(r)}
                  style={{ padding: '5px 12px', background: '#7a3c8a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  ⬇ Download as .txt
                </button>
                <p style={{ fontSize: 10, color: '#999', marginTop: 6, marginBottom: 0 }}>
                  There's no automatic publishing to TPT -- you still create and publish the actual listing yourself on teacherspayteachers.com. This is prep copy only.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
