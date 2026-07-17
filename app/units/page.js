'use client'
import { useState, useEffect, useRef } from 'react'

import { COLORS as C, FONT_BODY } from '@/lib/theme'
import { reorderWithinSubject } from '@/lib/unit-priorities'
import { ASSESSMENT_TYPES, currentInstructionalWeek, reminderStatus } from '@/lib/assessment-types'
import { LA_CATEGORIES, categorizeLA } from '@/lib/language-arts-categories'
import { LA_ELABORATIONS, elaborationsForCategory } from '@/lib/la-elaborations'
const ALWAYS_HIGH_SCRUTINY = ['Language Arts', 'Mathematics']
// Distinct color per Language Arts section so Reading/Writing/Oral read as
// visually different at a glance, not just by text label.
const LA_CAT_COLORS = {
  reading: { bg: '#eef4fb', border: '#bcd6ef', text: '#2f5f8a' },
  writing: { bg: '#eef8ef', border: '#bfe0c2', text: '#3c7a44' },
  oral: { bg: '#f8f0fb', border: '#ddc2ea', text: '#7a3c8a' },
}
// Subjects appear in this order first (Language Arts, then Math), per Aj's
// instruction that Language Arts should be discussed first, then Math.
// Anything not listed here keeps whatever order it came in after these two.
const SUBJECT_DISCUSSION_ORDER = ['Language Arts', 'Mathematics', 'Science', 'Social Studies']
function sortSubjectEntries(entries) {
  return [...entries].sort(([a], [b]) => {
    const ai = SUBJECT_DISCUSSION_ORDER.indexOf(a)
    const bi = SUBJECT_DISCUSSION_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default function UnitsPage() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mismatch, setMismatch] = useState(null)
  // Default of 36 weeks matches a real BC district calendar (Cowichan
  // Valley SD, 2025-26: 180 instructional days / 5) rather than an
  // arbitrary round number -- used only until the teacher's own uploaded
  // calendar (from the Year Plan page) is available, which always wins.
  const [weeksAvailable, setWeeksAvailable] = useState(36)
  const [weeksSource, setWeeksSource] = useState('default') // 'default' | 'calendar'
  const [populating, setPopulating] = useState(false)
  const [populateResult, setPopulateResult] = useState(null)
  // 'checking' | 'missing' | 'present' | 'skipped-by-user'
  const [classSetupStatus, setClassSetupStatus] = useState('checking')
  const [expandedCompetency, setExpandedCompetency] = useState({}) // `${subject}::${unit_name}` -> bool
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [dragInfo, setDragInfo] = useState(null) // { subject, fromIndex, unitName }
  const [dragPointerY, setDragPointerY] = useState(0)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragRowHeight, setDragRowHeight] = useState(0)
  const [dragHoverIndex, setDragHoverIndex] = useState(0)
  const rowRefs = useRef({}) // `${subject}::${unit_name}` -> DOM node, for measuring drag positions
  const [defaultAssessmentTypes, setDefaultAssessmentTypes] = useState(['quiz'])
  const [pendingAssessmentTypes, setPendingAssessmentTypes] = useState(['quiz']) // local checkbox state before "Save for later"
  const [customAssessmentTypes, setCustomAssessmentTypes] = useState([]) // teacher-added types beyond the built-in ASSESSMENT_TYPES list, [{key,label}]
  const [newCustomTypeLabel, setNewCustomTypeLabel] = useState('')
  const [savingCustomType, setSavingCustomType] = useState(false)
  const [savingDefaultType, setSavingDefaultType] = useState(false)
  const [defaultTypesDirty, setDefaultTypesDirty] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(null)
  const [endWeekByUnit, setEndWeekByUnit] = useState({}) // `${subject}::${unit_name}` -> end_week, from the Timeline
  const [collapsedSubjects, setCollapsedSubjects] = useState({ Mathematics: true, 'Social Studies': true }) // subject -> bool, minimize/expand so the page isn't so long -- Math and Social Studies start minimized per Aj
  const [addingElabKey, setAddingElabKey] = useState(null)
  const [aiBuildingKey, setAiBuildingKey] = useState(null) // elab.key currently running "AI build me this unit"
  const [creativeBuildingKey, setCreativeBuildingKey] = useState(null) // elab.key currently running "AI: creative way to cover this"
  const [laStartingView, setLaStartingView] = useState({}) // LA category key -> 'activities' | 'content' | 'competency', default 'activities'
  const [openCoverage, setOpenCoverage] = useState({}) // unit key -> bool, "What does this cover?" toggle
  const [occurrenceCounts, setOccurrenceCounts] = useState({}) // `${cat.key}::${elab.key}` -> number, how many instances to create at once (e.g. 3 Novel Studies this year)
  const [manualApproach, setManualApproach] = useState({}) // `${cat.key}::${elab.key}` -> string, teacher's own way to cover a gap instead of AI inventing one
  const [showManualInput, setShowManualInput] = useState({}) // `${cat.key}::${elab.key}` -> bool
  const [splitClassEnabled, setSplitClassEnabled] = useState(false) // A/B year rotation -- half the content is covered each year
  const [activeRotationYear, setActiveRotationYear] = useState('A')
  const [savingSplitClass, setSavingSplitClass] = useState(false)
  const [examplesState, setExamplesState] = useState({}) // `${key}` -> { loading, examples, error }
  const [doItNow, setDoItNow] = useState({}) // `${key}` -> bool, overrides the default "saved for later" state for one unit's reminder

  function toggleDefaultAssessmentType(key) {
    setPendingAssessmentTypes((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      return next.length ? next : prev // keep at least one checked
    })
    setDefaultTypesDirty(true)
  }

  async function saveDefaultAssessmentTypesForLater() {
    setSavingDefaultType(true)
    try {
      await fetch('/api/assessment-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_assessment_types: pendingAssessmentTypes }),
      })
      setDefaultAssessmentTypes(pendingAssessmentTypes)
      setDefaultTypesDirty(false)
    } finally {
      setSavingDefaultType(false)
    }
  }

  // Lets a teacher add their own assessment type beyond the built-in list
  // (e.g. "Reading Conference", "Running Record") -- saved per-teacher and
  // merged into every ASSESSMENT_TYPES checklist/dropdown in this page.
  async function addCustomAssessmentType() {
    const label = newCustomTypeLabel.trim()
    if (!label) return
    const key = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    if (customAssessmentTypes.some((t) => t.key === key) || ASSESSMENT_TYPES.some((t) => t.key === key)) {
      setNewCustomTypeLabel('')
      return // already exists, nothing to do
    }
    const next = [...customAssessmentTypes, { key, label }]
    setSavingCustomType(true)
    try {
      await fetch('/api/assessment-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_assessment_types: next }),
      })
      setCustomAssessmentTypes(next)
      setNewCustomTypeLabel('')
    } finally {
      setSavingCustomType(false)
    }
  }

  // Physical drag-to-reorder: grab a unit's handle and pull it to a new spot;
  // other units in the same subject visually slide out of the way to make
  // room (a lightweight FLIP-style effect -- siblings are transform-shifted
  // by the dragged row's height, not actually reordered in the DOM, until
  // drop commits the real order). Uses Pointer Events so it works with
  // mouse, touch, and pen the same way.
  function startDrag(e, subject, unitName, fromIndex) {
    if (e.button !== undefined && e.button !== 0) return // left-click / primary touch only
    e.preventDefault()
    const rowEl = rowRefs.current[`${subject}::${unitName}`]
    const height = rowEl?.getBoundingClientRect().height || 60
    setDragInfo({ subject, fromIndex, unitName })
    setDragStartY(e.clientY)
    setDragPointerY(e.clientY)
    setDragRowHeight(height)
    setDragHoverIndex(fromIndex)
  }

  useEffect(() => {
    if (!dragInfo) return

    function onMove(e) {
      setDragPointerY(e.clientY)
      const subjectRows = bySubjectRef.current[dragInfo.subject] || []
      let closestIndex = dragInfo.fromIndex
      let closestDist = Infinity
      subjectRows.forEach((u, i) => {
        const el = rowRefs.current[`${dragInfo.subject}::${u.unit_name}`]
        if (!el) return
        const rect = el.getBoundingClientRect()
        const mid = rect.top + rect.height / 2
        const dist = Math.abs(e.clientY - mid)
        if (dist < closestDist) { closestDist = dist; closestIndex = i }
      })
      setDragHoverIndex((prev) => (prev === closestIndex ? prev : closestIndex))
    }

    function onUp() {
      setUnits((prev) => {
        const subjectRows = prev.filter((u) => u.subject === dragInfo.subject)
        const otherRows = prev.filter((u) => u.subject !== dragInfo.subject)
        const reordered = reorderWithinSubject(subjectRows, dragInfo.fromIndex, dragHoverIndex)
        return [...otherRows, ...reordered]
      })
      setDragInfo(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragInfo, dragHoverIndex])

  async function submitFeedback() {
    if (!feedbackText.trim()) return
    setFeedbackStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestText: feedbackText, pageContext: 'unit-priorities' }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setFeedbackText('')
      setFeedbackStatus('sent')
      setTimeout(() => setFeedbackStatus('idle'), 4000)
    } catch {
      setFeedbackStatus('error')
    }
  }

  async function populateFromCurriculum() {
    setPopulating(true)
    setPopulateResult(null)
    try {
      const res = await fetch('/api/unit-priorities/populate-from-curriculum', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to populate from curriculum')
      setUnits(data.units || [])
      setPopulateResult(data.results)
    } catch (e) {
      setPopulateResult({ error: e.message })
    } finally {
      setPopulating(false)
    }
  }

  useEffect(() => {
    fetch('/api/unit-priorities')
      .then((r) => r.json())
      .then((d) => setUnits(d.units || []))
      .finally(() => setLoading(false))

    // Same source of truth as the Year Plan page's calendar upload --
    // teacher_inventories.school_calendar_summary. If they've already
    // uploaded their real district calendar there, use it here too
    // instead of duplicating the upload UI on this page.
    fetch('/api/teacher-inventories')
      .then((r) => r.json())
      .then((d) => {
        const days = d.inventory?.school_calendar_summary?.daysOfInstruction
        if (days) {
          setWeeksAvailable(Math.round(days / 5))
          setWeeksSource('calendar')
        }
        const openingDate = d.inventory?.school_calendar_summary?.schoolOpeningDate
        if (openingDate) setCurrentWeek(currentInstructionalWeek(openingDate))
      })
      .catch(() => {})

    // AI curriculum generation (both the Populate button here and plan
    // generation elsewhere) needs to know grade + subject to be grounded
    // in anything real -- surface that clearly rather than letting the
    // Populate button just silently do nothing/fail later.
    fetch('/api/class-setup')
      .then((r) => r.json())
      .then((d) => setClassSetupStatus(d.setup ? 'present' : 'missing'))
      .catch(() => setClassSetupStatus('missing'))

    fetch('/api/assessment-settings')
      .then((r) => r.json())
      .then((d) => {
        const types = d.default_assessment_types?.length ? d.default_assessment_types : ['quiz']
        setDefaultAssessmentTypes(types)
        setPendingAssessmentTypes(types)
        setCustomAssessmentTypes(d.custom_assessment_types || [])
      })
      .catch(() => {})

    fetch('/api/split-class-settings')
      .then((r) => r.json())
      .then((d) => {
        setSplitClassEnabled(!!d.split_class_enabled)
        setActiveRotationYear(d.active_rotation_year || 'A')
      })
      .catch(() => {})

    // Timeline end_week per unit powers the "unit ending soon" reminder --
    // reuses the same seeded/edited data the Year Timeline page shows, so
    // the two stay consistent rather than tracking dates twice.
    fetch('/api/timeline')
      .then((r) => r.json())
      .then((d) => {
        const map = {}
        for (const b of d.blocks || []) map[`${b.subject}::${b.unit_name}`] = b.end_week
        setEndWeekByUnit(map)
      })
      .catch(() => {})
  }, [])

  const allAssessmentTypes = [...ASSESSMENT_TYPES, ...customAssessmentTypes] // built-in + teacher-added custom types, merged everywhere a type list/lookup is needed

  const bySubject = units.reduce((acc, u) => {
    (acc[u.subject] ||= []).push(u)
    return acc
  }, {})
  for (const subject in bySubject) {
    bySubject[subject].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }
  const bySubjectRef = useRef(bySubject)
  bySubjectRef.current = bySubject // always holds the latest grouping for the drag pointermove listener, without re-binding the listener every render

  function updateUnit(subject, unit_name, field, value) {
    setUnits((prev) => prev.map((u) => (u.subject === subject && u.unit_name === unit_name ? { ...u, [field]: value } : u)))
  }

  function toggleSubjectCollapsed(subject) {
    setCollapsedSubjects((prev) => ({ ...prev, [subject]: !prev[subject] }))
  }

  // "+ Add as a Unit Frame" -- inserts an intentionally EMPTY placeholder
  // unit tagged with the SPECIFIC strand it's being added from (not all
  // strands the idea generally covers) -- per Aj's 2026-07-17 refinement,
  // adding "Novel Study" from the Reading tab creates a Reading-specific
  // unit; adding it again from the Oral tab creates a separate,
  // independently-tracked Oral-specific unit. `count` (from the
  // occurrence stepper) inserts that many numbered instances at once
  // (e.g. "Novel Study #1" / "#2" / "#3" for a teacher who runs 3 a year).
  async function addUnitFromElaboration(subject, elab, categoryKey, count = 1) {
    setAddingElabKey(elab.key)
    try {
      for (let i = 1; i <= count; i++) {
        const unit_name = count > 1 ? `${elab.label} #${i}` : elab.label
        const res = await fetch('/api/unit-priorities', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addUnit: { subject, unit_name, la_categories: [categoryKey], source_elaboration_key: elab.key } }),
        })
        const data = await res.json()
        if (res.ok) setUnits(data.units || units)
      }
    } finally {
      setAddingElabKey(null)
    }
  }

  // "AI build me this unit" -- generates real content tailored to the ONE
  // strand it's being built for (see app/api/units/ai-build's strand
  // framing), and inserts it as a fully-fleshed-out unit. `count` inserts
  // that many separately-generated instances (each gets its own AI call
  // so e.g. 3 Novel Studies aren't identical copies).
  async function aiBuildUnit(subject, elab, categoryKey, categoryLabel, grade, count = 1) {
    setAiBuildingKey(elab.key)
    try {
      for (let i = 1; i <= count; i++) {
        const genRes = await fetch('/api/units/ai-build', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, unitLabel: elab.label, covers: elab.covers, category: categoryLabel, grade }),
        })
        const gen = await genRes.json()
        if (!genRes.ok) throw new Error(gen.error)
        const baseName = gen.unit_name || elab.label
        const unit_name = count > 1 ? `${baseName} #${i}` : baseName
        const res = await fetch('/api/unit-priorities', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addUnit: {
              subject, unit_name, la_categories: [categoryKey],
              content_summary: gen.content_summary, curricular_competency: gen.curricular_competency,
              source_elaboration_key: elab.key,
            },
          }),
        })
        const data = await res.json()
        if (res.ok) setUnits(data.units || units)
      }
    } catch { /* transient AI/network failure -- teacher can retry */ } finally {
      setAiBuildingKey(null)
    }
  }

  // "AI: creative way to cover this" -- for an elaboration idea with NO
  // unit yet in this specific strand (a coverage gap), invents a fresh,
  // non-obvious approach tailored to that strand, and inserts it as a new
  // unit. If the teacher typed their own approach instead (manualApproach),
  // AI builds THAT out rather than inventing something different.
  async function aiCoverGapCreatively(subject, elab, categoryKey, categoryLabel, grade, manualApproach = '') {
    setCreativeBuildingKey(elab.key)
    try {
      const genRes = await fetch('/api/units/ai-build', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, unitLabel: elab.label, covers: elab.covers, category: categoryLabel, grade, creative: true, manualApproach }),
      })
      const gen = await genRes.json()
      if (!genRes.ok) throw new Error(gen.error)
      const res = await fetch('/api/unit-priorities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addUnit: {
            subject, unit_name: gen.unit_name || elab.label, la_categories: [categoryKey],
            content_summary: gen.content_summary, curricular_competency: gen.curricular_competency,
            source_elaboration_key: elab.key,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) setUnits(data.units || units)
    } catch { /* transient AI/network failure -- teacher can retry */ } finally {
      setCreativeBuildingKey(null)
    }
  }

  async function saveSplitClassSettings(patch) {
    setSavingSplitClass(true)
    try {
      await fetch('/api/split-class-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } finally {
      setSavingSplitClass(false)
    }
  }

  function toggleSplitClassEnabled(checked) {
    setSplitClassEnabled(checked)
    saveSplitClassSettings({ split_class_enabled: checked })
  }

  function setRotationYear(year) {
    setActiveRotationYear(year)
    saveSplitClassSettings({ active_rotation_year: year })
  }

  async function fetchExamples(key, { subject, unitName, contentSummary, assessmentTypeLabel, grade }) {
    setExamplesState((prev) => ({ ...prev, [key]: { loading: true, examples: null, error: null } }))
    try {
      const res = await fetch('/api/units/examples', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, unitName, contentSummary, assessmentTypeLabel, grade }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate examples')
      setExamplesState((prev) => ({ ...prev, [key]: { loading: false, examples: data.examples || [], error: null } }))
    } catch (e) {
      setExamplesState((prev) => ({ ...prev, [key]: { loading: false, examples: null, error: e.message } }))
    }
  }

  async function save() {
    setSaving(true)
    const updates = units.map((u) => ({ subject: u.subject, unit_name: u.unit_name, priority: u.priority, high_scrutiny: u.high_scrutiny, removed: u.removed, sort_order: u.sort_order ?? 0, assessment_type: u.assessment_type || null }))
    const res = await fetch('/api/unit-priorities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, totalInstructionalWeeksAvailable: weeksAvailable }),
    })
    const data = await res.json()
    setMismatch(data.mismatch)
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 32, fontFamily: FONT_BODY }}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/dashboard" style={{ color: C.navy, fontSize: 13 }}>← Dashboard</a>
        <h1 style={{ color: C.navy, fontSize: 28, margin: '8px 0 4px' }}>Unit Priorities</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
          All units start at equal priority (1×). The slider is a relative time-weight, NOT a number of weeks — raising it to 2× means roughly double the instructional time of a 1× unit, not “2 weeks.” Uncheck a unit to remove it from this year's plan. Drag the ⠠ handle to reorder the sequence you teach units in within a subject.
        </p>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <label style={{ fontSize: 13 }}>
            Instructional weeks available this year
            <input
              type="number" value={weeksAvailable}
              onChange={(e) => { setWeeksAvailable(Number(e.target.value)); setWeeksSource('manual') }}
              style={{ marginLeft: 10, width: 80, padding: 6, border: `1px solid ${C.border}`, borderRadius: 6 }}
            />
          </label>
          <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>
            {weeksSource === 'calendar' && '✓ From your uploaded district calendar (set on the Year Plan page).'}
            {weeksSource === 'default' && "Using a standard 36-week default until you upload your district calendar on the Year Plan page."}
            {weeksSource === 'manual' && 'Manually overridden.'}
          </p>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            Default assessment type(s) for all units
            <span style={{ fontSize: 11, color: '#999', fontWeight: 400, marginLeft: 6 }}>(check as many as apply)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 12 }}>
            {[...ASSESSMENT_TYPES, ...customAssessmentTypes].map((t) => (
              <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pendingAssessmentTypes.includes(t.key)}
                  onChange={() => toggleDefaultAssessmentType(t.key)}
                />
                {t.label}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            <input
              value={newCustomTypeLabel}
              onChange={(e) => setNewCustomTypeLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustomAssessmentType() }}
              placeholder="Add your own assessment type (e.g. Reading Conference)"
              style={{ flex: 1, maxWidth: 320, padding: 7, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }}
            />
            <button
              onClick={addCustomAssessmentType}
              disabled={savingCustomType || !newCustomTypeLabel.trim()}
              style={{
                padding: '7px 14px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6,
                fontSize: 13, fontWeight: 600, cursor: newCustomTypeLabel.trim() ? 'pointer' : 'not-allowed',
                opacity: newCustomTypeLabel.trim() ? 1 : 0.5,
              }}
            >
              {savingCustomType ? 'Adding…' : '+ Add type'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={saveDefaultAssessmentTypesForLater}
              disabled={savingDefaultType || !defaultTypesDirty}
              title="Save your selections now without leaving this page -- you can keep adjusting units and come back to change these later."
              style={{
                padding: '8px 16px', background: defaultTypesDirty ? C.gold : '#fff', color: defaultTypesDirty ? '#fff' : '#999',
                border: `1px solid ${defaultTypesDirty ? C.gold : C.border}`, borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: defaultTypesDirty ? 'pointer' : 'not-allowed',
              }}
            >
              {savingDefaultType ? 'Saving…' : defaultTypesDirty ? 'Save for later' : 'Saved'}
            </button>
            {savingDefaultType && <span style={{ fontSize: 11, color: '#999' }}>Saving…</span>}
          </div>
          <p style={{ fontSize: 11, color: '#999', margin: '10px 0 0' }}>
            Applies to any unit that doesn't have its own override set below.
          </p>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={splitClassEnabled}
              onChange={(e) => toggleSplitClassEnabled(e.target.checked)}
            />
            I teach a split class (A/B year rotation)
            {savingSplitClass && <span style={{ fontSize: 11, color: '#999' }}>Saving…</span>}
          </label>
          <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>
            Common when a class spans two grades -- you cover half the content each year so students never repeat what they already had.
          </p>
          {splitClassEnabled && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13 }}>Currently teaching:</span>
              {['A', 'B'].map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setRotationYear(year)}
                  style={{
                    padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${activeRotationYear === year ? C.gold : C.border}`,
                    background: activeRotationYear === year ? '#fff8ee' : '#fff',
                    color: activeRotationYear === year ? C.gold : '#888',
                  }}
                >
                  Year {year}
                </button>
              ))}
              <span style={{ fontSize: 11, color: '#999' }}>
                Units tagged for the other year are dimmed below, not deleted -- switch anytime.
              </span>
            </div>
          )}
        </div>

        {classSetupStatus === 'missing' && (
          <div style={{ background: '#fdf3e3', border: '1px solid #e8c88a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#7a5a1e', margin: '0 0 10px' }}>
              In order for AI to generate this information, we need to know what grade and subject you teach. Would you like to fill that out now?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href="/class-setup" style={{
                padding: '8px 16px', background: C.navy, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
                Yes, fill it out
              </a>
              <button
                onClick={() => setClassSetupStatus('skipped-by-user')}
                style={{ padding: '8px 16px', background: 'none', color: '#7a5a1e', border: `1px solid #e8c88a`, borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {classSetupStatus === 'skipped-by-user' && (
          <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: '#a33' }}>
            AI generation isn't possible without your grade and subject — you can still set units and priorities manually below, and fill this out later from the Dashboard.
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <button
            onClick={populateFromCurriculum} disabled={populating || classSetupStatus !== 'present'}
            title={classSetupStatus !== 'present' ? 'Fill out "What do you teach?" first' : 'Pulls real content from curriculum.gov.bc.ca for your grade(s) and groups it into units automatically -- for Language Arts, Math, Science, and Social Studies. Split grades are supported.'}
            style={{
              padding: '10px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6,
              fontWeight: 600, fontSize: 13,
              cursor: (populating || classSetupStatus !== 'present') ? 'not-allowed' : 'pointer',
              opacity: (populating || classSetupStatus !== 'present') ? 0.5 : 1,
            }}
          >
            {populating ? 'Pulling from BC Curriculum… (can take up to a minute)' : '📖 Populate from BC Curriculum'}
          </button>
          {populateResult?.error && (
            <p style={{ fontSize: 12, color: '#a33', marginTop: 8 }}>{populateResult.error}</p>
          )}
          {populateResult?.populated && (
            <div style={{ fontSize: 12, color: '#1a7a3e', marginTop: 8 }}>
              ✓ {populateResult.populated.map((p) => `${p.subject} (${p.unitCount} units, grade${p.grades.length > 1 ? 's' : ''} ${p.grades.join('/')})`).join(', ')}
              {populateResult.skipped?.length > 0 && (
                <div style={{ color: '#a67c00', marginTop: 4 }}>
                  Skipped: {populateResult.skipped.map((s) => `${s.subject} (${s.reason})`).join('; ')}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 12, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
              Something missing or not quite right?
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>
              Tell us what's off (e.g. "missing my Grade 5 fractions unit") -- this goes straight to Aj so it can be reviewed and improved.
            </p>
            <textarea
              value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows="2"
              placeholder="Describe what should be added or fixed…"
              style={{ width: '100%', padding: 8, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button
                onClick={submitFeedback} disabled={feedbackStatus === 'sending' || !feedbackText.trim()}
                style={{
                  padding: '6px 16px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6,
                  fontSize: 12, fontWeight: 600, cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                  opacity: feedbackText.trim() ? 1 : 0.5,
                }}
              >
                {feedbackStatus === 'sending' ? 'Sending…' : 'Send Feedback'}
              </button>
              {feedbackStatus === 'sent' && <span style={{ fontSize: 12, color: '#1a7a3e' }}>✓ Sent — thank you!</span>}
              {feedbackStatus === 'error' && <span style={{ fontSize: 12, color: '#a33' }}>Couldn't send — try again.</span>}
            </div>
          </div>
        </div>

        {mismatch && (
          <div style={{ background: '#fdf3e3', border: '1px solid #e8c88a', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: '#7a5a1e' }}>
            ⚠️ {mismatch.message}
          </div>
        )}

        {sortSubjectEntries(Object.entries(bySubject)).map(([subject, subjectUnits]) => {
          const isHighScrutiny = ALWAYS_HIGH_SCRUTINY.includes(subject) || subjectUnits.some((u) => u.high_scrutiny)
          const isCollapsed = !!collapsedSubjects[subject]
          const isLanguageArts = subject === 'Language Arts'

          // Renders one unit row -- shared by the flat list (most subjects)
          // and the three Language Arts sub-sections (Reading/Writing/Oral).
          const renderUnitRow = (u, forceShowCompetency = false) => {
            const idx = subjectUnits.indexOf(u) // global index within this subject, for drag reordering
            const key = `${subject}::${u.unit_name}`
            const isExpanded = forceShowCompetency || expandedCompetency[key]
            const isThisDragged = dragInfo?.subject === subject && dragInfo?.unitName === u.unit_name
            const savedForLater = u.saved_for_later !== false && !doItNow[key] // defaults to true
            // Split (A/B year) rotation: dim units tagged for the other year
            // instead of hiding them, so it's still easy to switch or check.
            const isOffRotation = splitClassEnabled && u.year_rotation && u.year_rotation !== activeRotationYear
            const exState = examplesState[key]
            const endWeek = endWeekByUnit[`${subject}::${u.unit_name}`]
            const status = !u.removed ? reminderStatus(currentWeek, endWeek) : null
            const effectiveType = allAssessmentTypes.find((t) => t.key === (u.assessment_type || defaultAssessmentTypes[0]))

            // Physical drag-to-reorder visuals: the dragged row follows the
            // pointer directly; siblings between its old and new spot slide
            // out of the way by its height, so it looks like everything
            // shifts to make room -- see startDrag()/the pointermove effect above.
            let rowTransform = 'none'
            let rowTransition = 'transform 150ms ease'
            if (isThisDragged) {
              rowTransform = `translateY(${dragPointerY - dragStartY}px)`
              rowTransition = 'none'
            } else if (dragInfo?.subject === subject) {
              const { fromIndex } = dragInfo
              if (fromIndex < dragHoverIndex && idx > fromIndex && idx <= dragHoverIndex) rowTransform = `translateY(${-dragRowHeight}px)`
              else if (fromIndex > dragHoverIndex && idx >= dragHoverIndex && idx < fromIndex) rowTransform = `translateY(${dragRowHeight}px)`
            }

            return (
              <div
                key={u.unit_name}
                ref={(el) => { rowRefs.current[key] = el }}
                style={{
                  marginBottom: 12, opacity: u.removed ? 0.4 : isOffRotation ? 0.45 : 1,
                  borderBottom: `1px solid ${C.border}`, paddingBottom: 10,
                  position: 'relative', transform: rowTransform, transition: rowTransition,
                  zIndex: isThisDragged ? 50 : 1,
                  background: isThisDragged ? '#fff' : 'transparent',
                  boxShadow: isThisDragged ? '0 6px 16px rgba(0,0,0,0.15)' : 'none',
                  borderRadius: isThisDragged ? 8 : 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    onPointerDown={(e) => startDrag(e, subject, u.unit_name, idx)}
                    title="Drag to reorder teaching sequence"
                    style={{ cursor: isThisDragged ? 'grabbing' : 'grab', color: '#bbb', fontSize: 14, userSelect: 'none', touchAction: 'none' }}
                  >
                    ⠿
                  </span>
                  <input type="checkbox" checked={!u.removed} onChange={(e) => updateUnit(subject, u.unit_name, 'removed', !e.target.checked)} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                    {u.unit_name}
                    {u.grades?.length > 0 && <span style={{ fontSize: 11, color: '#999', marginLeft: 6, fontWeight: 400 }}>(Gr. {u.grades.join('/')})</span>}
                  </span>
                  <input
                    type="range" min="0.25" max="3" step="0.25" value={u.priority} disabled={u.removed}
                    onChange={(e) => updateUnit(subject, u.unit_name, 'priority', Number(e.target.value))}
                    style={{ width: 140 }}
                  />
                  <span style={{ fontSize: 12, color: '#888', width: 76 }} title="Relative priority weight, not a week count -- 1x = equal share, higher = more instructional time this year">{u.priority}× priority</span>
                  <select
                    value={u.assessment_type || ''}
                    onChange={(e) => updateUnit(subject, u.unit_name, 'assessment_type', e.target.value || null)}
                    title="Assessment type for this unit (overrides the default above)"
                    style={{ fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 5, color: u.assessment_type ? '#333' : '#aaa' }}
                  >
                    <option value="">Default ({defaultAssessmentTypes.map((k) => allAssessmentTypes.find((t) => t.key === k)?.label).filter(Boolean).join(', ')})</option>
                    {allAssessmentTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  {splitClassEnabled && (
                    <select
                      value={u.year_rotation || ''}
                      onChange={(e) => updateUnit(subject, u.unit_name, 'year_rotation', e.target.value || null)}
                      title="Which rotation year this unit is taught in -- 'Both' means every year"
                      style={{ fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 5, color: u.year_rotation ? '#333' : '#aaa' }}
                    >
                      <option value="">Both years</option>
                      <option value="A">Year A only</option>
                      <option value="B">Year B only</option>
                    </select>
                  )}
                </div>
                {isOffRotation && (
                  <div style={{ fontSize: 11, color: '#999', marginLeft: 30, marginTop: 2 }}>
                    Not taught this rotation year (Year {u.year_rotation})
                  </div>
                )}

                {isLanguageArts && (
                  <div style={{ marginLeft: 30, marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#999' }} title="Cross-strand: check more than one if this unit genuinely covers multiple areas -- e.g. a Novel Study touching Reading, Writing, and Oral all at once">
                      Covers:
                    </span>
                    {LA_CATEGORIES.map((cat) => {
                      const current = u.la_categories?.length ? u.la_categories : [u.la_category || categorizeLA(u.unit_name, u.content_summary)]
                      const checked = current.includes(cat.key)
                      return (
                        <label key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: LA_CAT_COLORS[cat.key].text, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...current, cat.key]
                                : current.filter((k) => k !== cat.key)
                              updateUnit(subject, u.unit_name, 'la_categories', next.length ? next : [cat.key])
                            }}
                          />
                          {cat.label}
                        </label>
                      )
                    })}
                  </div>
                )}

                {status && (
                  <div style={{
                    marginTop: 8, marginLeft: 30, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                    background: status === 'due' ? '#fdecea' : '#fdf3e3',
                    color: status === 'due' ? '#a33' : '#7a5a1e',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span>
                        {status === 'due'
                          ? `This unit has wrapped — the ${effectiveType?.label.toLowerCase()} is `
                          : `This unit ends soon (week ${endWeek}) — the ${effectiveType?.label.toLowerCase()} is `}
                        <strong>{savedForLater ? 'saved for later' : 'ready to work on now'}</strong>.
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={savedForLater}
                          onChange={(e) => {
                            const checked = e.target.checked
                            updateUnit(subject, u.unit_name, 'saved_for_later', checked)
                            setDoItNow((prev) => ({ ...prev, [key]: !checked }))
                          }}
                        />
                        Save for later
                      </label>
                      {!savedForLater && (
                        <button
                          onClick={() => fetchExamples(key, {
                            subject, unitName: u.unit_name, contentSummary: u.content_summary,
                            assessmentTypeLabel: effectiveType?.label, grade: u.grades?.join('/'),
                          })}
                          disabled={exState?.loading}
                          style={{
                            padding: '5px 12px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6,
                            fontSize: 12, fontWeight: 700, cursor: exState?.loading ? 'default' : 'pointer',
                          }}
                        >
                          {exState?.loading ? 'Generating…' : '✨ Show me examples'}
                        </button>
                      )}
                    </div>
                    {!savedForLater && exState?.error && (
                      <p style={{ marginTop: 8, marginBottom: 0, color: '#a33' }}>{exState.error}</p>
                    )}
                    {!savedForLater && exState?.examples?.length > 0 && (
                      <div style={{ marginTop: 8, background: '#eaf6f4', border: '1px solid #a9d9d1', borderRadius: 6, padding: '8px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#1f7a6c', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>✨ AI examples</div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: '#1f5f56' }}>
                          {exState.examples.map((ex, i) => <li key={i} style={{ marginBottom: 4 }}>{ex}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Content is the primary focus, per Aj's instruction -- shown
                    directly, not hidden behind hover or a toggle. Curricular
                    Competency stays collapsed by default underneath it. */}
                {u.content_summary && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6, marginLeft: 30 }}>
                    <p style={{ fontSize: 12, color: '#555', margin: 0, whiteSpace: 'pre-wrap', flex: 1 }}>
                      {u.content_summary}
                    </p>
                    <button
                      onClick={() => fetchExamples(`${key}::content`, {
                        subject, unitName: u.unit_name, contentSummary: u.content_summary, grade: u.grades?.join('/'),
                      })}
                      disabled={examplesState[`${key}::content`]?.loading}
                      title="AI-generated examples for this unit's content"
                      style={{ background: 'none', border: 'none', color: C.navy, fontSize: 11, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', textDecoration: 'underline' }}
                    >
                      {examplesState[`${key}::content`]?.loading ? 'Generating…' : '✨ Show me examples'}
                    </button>
                  </div>
                )}
                {examplesState[`${key}::content`]?.examples?.length > 0 && (
                  <div style={{ marginLeft: 30, marginTop: 4, background: '#eaf6f4', border: '1px solid #a9d9d1', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1f7a6c', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>✨ AI examples</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#1f5f56' }}>
                      {examplesState[`${key}::content`].examples.map((ex, i) => <li key={i} style={{ marginBottom: 4 }}>{ex}</li>)}
                    </ul>
                  </div>
                )}

                {u.curricular_competency && (
                  <div style={{ marginLeft: 30, marginTop: 6 }}>
                    <button
                      onClick={() => setExpandedCompetency((prev) => ({ ...prev, [key]: !prev[key] }))}
                      style={{ background: 'none', border: 'none', color: C.navy, fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      {isExpanded ? '▾ Hide' : '▸ Show'} Curricular Competency
                    </button>
                    {isExpanded && (
                      <p style={{ fontSize: 12, color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>{u.curricular_competency}</p>
                    )}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={subject} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : 10 }}>
                <button
                  onClick={() => toggleSubjectCollapsed(subject)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  title={isCollapsed ? 'Expand this subject' : 'Minimize this subject'}
                >
                  <span style={{ display: 'inline-block', transform: isCollapsed ? 'none' : 'rotate(90deg)', transition: 'transform 0.15s', color: '#888', fontSize: 14 }}>▸</span>
                  <h2 style={{ color: C.navy, fontSize: 16, margin: 0 }}>{subject}</h2>
                  <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>({subjectUnits.length})</span>
                </button>
                {!isCollapsed && !ALWAYS_HIGH_SCRUTINY.includes(subject) && (
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#888' }}>
                    <input
                      type="checkbox"
                      checked={isHighScrutiny}
                      onChange={(e) => subjectUnits.forEach((u) => updateUnit(subject, u.unit_name, 'high_scrutiny', e.target.checked))}
                    />
                    Give this subject extra scrutiny
                  </label>
                )}
              </div>

              {!isCollapsed && (
                isLanguageArts ? (
                  LA_CATEGORIES.map((cat) => {
                    const catUnits = subjectUnits.filter((u) => {
                      const cats = u.la_categories?.length ? u.la_categories : [u.la_category || categorizeLA(u.unit_name, u.content_summary)]
                      return cats.includes(cat.key)
                    })
                    const colors = LA_CAT_COLORS[cat.key]
                    const startingView = laStartingView[cat.key] || 'activities' // teacher picks which view opens first: Activities, Content, or Curricular Competency
                    const catElaborations = elaborationsForCategory(cat.key)
                    const grade = [...new Set(catUnits.flatMap((u) => u.grades || []))].join('/') || null

                    const isElabCovered = (elab) => catUnits.some((u) => u.source_elaboration_key === elab.key || u.unit_name.toLowerCase() === elab.label.toLowerCase())
                    const coveredElabs = catElaborations.filter(isElabCovered)
                    const gapElabs = catElaborations.filter((e) => !isElabCovered(e))

                    const elabCard = (elab, isGap) => {
                      const coverageOpen = openCoverage[`elab::${elab.key}`]
                      const countKey = `${cat.key}::${elab.key}`
                      const count = occurrenceCounts[countKey] || 1
                      const manualOpen = showManualInput[countKey]
                      const manualText = manualApproach[countKey] || ''
                      return (
                        <div key={elab.key} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{elab.label}</div>
                              <button
                                type="button"
                                onClick={() => setOpenCoverage((prev) => ({ ...prev, [`elab::${elab.key}`]: !prev[`elab::${elab.key}`] }))}
                                style={{ background: 'none', border: 'none', color: colors.text, fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 3, textDecoration: 'underline' }}
                              >
                                👁 {coverageOpen ? 'Hide' : 'What does this cover?'}
                              </button>
                              {coverageOpen && (
                                <div style={{ marginTop: 4 }}>
                                  <div style={{ fontSize: 10, color: '#999' }}>
                                    Covers: {elab.covers.map((c) => LA_CATEGORIES.find((x) => x.key === c)?.label).join(', ')}
                                  </div>
                                  <p style={{ fontSize: 11, color: '#666', margin: '3px 0 0' }}>{elab.description}</p>
                                </div>
                              )}
                              {isGap && (
                                <div style={{ marginTop: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowManualInput((prev) => ({ ...prev, [countKey]: !prev[countKey] }))}
                                    style={{ background: 'none', border: 'none', color: colors.text, fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                  >
                                    {manualOpen ? '✕ Cancel' : '✏️ Or type your own way to cover this'}
                                  </button>
                                  {manualOpen && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                      <input
                                        value={manualText}
                                        onChange={(e) => setManualApproach((prev) => ({ ...prev, [countKey]: e.target.value }))}
                                        placeholder={`e.g. "book club with student-led discussion questions"`}
                                        style={{ flex: 1, fontSize: 11, padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 5 }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>
                              {!isGap && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }} title="How many times this year -- e.g. 3 Novel Studies">
                                  <span style={{ fontSize: 10, color: '#999' }}># this year</span>
                                  <button
                                    type="button"
                                    onClick={() => setOccurrenceCounts((prev) => ({ ...prev, [countKey]: Math.max(1, count - 1) }))}
                                    style={{ width: 20, height: 20, lineHeight: '18px', padding: 0, borderRadius: 4, border: `1px solid ${colors.border}`, background: '#fff', color: colors.text, fontSize: 12, cursor: 'pointer' }}
                                  >−</button>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, minWidth: 14, textAlign: 'center' }}>{count}</span>
                                  <button
                                    type="button"
                                    onClick={() => setOccurrenceCounts((prev) => ({ ...prev, [countKey]: Math.min(12, count + 1) }))}
                                    style={{ width: 20, height: 20, lineHeight: '18px', padding: 0, borderRadius: 4, border: `1px solid ${colors.border}`, background: '#fff', color: colors.text, fontSize: 12, cursor: 'pointer' }}
                                  >+</button>
                                </div>
                              )}
                              {isGap ? (
                                <button
                                  onClick={() => aiCoverGapCreatively(subject, elab, cat.key, cat.label, grade, manualText)}
                                  disabled={creativeBuildingKey === elab.key}
                                  title={manualText ? 'Build out the approach you typed' : `Not yet covered in ${cat.label} -- have AI invent a creative, non-obvious way to cover it`}
                                  style={{ padding: '4px 10px', background: '#7a3c8a', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  {creativeBuildingKey === elab.key ? 'Inventing…' : manualText ? '✨ Build my way' : '✨ AI: creative way to cover this'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => addUnitFromElaboration(subject, elab, cat.key, count)}
                                    disabled={addingElabKey === elab.key}
                                    title={`Insert ${count > 1 ? count + ' empty placeholder units' : 'an empty placeholder unit'} for ${cat.label} -- fill in the details yourself later`}
                                    style={{ padding: '4px 10px', background: colors.text, color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    {addingElabKey === elab.key ? 'Adding…' : `+ Add as a Unit Frame${count > 1 ? ` (×${count})` : ''} (empty, add info later)`}
                                  </button>
                                  <button
                                    onClick={() => aiBuildUnit(subject, elab, cat.key, cat.label, grade, count)}
                                    disabled={aiBuildingKey === elab.key}
                                    title={`Have AI generate ${count > 1 ? count + ' separate' : 'real'} unit(s) for ${cat.label} right now`}
                                    style={{ padding: '4px 10px', background: C.gold, color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    {aiBuildingKey === elab.key ? 'Building…' : `✨ AI build me this unit${count > 1 ? ` (×${count})` : ''}`}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const TABS = [
                      { key: 'activities', label: `Activities (${catElaborations.length})` },
                      { key: 'content', label: `Content (${catUnits.length})` },
                      { key: 'competency', label: `Curricular Competency (${catUnits.length})` },
                    ]

                    return (
                      <div key={cat.key} style={{ marginBottom: 16, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12 }}>
                        <h3 style={{ fontSize: 13, color: colors.text, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          {cat.label}
                        </h3>

                        {/* Teacher picks the starting point -- Activities (Elaboration ideas), Content, or Curricular Competency. Only the selected view renders; switch anytime. */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                          {TABS.map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setLaStartingView((prev) => ({ ...prev, [cat.key]: tab.key }))}
                              style={{
                                padding: '5px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                border: `1px solid ${colors.border}`,
                                background: startingView === tab.key ? colors.text : '#fff',
                                color: startingView === tab.key ? '#fff' : colors.text,
                              }}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {startingView === 'activities' && (
                          <div style={{ marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {coveredElabs.map((elab) => elabCard(elab, false))}
                            {gapElabs.length > 0 && (
                              <>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#a33', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: coveredElabs.length > 0 ? 6 : 0 }}>
                                  Not yet covered ({gapElabs.length})
                                </div>
                                {gapElabs.map((elab) => elabCard(elab, true))}
                              </>
                            )}
                            {catElaborations.length === 0 && (
                              <p style={{ fontSize: 12, color: colors.text, opacity: 0.6, margin: 0 }}>No Elaboration ideas for this section yet.</p>
                            )}
                          </div>
                        )}

                        {(startingView === 'content' || startingView === 'competency') && (
                          <div>
                            {catUnits.length > 0 ? catUnits.map((u) => renderUnitRow(u, startingView === 'competency')) : (
                              <p style={{ fontSize: 12, color: colors.text, opacity: 0.6, margin: 0 }}>No units here yet -- switch to the Activities tab to add one from the Elaboration ideas.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  subjectUnits.map(renderUnitRow)
                )
              )}
            </div>
          )
        })}

        <button onClick={save} disabled={saving} style={{ padding: '10px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save Priorities'}
        </button>
      </div>
    </div>
  )
}


