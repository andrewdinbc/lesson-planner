'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import Tooltip from '@/components/Tooltip'
import { COLORS as C, FONT_BODY, FONT_BRAND } from '@/lib/theme'

// Layout mirrors Student Portfolio's /teacher dashboard (sidebar + action
// cards) so the two apps read as one ecosystem -- same structure, same
// exact color tokens, same fonts (see lib/theme.js).

function ActionCard({ href, emoji, title, desc, tooltip, number, skippable, state, skipStepKey }) {
  // Three genuinely distinct visual treatments -- 'done' gets a real
  // checkmark and the strongest fade; 'skipped' is an acknowledged gap,
  // not an achievement, so it gets a dash (not a checkmark) and a
  // noticeably lighter fade so the two are never confusable at a glance.
  const isDone = state === 'done'
  const isSkipped = state === 'skipped'
  const isResolved = isDone || isSkipped

  const card = (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      background: isDone ? '#f5f5f2' : isSkipped ? '#fafaf8' : C.card,
      border: `1px solid ${isSkipped ? '#e5ddc8' : C.border}`,
      borderStyle: isSkipped ? 'dashed' : 'solid',
      borderRadius: 12, padding: 20, textDecoration: 'none', flex: 1, minWidth: 260, position: 'relative',
      opacity: isDone ? 0.65 : isSkipped ? 0.85 : 1,
    }}>
      {number != null && (
        <div style={{
          position: 'absolute', top: -10, left: -10, width: 26, height: 26, borderRadius: '50%',
          background: isDone ? C.green : isSkipped ? '#b0a688' : C.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
        }}>
          {isDone ? '✓' : isSkipped ? '–' : number}
        </div>
      )}
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: C.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
        filter: isResolved ? 'grayscale(1)' : 'none',
      }}>
        {emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: isDone ? '#888' : isSkipped ? '#a69a6f' : '#1a1a1a', fontSize: 16, marginBottom: 3 }}>
          {title}{isDone ? ' — Done' : isSkipped ? ' — Skipped' : ''}
        </div>
        <div style={{ fontSize: 13, color: '#999' }}>{desc}</div>
      </div>
      <span style={{ color: '#bbb', fontSize: 18 }}>›</span>
    </Link>
  )
  const wrapped = tooltip ? <Tooltip text={tooltip} position="top">{card}</Tooltip> : card

  if (!skippable || isResolved) return wrapped

  return (
    <div>
      {wrapped}
      <div style={{ textAlign: 'right', marginTop: 6 }}>
        <button
          onClick={async () => {
            try {
              // Inventories has its own dedicated skipped column (predates
              // the generic mechanism); everything else uses the generic
              // teacher_step_skips endpoint via skipStepKey.
              const url = skipStepKey ? '/api/skip-step' : '/api/teacher-inventories'
              const body = skipStepKey ? { stepKey: skipStepKey } : { skipped: true }
              const res = await fetch(url, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
              if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                alert(`Couldn't skip: ${data.error || res.status}. Try refreshing the page and logging in again if this keeps happening.`)
                return
              }
              window.location.reload()
            } catch (e) {
              alert(`Couldn't skip: ${e.message}`)
            }
          }}
          style={{ fontSize: 12, color: '#999', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({})
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

    fetch('/api/dashboard-status')
      .then((res) => res.ok ? res.json() : {})
      .then(setStatus)
      .catch(() => {})
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

  const actionBtn = (bg) => ({
    background: bg, color: '#fff', padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
    textAlign: 'center', textDecoration: 'none', border: 'none', cursor: 'pointer', flex: 1,
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, display: 'flex' }}>
      {/* Sidebar -- same structure/width as Student Portfolio's /teacher sidebar */}
      <div style={{ width: 240, background: C.card, borderRight: `1px solid ${C.border}`, padding: 24, flexShrink: 0 }}>
        <div style={{ fontFamily: FONT_BRAND, fontWeight: 700, color: C.navy, fontSize: 18, marginBottom: 28 }}>
          chalk<span style={{ color: C.gold }}>&circuit</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>Micro-Units</span>
          <Link href="/micro-units/new" title="Create a new micro-unit" style={{ color: C.navy, textDecoration: 'none', fontSize: 18, fontWeight: 700 }}>+</Link>
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: '#999' }}>Loading…</div>
        ) : units.length === 0 ? (
          <div style={{ fontSize: 13, color: '#999' }}>No micro-units yet</div>
        ) : (
          units.slice(0, 8).map((u) => (
            <Link key={u.id} href={`/micro-units/${u.id}`} title={u.title} style={{
              display: 'block', padding: '8px 10px', borderRadius: 8, fontSize: 13, marginBottom: 4,
              color: '#555', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {u.title}
            </Link>
          ))
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 40, maxWidth: 1100 }}>
        <ActionCard href="/inventories" emoji="📋" title="Tell us about your teaching style" number={1} skippable state={status.inventories}
          desc="4 short inventories (~10 min, optional) so AI-generated plans fit how you actually teach"
          tooltip="4 short inventories (~10 min, optional) so AI-generated plans fit how you actually teach." />

        <ActionCard href="/class-setup" emoji="🏫" title="What do you teach?" number={2} state={status.classSetup} skippable skipStepKey="class_setup"
          desc="Your grades and subjects — this needs to come before Year Plan"
          tooltip="Your grades and subjects — this needs to come before Year Plan" />

        <h1 style={{ fontSize: 24, color: C.navy, margin: '28px 0 20px' }}>Plan your year</h1>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
          <ActionCard href="/year-plan" emoji="🗓️" title="Year Plan" number={3} state={status.yearPlan}
            desc="Set your Year Structure lens and how much time each period gets"
            tooltip="Set your Year Structure lens and how much time each period gets" />
          <ActionCard href="/units" emoji="🎯" title="Unit Priorities" number={4} state={status.unitPriorities} skippable skipStepKey="unit_priorities"
            desc="Set priority weighting for each unit within a subject"
            tooltip="Set priority weighting for each unit within a subject" />
          <ActionCard href="/week" emoji="📅" title="Weekly Schedule" number={5} state={status.weeklySchedule}
            desc="Build your weekly class schedule with fixed blocks"
            tooltip="Build your weekly class schedule with fixed blocks" />
          <ActionCard href="/resources" emoji="🔗" title="Add Additional Resources" number={6} state={status.resources}
            desc="Add sites and materials you like so the AI can reference them"
            tooltip="Add sites and materials you like so the AI can reference them" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, color: C.navy, margin: 0 }}>Micro-Units</h2>
          <Tooltip text="Create a new micro-unit from scratch" position="left">
            <Link href="/micro-units/new" style={{
              background: C.gold, color: '#fff', padding: '10px 22px', borderRadius: 6,
              fontWeight: 600, textDecoration: 'none', fontSize: 14,
            }}>
              + New Micro-Unit
            </Link>
          </Tooltip>
        </div>

        {loading ? (
          <div style={{ color: '#999', padding: 20 }}>Loading…</div>
        ) : units.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, textAlign: 'center', color: '#888' }}>
            No micro-units yet.
            <div style={{ marginTop: 16 }}>
              <Tooltip text="Start creating your first lesson unit" position="top">
                <Link href="/micro-units/new" style={{
                  display: 'inline-block', background: C.gold, color: '#fff', padding: '10px 22px',
                  borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: 14,
                }}>
                  Create First Unit
                </Link>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {units.map((unit) => (
              <div key={unit.id} style={{
                background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden',
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
                      <button onClick={() => handleDelete(unit.id)} style={actionBtn(C.red)}>Delete</button>
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








