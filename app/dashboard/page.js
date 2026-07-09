'use client'
import { useState, useEffect } from 'react'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }
const NEXT_TYPE = { year: 'month', month: 'week', week: 'day', day: 'lesson' }
const TYPE_LABEL = { year: 'Year', month: 'Month', week: 'Week', day: 'Day', lesson: 'Lesson' }

function PlanNode({ plan, depth }) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState(null)

  async function toggle() {
    if (!expanded && children === null) {
      const res = await fetch(`/api/plans?parentId=${plan.id}`)
      const d = await res.json()
      setChildren(d.plans || [])
    }
    setExpanded((e) => !e)
  }

  const canHaveChildren = NEXT_TYPE[plan.type]

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
        {canHaveChildren ? (
          <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.navy }}>
            {expanded ? '▼' : '▶'}
          </button>
        ) : <span style={{ width: 14 }} />}
        <span style={{ fontSize: 11, background: C.gold, color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>{TYPE_LABEL[plan.type]}</span>
        <span style={{ fontWeight: plan.type === 'year' ? 700 : 400 }}>{plan.title}</span>
        {canHaveChildren && (
          <a href={`/generate?type=${canHaveChildren}&parentId=${plan.id}`} style={{ marginLeft: 'auto', fontSize: 12, color: C.green }}>
            + Add {TYPE_LABEL[canHaveChildren]}
          </a>
        )}
        {plan.type === 'lesson' && (
          <a href={`/micro-units/new?lessonPlanId=${plan.id}`} style={{ marginLeft: canHaveChildren ? 10 : 'auto', fontSize: 12, color: C.gold }}>
            + Math Micro-Unit
          </a>
        )}
      </div>
      {expanded && children && children.length === 0 && (
        <div style={{ marginLeft: 34, padding: '6px 0', color: '#8a7d6e', fontSize: 13, fontStyle: 'italic' }}>
          No {TYPE_LABEL[canHaveChildren].toLowerCase()} plans yet.
        </div>
      )}
      {expanded && children && children.map((c) => <PlanNode key={c.id} plan={c} depth={depth + 1} />)}
    </div>
  )
}

export default function DashboardPage() {
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plans')
      .then((res) => {
        if (res.status === 401) { window.location.href = '/login'; throw new Error('redirect') }
        return res.json()
      })
      .then((d) => setYears(d.plans || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ color: C.navy, fontSize: 28, margin: 0 }}>Your Plans</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/steering" style={{ padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: 6, color: C.navy, fontSize: 13 }}>📄 Steering Documents</a>
            <a href="/generate?type=year" style={{ padding: '8px 14px', background: C.gold, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>+ New Year Plan</a>
          </div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          {loading ? (
            <div style={{ color: '#8a7d6e' }}>Loading…</div>
          ) : years.length === 0 ? (
            <div style={{ color: '#8a7d6e', fontStyle: 'italic', padding: 12 }}>
              No plans yet. Start with a Year Plan, then drill down to months, weeks, days, and individual lessons.
            </div>
          ) : (
            years.map((y) => <PlanNode key={y.id} plan={y} depth={0} />)
          )}
        </div>
      </div>
    </div>
  )
}
