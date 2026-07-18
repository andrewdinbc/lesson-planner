'use client'
import { useState, useEffect } from 'react'
import { COLORS as C, FONT_BODY } from '@/lib/theme'
import { LA_CATEGORIES, categorizeLA } from '@/lib/language-arts-categories'

// Step 2 of the Content -> Resources -> Assessment flow (Aj, 2026-07-17).
// For every unit approved in step 1 (Unit Priorities' Content/Curricular
// Competency tabs), the teacher either uploads their own resources/
// activities, pastes a URL they like using, or has AI generate resources
// grounded in their steering documents. This is deliberately its own step,
// separate from Content -- resources are HOW you cover something, not
// WHAT you're covering.
//
// Every PDF upload or URL also lands in Project Forge (a separate app --
// project-forge, https://project-forge-omega.vercel.app -- Style Lab
// section) for
// editing/remixing and later graduation into AI steering docs or a TPT
// listing -- see /api/units/upload-resource and /api/units/add-url-resource.
const LA_CAT_COLORS = {
  reading: { bg: '#eef6f0', border: '#b8dcc2', text: '#2f6b41' },
  writing: { bg: '#fbf3e9', border: '#e6c893', text: '#a06b1f' },
  oral: { bg: '#eef1fb', border: '#bcc7ef', text: '#3a4fa0' },
}

export default function ResourcesPage() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingKey, setGeneratingKey] = useState(null)
  const [uploadingKey, setUploadingKey] = useState(null)
  const [addingUrlKey, setAddingUrlKey] = useState(null)
  const [noteText, setNoteText] = useState({}) // unitKey -> string
  const [urlText, setUrlText] = useState({}) // unitKey -> string

  useEffect(() => {
    fetch('/api/unit-priorities')
      .then((r) => r.json())
      .then((d) => setUnits((d.units || []).filter((u) => !u.removed)))
      .finally(() => setLoading(false))
  }, [])

  const unitKey = (u) => `${u.subject}::${u.unit_name}`

  async function saveResources(u, resources) {
    const res = await fetch('/api/unit-priorities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: [{ subject: u.subject, unit_name: u.unit_name, resources }] }),
    })
    if (res.ok) {
      setUnits((prev) => prev.map((x) => (x.subject === u.subject && x.unit_name === u.unit_name ? { ...x, resources } : x)))
    }
  }

  async function generateResources(u) {
    setGeneratingKey(unitKey(u))
    try {
      const res = await fetch('/api/units/generate-resources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: u.subject, unitName: u.unit_name, contentSummary: u.content_summary,
          curricularCompetency: u.curricular_competency, grades: u.grades, category: u.la_category,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await saveResources(u, [...(u.resources || []), ...data.resources])
    } catch (e) {
      alert(`Couldn't generate resources: ${e.message}`)
    } finally {
      setGeneratingKey(null)
    }
  }

  async function uploadResource(u, file) {
    if (!file) return
    const key = unitKey(u)
    setUploadingKey(key)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('subject', u.subject)
      formData.append('unitName', u.unit_name)
      const res = await fetch('/api/units/upload-resource', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await saveResources(u, [...(u.resources || []), data.resource])
    } catch (e) {
      alert(`Couldn't upload: ${e.message}`)
    } finally {
      setUploadingKey(null)
    }
  }

  async function addUrlResource(u) {
    const key = unitKey(u)
    const url = (urlText[key] || '').trim()
    if (!url) return
    setAddingUrlKey(key)
    try {
      const res = await fetch('/api/units/add-url-resource', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, subject: u.subject, unitName: u.unit_name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await saveResources(u, [...(u.resources || []), data.resource])
      setUrlText((prev) => ({ ...prev, [key]: '' }))
    } catch (e) {
      alert(`Couldn't add that URL: ${e.message}`)
    } finally {
      setAddingUrlKey(null)
    }
  }

  function addNote(u) {
    const key = unitKey(u)
    const text = (noteText[key] || '').trim()
    if (!text) return
    saveResources(u, [...(u.resources || []), { type: 'teacher_note', label: text, detail: '', uploaded_at: new Date().toISOString() }])
    setNoteText((prev) => ({ ...prev, [key]: '' }))
  }

  function removeResource(u, idx) {
    const next = (u.resources || []).filter((_, i) => i !== idx)
    saveResources(u, next)
  }

  const bySubject = units.reduce((acc, u) => {
    (acc[u.subject] ||= []).push(u)
    return acc
  }, {})

  const renderUnitResources = (u, colors) => {
    const key = unitKey(u)
    return (
      <div key={key} style={{ background: '#fff', border: `1px solid ${colors?.border || C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{u.unit_name}</div>
        {u.content_summary && <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>{u.content_summary}</p>}

        {(u.resources || []).length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {u.resources.map((r, i) => (
              <li key={i} style={{ fontSize: 12, color: '#444', marginBottom: 4 }}>
                <strong>{r.label}</strong>
                {r.type === 'ai_generated' && <span style={{ fontSize: 9, color: colors?.text || C.gold, marginLeft: 6 }}>AI suggested</span>}
                {r.type === 'teacher_upload' && (
                  <span style={{ fontSize: 9, color: '#888', marginLeft: 6 }}>
                    {r.source_url ? 'from URL' : 'uploaded'} —{' '}
                    {r.forge_resource_id ? <a href="https://project-forge-omega.vercel.app/dashboard/style-lab" target="_blank" rel="noreferrer" style={{ color: '#7a3c8a' }}>edit in Style Lab</a> : 'in Forge'}
                  </span>
                )}
                {r.detail && <div style={{ fontSize: 11, color: '#777' }}>{r.detail.slice(0, 200)}{r.detail.length > 200 ? '…' : ''}</div>}
                <button onClick={() => removeResource(u, i)} style={{ fontSize: 10, color: '#a33', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>remove</button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => generateResources(u)}
            disabled={generatingKey === key}
            style={{ padding: '5px 12px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            {generatingKey === key ? 'Generating…' : '✨ AI Generate Resources'}
          </button>

          <label style={{ padding: '5px 12px', background: '#f0eee7', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {uploadingKey === key ? 'Uploading…' : '📎 Upload My Own (PDF)'}
            <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploadingKey === key} onChange={(e) => uploadResource(u, e.target.files?.[0])} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            value={urlText[key] || ''}
            onChange={(e) => setUrlText((prev) => ({ ...prev, [key]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addUrlResource(u)}
            placeholder="Or paste a URL you like using…"
            style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 5 }}
          />
          <button onClick={() => addUrlResource(u)} disabled={addingUrlKey === key} style={{ padding: '5px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
            {addingUrlKey === key ? 'Adding…' : 'Add URL'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            value={noteText[key] || ''}
            onChange={(e) => setNoteText((prev) => ({ ...prev, [key]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addNote(u)}
            placeholder="Or just type a resource you already use…"
            style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 5 }}
          />
          <button onClick={() => addNote(u)} style={{ padding: '5px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>Add</button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 40, fontFamily: FONT_BODY }}>Loading…</div>

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 4 }}>Resources</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
        Step 2 of 3. For each unit you approved, upload the resources you already use, paste a link, or have AI suggest some grounded in your steering documents. Assessment practices come next.
      </p>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
        Anything you upload or link also lands in <a href="https://project-forge-omega.vercel.app/dashboard/style-lab" target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 600 }}>Style Lab</a> (part of the Project Forge app) -- edit it down to the best parts, then push it into AI Steering or mark it for a future TPT listing.
      </p>

      {Object.entries(bySubject).map(([subject, subjectUnits]) => {
        const isLA = subject === 'Language Arts'
        return (
          <div key={subject} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, color: C.navy, marginBottom: 10 }}>{subject}</h2>
            {isLA ? (
              LA_CATEGORIES.map((cat) => {
                const catUnits = subjectUnits.filter((u) => {
                  const cats = u.la_categories?.length ? u.la_categories : [u.la_category || categorizeLA(u.unit_name, u.content_summary)]
                  return cats.includes(cat.key)
                })
                if (catUnits.length === 0) return null
                const colors = LA_CAT_COLORS[cat.key]
                return (
                  <div key={cat.key} style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 12, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{cat.label}</h3>
                    {catUnits.map((u) => renderUnitResources(u, colors))}
                  </div>
                )
              })
            ) : (
              subjectUnits.map((u) => renderUnitResources(u, null))
            )}
          </div>
        )
      })}

      {units.length === 0 && (
        <p style={{ fontSize: 13, color: '#888' }}>No units approved yet -- go back to Unit Priorities and approve some Content first.</p>
      )}
    </div>
  )
}
