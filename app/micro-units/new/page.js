'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Tooltip from '@/components/Tooltip'

// Inline styles -- Tailwind is NOT installed in this project (see note in
// components/Tooltip.jsx). Match this theme in any new page.
import { COLORS as C, FONT_BODY } from '@/lib/theme'
const inputStyle = {
  width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, fontFamily: FONT_BODY, boxSizing: 'border-box',
}
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }
const fieldWrap = { marginBottom: 22 }

export default function NewMicroUnit() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '', description: '', grade_level: '9-12', subject: 'General',
    duration_hours: 1, learning_objectives: '', materials: '', assessment_method: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('micro_units').insert([formData]).select()
    setLoading(false)
    if (!error && data) router.push(`/micro-units/${data[0].id}`)
    else alert('Error creating micro-unit')
  }

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('micro_units').insert([{ ...formData, status: 'draft' }]).select()
    setLoading(false)
    if (!error && data) router.push(`/micro-units/${data[0].id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: C.navy, fontSize: 28, margin: '0 0 4px' }}>Create Micro-Unit</h1>
          <p style={{ color: '#666', fontSize: 14, margin: 0 }}>Design a focused learning experience</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`, padding: 28 }}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Unit Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required
              placeholder="e.g., Photosynthesis Basics" style={inputStyle} />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="4"
              placeholder="Brief overview of what students will learn..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
            <div>
              <label style={labelStyle}>Grade Level</label>
              <select name="grade_level" value={formData.grade_level} onChange={handleChange} style={inputStyle}>
                <option>K-2</option><option>3-5</option><option>6-8</option><option>9-12</option><option>Post-Secondary</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Subject</label>
              <select name="subject" value={formData.subject} onChange={handleChange} style={inputStyle}>
                <option>General</option><option>Math</option><option>Science</option><option>ELA</option>
                <option>Social Studies</option><option>Physical Education</option>
              </select>
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Duration (hours)</label>
            <input type="number" name="duration_hours" value={formData.duration_hours} onChange={handleChange}
              min="0.5" step="0.5" style={inputStyle} />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Learning Objectives</label>
            <textarea name="learning_objectives" value={formData.learning_objectives} onChange={handleChange} rows="3"
              placeholder="What students should be able to do after this unit..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Required Materials</label>
            <textarea name="materials" value={formData.materials} onChange={handleChange} rows="3"
              placeholder="List all materials and resources needed..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Assessment Method</label>
            <textarea name="assessment_method" value={formData.assessment_method} onChange={handleChange} rows="3"
              placeholder="How will you assess student understanding?..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <Tooltip text="Save incomplete unit to finish later" position="top">
              <button type="button" onClick={handleSaveDraft} disabled={loading} style={{
                padding: '12px 22px', background: '#8a8a8a', color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, fontSize: 14,
              }}>
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
            </Tooltip>

            <Tooltip text="Return to dashboard without saving" position="top">
              <button type="button" onClick={() => router.push('/dashboard')} style={{
                padding: '12px 22px', background: C.bg, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 8,
                fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}>
                Cancel
              </button>
            </Tooltip>

            <Tooltip text="Create and publish this micro-unit" position="top">
              <button type="submit" disabled={loading} style={{
                flex: 1, padding: '12px 22px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, fontSize: 14,
              }}>
                {loading ? 'Creating...' : 'Create & Publish'}
              </button>
            </Tooltip>
          </div>
        </form>
      </div>
    </div>
  )
}
