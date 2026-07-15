# Year Plan — 12 Curriculum Lens Templates
_Captured 2026-07-15 from Aj's example output (Grade 7 BC, all subjects). This is the shape the Year Plan generator should take depending on which curriculum model/lens the teacher picked in onboarding (curriculum_model field, already captured — see MODEL_TO_FOCUS in lib/bc-curriculum.js, which currently only buckets into 3 focuses: big_ideas / content / competency)._

## Key principle
**Same BC content and standards, different organizing lens.** Every lens produces the same 4-level structure — Year Overview → Month Plan → Week Plan → Day Plan — but what anchors each level (a Big Idea, a content topic, a competency, a project, a driving question, etc.) changes with the lens. Layout/flow differs by lens, but **hard cutoffs stay identical across all 12** — these come from the standing constraints already spec'd elsewhere, not from the lens choice:
- Term dates / school year boundaries (Yearly & Term Calendar spec)
- Total instructional hours available (Unit Priority & Scheduling spec — mismatch warnings)
- Fixed/non-movable blocks: PE, Library, non-contact, banded literacy (Weekly Schedule Builder spec)
- Subject scrutiny tier (LA/Math high-detail always; other subjects default light, opt-in escalation)

The lens changes *how content is grouped and framed*, not *when things happen* or *how much time exists*.

## The 12 lenses (Aj's existing SUBJECT... err CURRICULUM_MODEL options, per the Basic-4/Advanced-9 picker already built)
1. **Big Ideas** — year themes = conceptual understandings (e.g. Identity & Culture, Interconnected Systems)
2. **Content** — year topics = knowledge/subject content in sequence (e.g. Geography, Cells & Systems, Fractions/Algebra)
3. **Curricular Competency** — year strands = skills/processes (Inquiry, Analyzing, Communicating, Applying)
4. **Theme-Based** — year themes = cross-cutting concepts (Power, Change, Systems, Identity)
5. **Project-Based Learning (PBL)** — year = sequence of long-term projects (sustainable city, museum exhibit, engineered machine, documentary)
6. **Inquiry-Based** — year = driving questions (Who am I in my community? How do systems shape life?)
7. **Place-Based** — year anchors = local land/community (watershed, local First Nations knowledge, local ecosystems, local industry)
8. **Indigenous / FPPL-Aligned** — year organized around First Peoples Principles of Learning (holistic, relational, experiential, patience)
9. **Interdisciplinary** — year concepts spanning subjects (Systems, Patterns, Change, Relationships — same concept hit from Math/ELA/Science angles in the same month)
10. **Spiral Curriculum** — year = revisiting the same threads with increasing complexity (fractions→algebra→geometry; ecosystems→human systems→global systems)
11. **Mastery / Competency-Based** — year = mastery targets (Inquiry mastery, Communication mastery, Numeracy mastery, Scientific reasoning mastery)
12. **Subject-Centered** — year = traditional subject blocks (Math, ELA, Science, Social Studies, ADST, Arts, PHE), most conventional/least novel lens

## Structure per lens (all 4 levels, every lens)
- **Year Overview** — 4 chunked periods across the year (roughly Sept–Nov / Dec–Jan / Feb–Mar / Apr–Jun in Aj's example), each anchored to the lens's organizing unit (a Big Idea, a topic, a competency strand, a project, etc.)
- **Month Plan** — one period zoomed in: a short list of the specific activities/sub-topics that live inside that period's anchor
- **Week Plan** — one week zoomed in further: activities for that specific week
- **Day Plan** — one day fully scheduled with time blocks and a stated Learning Target tied back to the lens anchor

## Relationship to existing specs
- This is the layer that sits between "curriculum model selection" (already built — Basic 4/Advanced 9 picker + BC curriculum fetch) and the Weekly Schedule Builder (not yet built). The Year Plan generator needs to actually produce content in this 4-level shape per lens, not just pick a focus field for the AI prompt as it does today.
- Currently `MODEL_TO_FOCUS` in `lib/bc-curriculum.js` only maps each of the (up to) 9 curriculum models down to 3 buckets (big_ideas/content/competency) for *which BC curriculum section to emphasize in generation*. This 12-lens template spec is a bigger ask: it implies the **year/month/week/day scaffolding itself** should visibly follow the chosen lens, not just bias which curriculum text gets pulled in.
- Status: **spec only, not yet built.** Sequencing still: Year Plan (this) → Weekly Schedule Builder → mismatch resolution.
