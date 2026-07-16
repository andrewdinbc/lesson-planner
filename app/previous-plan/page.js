'use client'
import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { COLORS as C, FONT_BODY } from '@/lib/theme'

export default function PreviousPlanPage() {
  const authChecked = useRequireAuth()
  const [upload, setUpload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/previous-plan')
      .then((r) => r.json())
      .then((d) => setUpload(d.upload))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/previous-plan', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUpload(data.upload)
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!confirm('Remove this uploaded plan?')) return
    await fetch('/api/previous-plan', { method: 'DELETE' })
    setUpload(null)
  }

  if (!authChecked || loading) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Upload & Modify My Previous Plan</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
          If you already have a plan from a previous year, upload it here (PDF). When you generate a new
          Year, Month, Week, Day, or Lesson plan, you'll be able to have AI adapt your existing plan instead
          of starting from scratch.
        </p>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          {upload ? (
            <div>
              <p style={{ fontSize: 14, color: C.navy, fontWeight: 700, margin: '0 0 4px' }}>✓ {upload.filename}</p>
              <p style={{ fontSize: 12, color: '#999', margin: '0 0 16px' }}>
                Uploaded {new Date(upload.uploaded_at).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{
                  padding: '8px 16px', background: C.gold, color: '#fff', borderRadius: 6, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}>
                  {uploading ? 'Uploading…' : 'Replace with a different file'}
                  <input type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
                </label>
                <button onClick={handleRemove} style={{
                  padding: '8px 16px', background: 'none', color: '#a33', border: '1px solid #f5b7b1', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                }}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label style={{
              display: 'inline-block', padding: '10px 22px', background: C.gold, color: '#fff', borderRadius: 8,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              {uploading ? 'Uploading…' : '📄 Upload Previous Plan (PDF)'}
              <input type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          )}
          {error && <p style={{ color: '#a33', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>

        {upload && (upload.inferred_grades?.length > 0 || upload.inferred_subjects?.length > 0 || upload.inferred_teaching_style_notes) && (
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
              Here's what we could tell from your plan
            </div>
            {upload.inferred_grades?.length > 0 && (
              <p style={{ fontSize: 13, color: '#555', margin: '0 0 6px' }}>
                <strong>Grade(s):</strong> {upload.inferred_grades.join(', ')}
              </p>
            )}
            {upload.inferred_subjects?.length > 0 && (
              <p style={{ fontSize: 13, color: '#555', margin: '0 0 6px' }}>
                <strong>Subject(s):</strong> {upload.inferred_subjects.join(', ')}
              </p>
            )}
            {upload.inferred_teaching_style_notes && (
              <p style={{ fontSize: 13, color: '#555', margin: '0 0 14px' }}>
                <strong>Teaching style notes:</strong> {upload.inferred_teaching_style_notes}
              </p>
            )}
            {(upload.inferred_grades?.length > 0 || upload.inferred_subjects?.length > 0) && (
              <a
                href={`/class-setup?grades=${encodeURIComponent((upload.inferred_grades || []).join(','))}&subjects=${encodeURIComponent((upload.inferred_subjects || []).join(','))}`}
                style={{
                  display: 'inline-block', padding: '8px 18px', background: C.gold, color: '#fff', borderRadius: 6,
                  fontWeight: 600, fontSize: 13, textDecoration: 'none',
                }}
              >
                Use these for "What do you teach?" →
              </a>
            )}
            <p style={{ fontSize: 11, color: '#999', marginTop: 10, marginBottom: 0 }}>
              You'll be able to confirm or change any of this on the next page -- nothing is saved automatically.
            </p>
          </div>
        )}

        {upload && (
          <a href="/generate?type=year" style={{
            display: 'inline-block', padding: '10px 24px', background: C.navy, color: '#fff', borderRadius: 8,
            fontWeight: 600, fontSize: 14, textDecoration: 'none',
          }}>
            Generate a plan using this →
          </a>
        )}
      </div>
    </div>
  )
}

