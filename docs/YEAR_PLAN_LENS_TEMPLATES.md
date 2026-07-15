# Year Plan — Curriculum Lens Templates
_Captured 2026-07-15. 9 lenses, matching the 9 curriculum models already built in lib/curriculum-models.js. Each lens breaks the year into periods with a default % allocation — teacher adjusts via sliders._

## Priority slider principle (Aj, 2026-07-15)
Each lens's Year Structure is a set of periods (usually 3-5) that together cover 100% of the year. Every period starts at a **default percentage** (shown below, from Aj's Grade 7 BC example). Teachers get a **slider per period** to reprioritize — increasing one period's % pulls from the others so the set still sums to 100%. This is the year-level counterpart to the unit-level priority sliders already spec'd (UNIT_PRIORITY_SCHEDULING_SPEC.md) — same mechanic, one level up in the hierarchy (lens period vs. individual unit).

## The 9 lenses, with default year-structure percentages (Grade 7 BC example)

### 1. Standards-Based
BC's official structure: Big Ideas + Curricular Competencies + Content together. No single percentage example was given for this lens specifically — it's the baseline/default lens, and its period breakdown should reflect the BC curriculum's own natural content sequence (similar in spirit to a straightforward content-topic split across the year) rather than a separately invented set of periods.

### 2. Skills-Based / Competency-Based
- Inquiry & Questioning — 20%
- Analyzing & Interpreting — 30%
- Communicating — 20%
- Applying & Innovating — 30%

### 3. Inquiry-Based
- Who am I in my community? — 20%
- How do systems shape life? — 30%
- How does energy move? — 25%
- How are we connected globally? — 25%

### 4. Project-Based Learning (PBL)
- Build a Sustainable City — 30%
- Create a Museum Exhibit — 20%
- Engineer a Machine — 30%
- Produce a Documentary — 20%

### 5. Place-Based
- Local Watershed — 25%
- Local First Nations Knowledge — 25%
- Local Ecosystems — 25%
- Local Industry & Global Links — 25%

### 6. Integrated / Interdisciplinary (`theme_integrated`)
- Power — 25%
- Change — 25%
- Systems — 25%
- Identity — 25%

### 7. Spiral
- Ecosystems → Human Systems → Global Systems — 40%
- Fractions → Algebra → Geometry — 30%
- Narrative → Informational → Persuasive Writing — 30%

### 8. Mastery / Competency-Based Progressions
- Inquiry Mastery — 25%
- Communication Mastery — 25%
- Numeracy Mastery — 25%
- Scientific Reasoning Mastery — 25%

### 9. Subject-Centered
- Math — 20%
- ELA — 25%
- Science — 20%
- Social Studies — 15%
- ADST — 10%
- Arts + PHE — 10%

## Key principle (unchanged)
Same BC content and standards, different organizing lens. Every lens produces the same 4-level structure — **Year Overview → Month Plan → Week Plan → Day Plan** — but what anchors each level (a project, a driving question, a place-based anchor, a subject, etc.) changes with the lens.

**Hard cutoffs stay identical across all 9 lenses** — these come from standing constraints already spec'd elsewhere, not from the lens choice:
- Term dates / school year boundaries (Yearly & Term Calendar spec)
- Total instructional hours available (Unit Priority & Scheduling spec — mismatch warnings)
- Fixed/non-movable blocks: PE, Library, non-contact, banded literacy (Weekly Schedule Builder spec)
- Subject scrutiny tier (LA/Math high-detail always; other subjects default light, opt-in escalation)

The lens changes *how content is grouped, framed, and time-weighted* — not *when things happen* or *how much total time exists*.

## Structure per lens (all 4 levels, every lens)
- **Year Overview** — the lens's periods (table above), each with its adjustable %
- **Month Plan** — one period zoomed in: the specific activities/sub-topics inside that period's anchor
- **Week Plan** — one week zoomed in further
- **Day Plan** — one day fully scheduled with time blocks and a stated Learning Target tied back to the lens anchor

## Relationship to existing specs
- Currently `MODEL_TO_FOCUS` in `lib/bc-curriculum.js` maps each of the 9 curriculum models down to 3 buckets (big_ideas/content/competency) purely for *which BC curriculum section to emphasize in the AI generation prompt*. This lens-template concept is a bigger ask: the **Year/Month/Week/Day scaffolding itself** should visibly reorganize around the chosen lens, with teacher-adjustable % weighting per period, not just bias which curriculum text gets pulled in.
- Status: **spec only, not yet built.** Sequencing: Year Plan (this) → Weekly Schedule Builder → mismatch resolution.
