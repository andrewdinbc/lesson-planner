'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { computeCurriculumFit } from '@/lib/curriculum-models'

import { COLORS as C, FONT_BODY } from '@/lib/theme'

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

// Full Teaching Practices Inventory, provided by Aj as an original
// rewritten questionnaire (2026-07-14) preserving the structure/intent of
// the Wieman TPI without reproducing its copyrighted item text. Section A
// mixes short-answer fields with checkboxes; everything else is
// checkbox-only. Section F (TA support) only shows if the teacher
// indicates they have TA support, since it doesn't apply otherwise.
const TPI_SECTIONS = [
  {
    key: 'A', title: 'Course Information',
    fields: [
      { id: 'courseTitle', label: 'Course/class title', type: 'text' },
      { id: 'courseLevel', label: 'Grade/level', type: 'text' },
      { id: 'numStudents', label: 'Approximate number of students', type: 'text' },
    ],
    checkboxes: [
      'Learning goals are clearly stated for the course.',
      'Learning goals are shared with students.',
      'Course outline includes expectations, grading, and policies.',
      'Course outline includes statements about skills students will develop.',
    ],
  },
  {
    key: 'B', title: 'Supporting Materials', prompt: 'Which materials do you provide to students?',
    checkboxes: [
      'Required textbook or primary readings',
      'Supplemental readings',
      'Online materials (videos, simulations, tutorials)',
      'Worked examples',
      'Practice problems with solutions',
      'Concept summaries or review sheets',
      'Study guides',
      'Pre-class materials (readings, videos, notes)',
    ],
  },
  {
    key: 'C', title: 'In-Class Activities', prompt: 'Which instructional practices do you use during class time?',
    checkboxes: [
      'Instructor lectures or explains concepts',
      'Instructor asks questions to check understanding',
      'Students answer instructor questions',
      'Students discuss questions with peers',
      'Students work in small groups',
      'Students complete in-class worksheets or tasks',
      'Use of clickers or polling',
      'Demonstrations or models used in class',
      'Students engage in problem-solving during class',
      'Students present or share work',
      'Instructor adjusts instruction based on student responses',
    ],
  },
  {
    key: 'D', title: 'Assignments', prompt: 'Which types of assignments do you use?',
    checkboxes: [
      'Weekly problem sets',
      'Short written assignments',
      'Longer written assignments or projects',
      'Online homework',
      'Lab work (if applicable)',
      'Group assignments',
      'Practice quizzes',
      'Opportunities for revision or resubmission',
    ],
  },
  {
    key: 'E', title: 'Feedback & Assessment', prompt: 'Which assessment and feedback practices do you use?',
    checkboxes: [
      'Frequent formative feedback',
      'Rubrics provided for major assignments',
      'Practice exams',
      'Midterm exams',
      'Final exam',
      'Opportunities for students to self-assess',
      'Pre-tests or diagnostic assessments',
      'Post-tests to measure learning gains',
    ],
  },
  {
    key: 'F', title: 'TA / Instructor Support', conditional: true, prompt: 'If your class uses teaching assistants or EAs, which supports are provided?',
    checkboxes: [
      'TAs/EAs receive training',
      'TAs/EAs receive guidance on grading',
      'TAs/EAs receive guidance on teaching practices',
      'TAs/EAs attend class sessions',
      'TAs/EAs hold office hours or support blocks',
      'TAs/EAs help facilitate group work',
    ],
  },
  {
    key: 'G', title: 'Collaboration in Teaching', prompt: 'Which collaborative teaching practices do you use?',
    checkboxes: [
      'Collaborates with colleagues on course/lesson design',
      'Uses shared departmental materials',
      'Participates in teaching workshops or PD',
      'Revises course/lessons based on feedback',
      'Uses data to improve teaching',
    ],
  },
]

const SUBJECT_OPTIONS = ['Language Arts', 'Mathematics', 'Science', 'Social Studies', 'Physical Education', 'Art', 'Music', 'French', 'Health & Career Education', 'Applied Design, Skills & Technologies']
const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

const TIME_DISTRIBUTION_DEFAULTS = [
  { key: 'Teacher-led instruction', min: 40, max: 55, default: 47 },
  { key: 'Seatwork (worksheets, independent tasks)', min: 20, max: 35, default: 27 },
  { key: 'Collaborative learning', min: 5, max: 15, default: 10 },
  { key: 'Hands-on learning', min: 5, max: 10, default: 8 },
  { key: 'Student-led learning', min: 5, max: 10, default: 8 },
  { key: 'Non-instructional time', min: 5, max: 10, default: 8 },
]

export default function InventoriesPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0=intro,1=TSI,2=TPI,3=Phil,4=Wieman,5=review/adjust,6=context,7=time,8=done
  const [tsi, setTsi] = useState({})
  const [tpi, setTpi] = useState({})
  const [phil, setPhil] = useState({})
  const [wieman, setWieman] = useState({})
  const [hasTA, setHasTA] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [alreadyDone, setAlreadyDone] = useState(false)

  // Computed findings, adjustable via sliders on the review screen before
  // being saved - Aj's explicit request: the teacher's stated beliefs
  // should be able to override the raw instrument score.
  const [tsiFindings, setTsiFindings] = useState({})
  const [tpiFindings, setTpiFindings] = useState({})
  const [philFindings, setPhilFindings] = useState({})

  const [fte, setFte] = useState(100)
  const [fullEveryDay, setFullEveryDay] = useState(true)
  const [subjects, setSubjects] = useState(SUBJECT_OPTIONS)
  const [grades, setGrades] = useState([])
  const [timeDist, setTimeDist] = useState(Object.fromEntries(TIME_DISTRIBUTION_DEFAULTS.map(t => [t.key, t.default])))
  const [curriculumFit, setCurriculumFit] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [calendarFile, setCalendarFile] = useState(null)
  const [calendarSummary, setCalendarSummary] = useState(null)
  const [knowsReportCards, setKnowsReportCards] = useState(null) // null = not answered yet, true/false
  const [reportCardDates, setReportCardDates] = useState({ term1: '', term2: '', term3: '' })


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

  // Called from step 4 ("Next" instead of "Finish") - computes the raw
  // findings and seeds the adjustable sliders on the review screen with
  // them, then moves forward. Nothing is saved yet.
  function proceedToReview() {
    const tsiClusters = {}
    TSI_ITEMS.forEach((item, i) => { tsiClusters[item.cluster] = (tsiClusters[item.cluster] || 0) + (tsi[i] || 0) })
    const philClusters = {}
    PHILOSOPHY_ITEMS.forEach((item, i) => {
      const v = phil[i] === 'Agree' ? 1 : phil[i] === 'Disagree' ? -1 : 0
      philClusters[item.key] = (philClusters[item.key] || 0) + v
    })
    setTsiFindings(tsiClusters)
    setTpiFindings({ ...tpi })
    setPhilFindings(philClusters)
    setStep(5)
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
          tsi_adjusted: { scores: tsiFindings, dominant: computeDominant(tsiFindings) },
          tpi_scores: tpi,
          tpi_dominant: computeDominant(tpi),
          tpi_adjusted: { scores: tpiFindings, dominant: computeDominant(tpiFindings) },
          philosophy_scores: philClusters,
          philosophy_dominant: computeDominant(philClusters),
          philosophy_adjusted: { scores: philFindings, dominant: computeDominant(philFindings) },
          wieman_scores: wieman,
          fte_percentage: fte,
          subjects,
          grades,
          knows_report_card_dates: knowsReportCards === true,
          report_card_dates: knowsReportCards === true ? reportCardDates : null,
          calendar_summary: calendarSummary || null,
          time_distribution: timeDist,
          curriculum_model: selectedModel,
          curriculum_scores: curriculumFit?.scores || null,
          curriculum_model_source: selectedModel === curriculumFit?.recommended ? 'auto' : 'manual',
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
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 20, fontFamily: FONT_BODY, textAlign: 'center' }}>
        <h1 style={{ color: C.navy }}>You've already completed this</h1>
        <p style={{ color: C.muted, marginBottom: 20 }}>Want to retake it, or head straight to planning?</p>
        <button onClick={() => setAlreadyDone(false)} style={{ ...btn(C.navy), marginRight: 10 }}>Retake Inventories</button>
        <button onClick={() => router.push('/generate?type=year')} style={btn(C.green)}>Go to Year Plan</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px', fontFamily: FONT_BODY }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: C.navy, fontSize: 22, margin: 0 }}>Get to Know Your Teaching Style</h1>
        {step > 0 && step < 10 && (
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
          <h2 style={{ color: C.navy, fontSize: 16 }}>4. Teaching Practices Inventory</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Check everything that applies. This is about your current practices, not right/wrong answers.</p>

          {TPI_SECTIONS.filter((sec) => !sec.conditional || hasTA).map((sec) => (
            <div key={sec.key} style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{sec.key}. {sec.title}</div>
              {sec.prompt && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{sec.prompt}</div>}

              {sec.fields && sec.fields.map((f) => (
                <div key={f.id} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>{f.label}</label>
                  <input value={wieman[f.id] || ''} onChange={(e) => setWieman(s => ({ ...s, [f.id]: e.target.value }))}
                    style={{ width: '100%', maxWidth: 300, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}

              {sec.checkboxes.map((text, i) => {
                const id = `${sec.key}_${i}`
                return (
                  <label key={id} style={{ display: 'block', fontSize: 13, marginBottom: 5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!wieman[id]} onChange={() => setWieman(s => ({ ...s, [id]: !s[id] }))} /> {text}
                  </label>
                )
              })}
            </div>
          ))}

          <label style={{ display: 'block', fontSize: 13, marginBottom: 20, cursor: 'pointer', color: C.muted }}>
            <input type="checkbox" checked={hasTA} onChange={() => setHasTA(v => !v)} /> This class has teaching assistants / EAs (shows Section F)
          </label>

          <button onClick={proceedToReview} style={btn(C.navy)}>Next: Review Findings</button>
        </div>
      )}

      {step === 5 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>Review Your Findings</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
            Here's what the inventories found. Adjust any slider to better match your actual beliefs and
            philosophy &mdash; your judgment of yourself matters more than the raw score. This is what
            steering uses to decide how much and what style of instruction to weight toward.
          </p>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Teaching Style (Grasha&ndash;Riechmann)</div>
            {Object.keys(tsiFindings).map((cluster) => (
              <div key={cluster} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{cluster}</span><span style={{ color: C.muted }}>{tsiFindings[cluster]}</span>
                </div>
                <input type="range" min={0} max={21} value={tsiFindings[cluster]}
                  onChange={(e) => setTsiFindings(s => ({ ...s, [cluster]: Number(e.target.value) }))}
                  style={{ width: '100%' }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Teaching Perspective</div>
            {Object.keys(tpiFindings).map((persp) => (
              <div key={persp} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{persp}</span><span style={{ color: C.muted }}>{tpiFindings[persp]}</span>
                </div>
                <input type="range" min={1} max={5} value={tpiFindings[persp]}
                  onChange={(e) => setTpiFindings(s => ({ ...s, [persp]: Number(e.target.value) }))}
                  style={{ width: '100%' }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Philosophy of Education</div>
            {Object.keys(philFindings).map((p) => (
              <div key={p} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{p}</span><span style={{ color: C.muted }}>{philFindings[p]}</span>
                </div>
                <input type="range" min={-2} max={2} value={philFindings[p]}
                  onChange={(e) => setPhilFindings(s => ({ ...s, [p]: Number(e.target.value) }))}
                  style={{ width: '100%' }} />
              </div>
            ))}
          </div>

          <button onClick={() => setStep(6)} style={btn(C.navy)}>Next</button>
        </div>
      )}

      {step === 6 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>Your Teaching Load</h2>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Are you a full-time teacher?</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={() => { setFullEveryDay(true); setFte(100) }}
                style={{ ...btn(fullEveryDay ? C.navy : '#fff', fullEveryDay ? '#fff' : C.navy), border: `1px solid ${C.border}` }}>Yes, full-time (100%)</button>
              <button onClick={() => setFullEveryDay(false)}
                style={{ ...btn(!fullEveryDay ? C.navy : '#fff', !fullEveryDay ? '#fff' : C.navy), border: `1px solid ${C.border}` }}>No, part-time</button>
            </div>
            {!fullEveryDay && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>FTE percentage</span><span style={{ color: C.muted }}>{fte}%</span>
                </div>
                <input type="range" min={10} max={100} step={5} value={fte} onChange={(e) => setFte(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Which grade(s) are you teaching this year plan for?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GRADE_OPTIONS.map((g) => (
                <button key={g} type="button"
                  onClick={() => setGrades((s) => s.includes(g) ? s.filter((x) => x !== g) : [...s, g])}
                  style={{
                    width: 40, height: 36, borderRadius: 6, fontSize: 13, cursor: 'pointer',
                    border: `1px solid ${C.border}`,
                    background: grades.includes(g) ? C.navy : '#fff',
                    color: grades.includes(g) ? '#fff' : C.navy,
                  }}>
                  {g}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Select more than one if you teach a split or multi-grade class.</div>
          </div>

          <div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Which subjects should this year plan cover?</div>
            {SUBJECT_OPTIONS.map((subj) => (
              <label key={subj} style={{ display: 'block', fontSize: 13, marginBottom: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={subjects.includes(subj)}
                  onChange={() => setSubjects(s => s.includes(subj) ? s.filter(x => x !== subj) : [...s, subj])} /> {subj}
              </label>
            ))}
          </div>

          <button onClick={() => setStep(7)} disabled={subjects.length === 0 || grades.length === 0} style={{ ...btn(C.navy), marginTop: 16, opacity: (subjects.length === 0 || grades.length === 0) ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {step === 7 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>Time Distribution</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
            Adjust how you'd like instructional time balanced across the year. These are approximate
            targets, not exact requirements &mdash; typical ranges are shown as a starting point.
          </p>
          {TIME_DISTRIBUTION_DEFAULTS.map((t) => (
            <div key={t.key} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                <span>{t.key}</span>
                <span style={{ color: C.muted }}>{timeDist[t.key]}% <span style={{ fontSize: 11 }}>(typical {t.min}&ndash;{t.max}%)</span></span>
              </div>
              <input type="range" min={0} max={70} value={timeDist[t.key]}
                onChange={(e) => setTimeDist(s => ({ ...s, [t.key]: Number(e.target.value) }))}
                style={{ width: '100%' }} />
            </div>
          ))}
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Total: {Object.values(timeDist).reduce((a, b) => a + b, 0)}% {Object.values(timeDist).reduce((a, b) => a + b, 0) !== 100 && '(doesn\u2019t need to equal exactly 100 - these are relative weights)'}
          </div>
          {error && <div style={{ color: '#b3261e', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button onClick={() => {
            const fit = computeCurriculumFit(tsiFindings, tpiFindings, philFindings, wieman)
            setCurriculumFit(fit)
            setSelectedModel(fit.recommended)
            setStep(8)
          }} style={btn(C.navy)}>Next: Curriculum Approach</button>
        </div>
      )}

      {step === 8 && curriculumFit && (() => {
        const BASIC_KEYS = ['subject_centered', 'competency_based', 'standards_based', 'theme_integrated']
        const basicScores = curriculumFit.scores.filter((s) => BASIC_KEYS.includes(s.key))
        const basicTop = [...basicScores].sort((a, b) => b.score - a.score)[0]
        const visibleList = showAdvanced ? curriculumFit.scores : basicScores
        const top = visibleList.find((s) => s.key === selectedModel) || (showAdvanced ? curriculumFit.scores[0] : basicTop)

        return (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>Curriculum Approach</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
            Based on your survey results, here's the curriculum approach that seems to fit you best.
            This shapes how the year plan is structured &mdash; change it any time if it doesn't feel right.
          </p>

          <div style={{ background: '#f0fbf4', border: `1px solid ${C.green}40`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{top.emoji} {top.label}</div>
            <div style={{ fontSize: 13, color: C.navy, marginTop: 6, lineHeight: 1.5 }}>{top.summary}</div>
            {top.lowConfidence && <div style={{ fontSize: 12, color: C.gold, marginTop: 8 }}>Note: the surveys don't directly measure this approach, so treat this as a lower-confidence guess than the others.</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Or choose a different approach:</div>
            {visibleList.map((s) => (
              <label key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="curriculumModel" checked={selectedModel === s.key} onChange={() => setSelectedModel(s.key)} style={{ marginTop: 3 }} />
                <span>{s.emoji} <strong>{s.label}</strong>{s.key === basicTop.key && !showAdvanced && <span style={{ color: C.green, fontSize: 11 }}> (recommended)</span>}{s.key === curriculumFit.recommended && showAdvanced && <span style={{ color: C.green, fontSize: 11 }}> (top overall fit)</span>}</span>
              </label>
            ))}
          </div>

          <button onClick={() => {
            const next = !showAdvanced
            setShowAdvanced(next)
            if (next) setSelectedModel(curriculumFit.recommended)
            else setSelectedModel(basicTop.key)
          }}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: 16 }}>
            {showAdvanced ? 'Back to basic 4 options' : 'Show advanced: all 9 approaches + fit breakdown'}
          </button>

          {showAdvanced && (
            <div style={{ marginBottom: 20, background: C.bg, borderRadius: 8, padding: 14 }}>
              {curriculumFit.scores.map((s) => (
                <div key={s.key} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{s.emoji} {s.label}{s.lowConfidence ? ' - low signal coverage' : ''}</span>
                    <span style={{ color: C.muted }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#e5ddc8', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.pct}%`, background: s.key === selectedModel ? C.green : C.border }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <div style={{ color: '#b3261e', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button onClick={() => setStep(9)} style={btn(C.navy)}>Next</button>
        </div>
        )
      })()}

      {step === 9 && (
        <div style={box}>
          <h2 style={{ color: C.navy, fontSize: 16 }}>School Calendar <span style={{ color: C.muted, fontWeight: 400, fontSize: 13 }}>(optional)</span></h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            If you upload your district's school calendar, the year plan can account for how many actual
            instructional days you have &mdash; statutory holidays, breaks, Pro-D days, and early dismissals
            all eat into that. Skip this if you'd rather not, or don't have it handy.
          </p>

          <input type="file" accept="application/pdf" onChange={(e) => setCalendarFile(e.target.files?.[0] || null)}
            style={{ width: '100%', marginBottom: 12, fontSize: 13 }} />

          {calendarSummary && (
            <div style={{ background: '#f0fbf4', border: `1px solid ${C.green}40`, borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: C.navy }}>Extracted from your calendar:</div>
              {calendarSummary.daysOfInstruction && <div>Days of instruction: {calendarSummary.daysOfInstruction}</div>}
              {calendarSummary.daysInSession && <div>Days in session: {calendarSummary.daysInSession}</div>}
              {calendarSummary.proDDays && <div>Pro-D days: {calendarSummary.proDDays}</div>}
              {calendarSummary.administrativeDays && <div>Administrative days: {calendarSummary.administrativeDays}</div>}
              {calendarSummary.instructionalHoursElementary && <div>Instructional hours (Elementary): {calendarSummary.instructionalHoursElementary}</div>}
              {calendarSummary.instructionalHoursSecondary && <div>Instructional hours (Secondary): {calendarSummary.instructionalHoursSecondary}</div>}
              {calendarSummary.winterVacation && <div>Winter break: {calendarSummary.winterVacation}</div>}
              {calendarSummary.springVacation && <div>Spring break: {calendarSummary.springVacation}</div>}
              {!Object.values(calendarSummary).some(Boolean) && <div style={{ color: C.gold }}>Couldn't confidently pull out the summary stats from this PDF &mdash; the plan will proceed without calendar-aware pacing.</div>}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 20, paddingTop: 20 }}>
            <h3 style={{ color: C.navy, fontSize: 14, marginBottom: 8 }}>Report Card Due Dates</h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
              Units naturally wrap up right before a break or reporting deadline. If you know your exact
              report card dates, add them below &mdash; otherwise we'll default to the general rule of thumb:
              due before winter break, before spring break, and roughly two weeks before the end of the
              school year.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" onClick={() => setKnowsReportCards(true)}
                style={{ ...btn(knowsReportCards === true ? C.navy : '#fff', knowsReportCards === true ? '#fff' : C.navy), border: `1px solid ${C.border}`, fontSize: 13, padding: '8px 16px' }}>
                I know my dates
              </button>
              <button type="button" onClick={() => setKnowsReportCards(false)}
                style={{ ...btn(knowsReportCards === false ? C.navy : '#fff', knowsReportCards === false ? '#fff' : C.navy), border: `1px solid ${C.border}`, fontSize: 13, padding: '8px 16px' }}>
                I don't know &mdash; use the general rule
              </button>
            </div>

            {knowsReportCards === true && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 260 }}>
                {['term1', 'term2', 'term3'].map((t, i) => (
                  <label key={t} style={{ fontSize: 13 }}>
                    Term {i + 1} report card due
                    <input type="date" value={reportCardDates[t]}
                      onChange={(e) => setReportCardDates((s) => ({ ...s, [t]: e.target.value }))}
                      style={{ display: 'block', width: '100%', padding: 6, marginTop: 2, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }} />
                  </label>
                ))}
              </div>
            )}

            {knowsReportCards === false && (
              <div style={{ fontSize: 12, color: C.muted, background: C.bg, borderRadius: 6, padding: 10 }}>
                Using the default rule of thumb: units will be paced to wrap up before winter break, before
                spring break, and about two weeks before the end of the school year.
                {calendarSummary?.winterVacation && ` Winter break from your calendar: ${calendarSummary.winterVacation}.`}
                {calendarSummary?.springVacation && ` Spring break from your calendar: ${calendarSummary.springVacation}.`}
              </div>
            )}
          </div>

          {error && <div style={{ color: '#b3261e', fontSize: 13, marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={async () => {
              if (!calendarFile) { finish(false); return }
              setSaving(true)
              setError('')
              try {
                const fd = new FormData()
                fd.append('file', calendarFile)
                const res = await fetch('/api/school-calendar', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Could not process calendar')
                setCalendarSummary(data.summary)
                setSaving(false)
              } catch (e) {
                setError(e.message)
                setSaving(false)
              }
            }} disabled={saving} style={{ ...btn(C.navy), opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Processing…' : calendarSummary ? 'Looks good' : 'Upload & Extract'}
            </button>
            {calendarSummary && (
              <button onClick={() => finish(false)} disabled={saving} style={{ ...btn(C.green), opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Finish & Go to Year Plan'}
              </button>
            )}
            {!calendarSummary && (
              <button onClick={() => finish(false)} disabled={saving} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 20px', fontSize: 14, cursor: 'pointer', color: C.muted }}>
                Skip &rarr; Finish & Go to Year Plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}








