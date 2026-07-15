# Year Plan — Curriculum Lens Templates
_Captured 2026-07-15. 9 lenses, matching the 9 curriculum models already built in lib/curriculum-models.js._

## The 9 lenses
1. **Subject-Centered** — traditional separate-subject blocks, linear skill progression
2. **Skills-Based / Competency-Based** — organized around core competencies and demonstrated performance, flexible pacing
3. **Standards-Based** — BC's official structure: Big Ideas + Curricular Competencies + Content together
4. **Inquiry-Based** — driving questions, student-led investigation cycles
5. **Project-Based Learning (PBL)** — long-term, authentic, interdisciplinary projects with public products
6. **Place-Based** — local land, community, Indigenous knowledge, aligned with BC's First Peoples Principles of Learning
7. **Integrated / Interdisciplinary** (`theme_integrated`) — subjects blended around concepts (e.g. "Systems" taught through science, socials, math, ELA together)
8. **Spiral** — concepts revisited and deepened over time with increasing complexity
9. **Mastery / Competency-Based Progressions** — organized around mastery rather than grade level, flexible timelines

## Key principle
Same BC content and standards, different organizing lens. Every lens produces the same 4-level structure — **Year Overview → Month Plan → Week Plan → Day Plan** — but what anchors each level (a Big Idea/standard, a project, a driving question, a place-based anchor, etc.) changes with the lens.

**Hard cutoffs stay identical across all 9 lenses** — these come from standing constraints already spec'd elsewhere, not from the lens choice:
- Term dates / school year boundaries (Yearly & Term Calendar spec)
- Total instructional hours available (Unit Priority & Scheduling spec — mismatch warnings)
- Fixed/non-movable blocks: PE, Library, non-contact, banded literacy (Weekly Schedule Builder spec)
- Subject scrutiny tier (LA/Math high-detail always; other subjects default light, opt-in escalation)

The lens changes *how content is grouped and framed*, not *when things happen* or *how much time exists*.

## Structure per lens (all 4 levels, every lens)
- **Year Overview** — roughly 4 chunked periods across the year (Sept–Nov / Dec–Jan / Feb–Mar / Apr–Jun), each anchored to the lens's organizing unit
- **Month Plan** — one period zoomed in: the specific activities/sub-topics inside that period's anchor
- **Week Plan** — one week zoomed in further
- **Day Plan** — one day fully scheduled with time blocks and a stated Learning Target tied back to the lens anchor

## Relationship to existing specs
- Currently `MODEL_TO_FOCUS` in `lib/bc-curriculum.js` maps each of the 9 curriculum models down to 3 buckets (big_ideas/content/competency) purely for *which BC curriculum section to emphasize in the AI generation prompt*. This lens-template concept is a bigger ask: the **Year/Month/Week/Day scaffolding itself** should visibly reorganize around the chosen lens (e.g. PBL's Year Overview is a sequence of 4 projects; Subject-Centered's is traditional subject blocks), not just bias which curriculum text gets pulled in.
- Status: **spec only, not yet built.** Sequencing: Year Plan (this) → Weekly Schedule Builder → mismatch resolution.
