# Unit Generation & Priority Scheduling Spec
_Captured 2026-07-15 from Aj. Next step in the planning flow after Year Plan / grade+subject selection, before Weekly Schedule Builder (see TEACHER_PLANNER_DAILY_PLANNER_SPEC.md for that sequencing note)._

## Flow position
After a teacher has selected grades + subjects (already captured in the inventory flow) and curriculum data has been fetched (BC curriculum fetcher already shipped), generate the actual **teachable content, unit by unit, one subject at a time.**

## Unit structure by subject
- **Language Arts**: split into 3 strands — Reading, Writing, Oral Language. Units generated per strand.
- **Math**: units are NOT strand-split the same way — content/units are designed directly off the curricular document structure (i.e. follow whatever unit breakdown BC's Math curriculum content naturally implies, not an artificial fixed split).
- Other subjects: not yet specified by Aj — default to whatever the curriculum document's Content section implies, consistent with Math's approach, until told otherwise.

## Priority system
- **All units start at equal priority.**
- **Sliders per unit** let the teacher increase priority — higher priority = more instructional time allocated to that unit across the year.
- Real-world grounding example from Aj: Algebra and Fractions legitimately take longer than other math units in a typical year — the system should let a teacher's slider reflect that reality, not fight it.

## Auto-population + removal
- System **populates everything by default** (every unit implied by the curriculum, at equal priority).
- Teacher can **remove** units they are not focusing on extensively that year — populate-then-prune, not build-from-empty.

## Mismatch detection (the harder piece)
- Once priorities are set (and later, once the Weekly Schedule Builder shows how things actually get scheduled), the system needs to detect when total prioritized instructional hours don't fit inside the actual number of instructional hours in the school year.
- On mismatch: **warn the teacher**, don't silently fail or silently truncate.
- Teacher can resolve the warning by either:
  1. Overriding it (accept the mismatch, e.g. "I'll compress it")
  2. Adjusting priorities/removing units until it fits
- This is explicitly a **two-pass concern**: initial priority-setting is one check, but the real mismatch may only become visible after scheduling is attempted (Weekly Schedule Builder territory) — Aj is not fully certain this needs to be caught at both points or just once; flagged as something to refine once we're actually building it.

## Open questions / not yet resolved
- Exact formula for converting "priority" into instructional hours/time allocation (linear scaling? relative weighting against a fixed total pool? needs a concrete model before building the slider math)
- Where the "total instructional hours available this year" figure comes from — presumably derived from the (not-yet-built) Weekly Schedule Builder + Yearly/Term Calendar (term dates, assessment periods, school events already in the Daily Planner spec) — this spec depends on that data existing
- Non-Language-Arts, non-Math subject unit-breakdown convention — TBD

## Sequencing
Confirmed flow so far: Grade/Subject selection → BC curriculum fetch (shipped) → **Unit generation + priority (this spec)** → Weekly Schedule Builder (drag/reflow grid) → mismatch warnings likely need both systems in place to fully resolve.
Status: **spec only, not yet built.**
