'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3', muted: '#8a7d6e' }

const TSI_ITEMS = [
  { cluster: 'Expert', text: 'I maintain high standards for my students.' },
  { cluster: 'Expert', text: 'I want students to leave my course with a well-rounded understanding of the subject.' },
  { cluster: 'Expert', text: 'I spend time answering students\u2019 questions to help them understand the material.' },
  { cluster: 'Formal Authority', text: 'I provide clear expectations for students.' },
  { cluster: 'Formal Authority', text: 'I believe in maintaining a professional distance.' },
  { cluster: 'Formal Authority', text: 'I give students detailed feedback on their performance.' },
  { cluster: 'Personal Model', text: 'I demonstrate how to solve problems step-by-step.' },
  { cluster: 'Personal Model', text: 'I model behaviors I want students to adopt.' },
  { cluster: 'Personal Model', text: 'I encourage students to emulate my approach.' },
  { cluster: 'Facilitator', text: 'I guide students by asking questions.' },
  { cluster: 'Facilitator', text: 'I encourage independent thinking.' },
  { cluster: 'Facilitator', text: 'I design activities that require students to take responsibility.' },
  { cluster: 'Delegator', text: 'I give students freedom to design their own learning projects.' },
  { cluster: 'Delegator', text: 'I encourage peer collaboration.' },
  { cluster: 'Delegator', text: 'I let students take ownership of learning outcomes.' },
]

const TPI_PERSPECTIVES = [
  { key: 'Transmission', label: 'Transmission', desc: 'Teaching as delivering content effectively and accurately.' },
  { key: 'Apprenticeship', label: 'Apprenticeship', desc: 'Teaching through modeling and guided practice.' },
  { key: 'Developmental', label: 'Developmental', desc: 'Teaching by building on students\u2019 prior knowledge and reasoning.' },
  { key: 'Nurturing', label: 'Nurturing', desc: 'Teaching through encouragement, support, and care for the whole learner.' },
  { key: 'Social Reform', label: 'Social Reform', desc: 'Teaching to promote social change and challenge injustice.' },
]

const PHILOSOPHY_ITEMS = [
  { key: 'Progressivism', text: 'Learning should be active and student-centered.' },
  { key: 'Progressivism', text: 'Students learn best through experience and problem-solving.' },
  { key: 'Constructivism', text: 'Students build knowledge through interaction and reflection.' },
  { key: 'Constructivism', text: 'Teachers should facilitate rather than direct learning.' },
  { key: 'Essentialism', text: 'Core academic subjects are the foundation of education.' },
  { key: 'Essentialism', text: 'Teachers should maintain authority and structure.' },
  { key: 'Behaviorism', text: 'Learning is shaped by reinforcement and consequences.' },
  { key: 'Behaviorism', text: 'Clear expectations and routines improve learning.' },
  { key: 'Social Reconstructionism', text: 'Schools should address social inequalities.' },
  { key: 'Social Reconstructionism', text: 'Students should learn to challenge injustice.' },
]

// Condensed version of the Wieman/Gilbert Teaching Practices Inventory
// categories (UBC) - the full instrument is long and item-exact wording
// wasn't provided, so this captures the same practice areas at a
// representative level. Scored as "how often" rather than agree/disagree,
// matching the original TPI's format.
const WIEMAN_PRACTICES = [
  'I share explicit learning goals with students before instruction.',
  'I use pre-class reading or preparation assignments.',
  'I use in-class activities where students work in small groups.',
  'I use clicker questions or similar real-time formative checks during class.',
  'I give students think time before requiring an answer.',
  'I use ungraded or low-stakes formative assessments to guide instruction.',
  'I provide detailed, actionable feedback on assignments (not just a grade).',
  'I use rubrics that are shared with students in advance.',
  'I incorporate peer instruction or peer feedback.',
  'I collect and use data (quiz results, exit tickets) to adjust upcoming lessons.',
]
const FREQ_OPTIONS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Every lesson']

export default function InventoriesPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [tsi, setTsi] = useState({})
  const [tpi, setTpi] = useState({})
  const [phil, setPhil] = useState({})
  const [wieman, setWieman] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [alreadyDone, setAlreadyDone] = useState(false)

  useEffect(() => {
    fetch('/api/teacher-inventories').then(r => r.json()).then(d => {
      if (d.inventory && (d.inventory.completed_at || d.inventory.skipped)) setAlreadyDone(true)
    }).catch(() => {})
  }, [])

  function computeDominant(scoresByCluster) {
    let best = null, bestVal = -Infinity
    for (const [k, v] of Object.entries(scoresByCluster)) {
      if (v > bestVal) { bestVal = v; best = k }
    }
    return best
  }

  async function finish(skipped = false) {
    setSaving(true)
    setError('')
    try {
      let payload = { skipped }
      if (!skipped) {
        const tsiClusters = {}
        TSI_ITEMS.forEach((item, i) => { tsiClusters[item.cluster] = (tsiClusters[item.cluster] || 0) + (tsi[i] || 0) })
        const philClusters = {}
        PHILOSOPHY_ITEMS.forEach((item, i) => {
          const v = phil[i] === 'Agree' ? 1 : phil[i] === 'Disagree' ? -1 : 0
          philClusters[item.key] = (philClusters[item.key] || 0) + v
        })
        payload = {
          skipped: false,
          tsi_scores: tsiClusters,
          tsi_dominant: computeDominant(tsiClusters),
          tpi_scores: tpi,
          tpi_dominant: computeDominant(tpi),
          philosophy_scores: philClusters,
          philosophy_dominant: computeDominant(philClusters),
          wieman_scores: wieman,
        }
      }
      const res = await fetch('/api/teacher-inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      router.push('/generate?type=year')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const box = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }
  const btn = (bg, color = '#fff') => ({ padding: '10px 20px', background: bg, color, border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' })

  if (alreadyDone && step === 0) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 20, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <h1 style={{ color: C.navy }}>You've already completed this</h1>
        <p style={{ color: C.muted, marginBottom: 20 }}>Want to retake it, or head straight to planning?</p>
        <button onClick={() => setAlreadyDone(false)} style={{ ...btn(C.navy), marginRight: 10 }}>Retake Inventories</button>
        <button onClick={() => router.push('/generate?type=year')} style={btn(C.green)}>Go to Year Plan</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: C.navy, fontSize: 22, margin: 0 }}>Get to Know Your Teaching Style</h1>
        {step > 0 && step < 5 && (
          <button onClick={() => finish(true)} disabled={saving}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: C.muted }}>
            Skip &rarr; Go straight to planning
          </button>
        )}
      </div>

      {step === 0 && (
        <div style={box}>
          <p style={{ color: C.navy, lineHeight: 1.6 }}>
            These four short, research-based inventories help the AI understand your teaching style,
            perspective, philosophy, and current practices &mdash; so the lesson plans it generates for you
            actually fit how you teach. Takes about 10 minutes total. Entirely optional.
          </p>
          <ul style={{ color: C.muted, fontSize: 14, lineHeight: 1.8 }}>
            <li>Grasha&ndash;Riechmann Teaching Style Inventory (15 items)</li>
            <li>Teaching Perspectives Inventory (5 items)</li>
            <li>Philosophy of Education Self-Assessment (10 items)</li>
            <li>Teaching Practices Inventory (10 items)</li>
          </ul>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep(1)} style={btn(C.navy)}>Start (10 min)</button>
            <button onClick={() => finish(true)} disabled={saving} style={btn('none', C.muted)}>Skip &rarr; Go straight to planning</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>1. Teaching Style Inventory</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Rate each statement 1 (Strongly Disagree) to 7 (Strongly Agree).</p>
          {TSI_ITEMS.map((item, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{item.text}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5,6,7].map(n => (
                  <button key={n} onClick={() => setTsi(s => ({ ...s, [i]: n }))}
                    style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`, background: tsi[i] === n ? C.navy : '#fff', color: tsi[i] === n ? '#fff' : C.navy, cursor: 'pointer', fontSize: 12 }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setStep(2)} disabled={Object.keys(tsi).length < TSI_ITEMS.length} style={{ ...btn(C.navy), opacity: Object.keys(tsi).length < TSI_ITEMS.length ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>2. Teaching Perspectives</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Rate how strongly each perspective describes your teaching, 1 (Not at all) to 5 (Very much).</p>
          {TPI_PERSPECTIVES.map((p) => (
            <div key={p.key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>{p.desc}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setTpi(s => ({ ...s, [p.key]: n }))}
                    style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`, background: tpi[p.key] === n ? C.navy : '#fff', color: tpi[p.key] === n ? '#fff' : C.navy, cursor: 'pointer', fontSize: 12 }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setStep(3)} disabled={Object.keys(tpi).length < TPI_PERSPECTIVES.length} style={{ ...btn(C.navy), opacity: Object.keys(tpi).length < TPI_PERSPECTIVES.length ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {step === 3 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>3. Philosophy of Education</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Agree, Neutral, or Disagree.</p>
          {PHILOSOPHY_ITEMS.map((item, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{item.text}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Agree', 'Neutral', 'Disagree'].map(opt => (
                  <button key={opt} onClick={() => setPhil(s => ({ ...s, [i]: opt }))}
                    style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: phil[i] === opt ? C.navy : '#fff', color: phil[i] === opt ? '#fff' : C.navy, cursor: 'pointer', fontSize: 12 }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setStep(4)} disabled={Object.keys(phil).length < PHILOSOPHY_ITEMS.length} style={{ ...btn(C.navy), opacity: Object.keys(phil).length < PHILOSOPHY_ITEMS.length ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {step === 4 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>4. Teaching Practices</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>How often do you currently do each of these?</p>
          {WIEMAN_PRACTICES.map((text, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{text}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FREQ_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setWieman(s => ({ ...s, [i]: opt }))}
                    style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: wieman[i] === opt ? C.navy : '#fff', color: wieman[i] === opt ? '#fff' : C.navy, cursor: 'pointer', fontSize: 11 }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {error && <div style={{ color: '#b3261e', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button onClick={() => finish(false)} disabled={saving || Object.keys(wieman).length < WIEMAN_PRACTICES.length} style={{ ...btn(C.green), opacity: (saving || Object.keys(wieman).length < WIEMAN_PRACTICES.length) ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Finish & Go to Year Plan'}
          </button>
        </div>
      )}
    </div>
  )
}
