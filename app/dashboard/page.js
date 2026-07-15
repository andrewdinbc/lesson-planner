'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import Tooltip from '@/components/Tooltip'

// NOTE: inline styles throughout, matching the rest of this codebase
// (Header.jsx, app/units, app/week, app/year-plan). Tailwind is NOT
// installed in this project.
const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }

export default function Dashboard() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from('micro_units')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setUnits(data)
      setLoading(false)
    }
    fetchUnits()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this micro-unit?')) return
    const { error } = await supabase.from('micro_units').delete().eq('id', id)
    if (!error) setUnits(units.filter((u) => u.id !== id))
  }

  const handleDuplicate = async (unit) => {
    const newUnit = { ...unit }
    delete newUnit.id
    const { data, error } = await supabase.from('micro_units').insert([newUnit]).select()
    if (!error && data) setUnits([data[0], ...units])
  }

  if (loading) {
    return <div style={{ padding: 32, fontFamily: 'Georgia, serif', color: '#666' }}>Loading…</div>
  }

  const cardBtn = {
    background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px',
    fontSize: 13, fontWeight: 600, color: C.navy, textDecoration: 'none', display: 'inline-block',
  }
  const actionBtn = (bg) => ({
    background: bg, color: '#fff', padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
    textAlign: 'center', textDecoration: 'none', border: 'none', cursor: 'pointer', flex: 1,
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Tooltip text="4 short inventories (~10 min, optional) so AI-generated plans fit how you actually teach." position="bottom">
          <Link href="/inventories" style={{
            display: 'block', marginBottom: 24, background: '#fff', border: `1px solid ${C.border}`,
            borderRadius: 10, padding: 18, textDecoration: 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>📋 Tell us about your teaching style</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  4 short inventories (~10 min, optional) so AI-generated plans fit how you actually teach.
                </div>
              </div>
              <span style={{ color: C.gold, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', marginLeft: 16 }}>Start →</span>
            </div>
          </Link>
        </Tooltip>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Tooltip text="Set your Year Structure lens and how much time each period gets" position="top">
            <Link href="/year-plan" style={cardBtn}>🗓️ Year Plan</Link>
          </Tooltip>
          <Tooltip text="Set priority weighting for each unit within a subject" position="top">
            <Link href="/units" style={cardBtn}>🎯 Unit Priorities</Link>
          </Tooltip>
          <Tooltip text="Build your weekly class schedule with fixed blocks" position="top">
            <Link href="/week" style={cardBtn}>📅 Weekly Schedule</Link>
          </Tooltip>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ color: C.navy, fontSize: 30, margin: '0 0 4px' }}>Dashboard</h1>
            <p style={{ color: '#666', fontSize: 14, margin: 0 }}>Manage your micro-units</p>
          </div>
          <Tooltip text="Create a new micro-unit from scratch" position="left">
            <Link href="/micro-units/new" style={{
              background: C.gold, color: '#fff', padding: '10px 22px', borderRadius: 6,
              fontWeight: 600, textDecoration: 'none', fontSize: 14,
            }}>
              + New Micro-Unit
            </Link>
          </Tooltip>
        </div>

        {units.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#888', fontSize: 16, marginBottom: 16 }}>No micro-units yet</p>
            <Tooltip text="Start creating your first lesson unit" position="top">
              <Link href="/micro-units/new" style={{
                display: 'inline-block', background: C.gold, color: '#fff', padding: '10px 22px',
                borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: 14,
              }}>
                Create First Unit
              </Link>
            </Tooltip>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {units.map((unit) => (
              <div key={unit.id} style={{
                background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden',
              }}>
                <div style={{ background: C.bg, padding: 14, borderBottom: `1px solid ${C.border}` }}>
                  <h3 style={{ color: C.navy, fontSize: 16, margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {unit.title}
                  </h3>
                  <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{unit.grade_level}</p>
                </div>
                <div style={{ padding: 14 }}>
                  <p style={{
                    fontSize: 13, color: '#666', marginBottom: 14, display: '-webkit-box',
                    WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {unit.description}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tooltip text="View and edit unit details" position="top">
                      <Link href={`/micro-units/${unit.id}`} style={actionBtn(C.navy)}>View</Link>
                    </Tooltip>
                    <Tooltip text="Create a copy of this unit" position="top">
                      <button onClick={() => handleDuplicate(unit)} style={actionBtn(C.green)}>Duplicate</button>
                    </Tooltip>
                    <Tooltip text="Permanently delete this unit" position="top">
                      <button onClick={() => handleDelete(unit.id)} style={actionBtn('#a33')}>Delete</button>
                    </Tooltip>
                  </div>
                </div>
                <div style={{ background: C.bg, padding: '10px 14px', borderTop: `1px solid ${C.border}`, fontSize: 11, color: '#999' }}>
                  Created: {new Date(unit.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
