# Year Plan — Curriculum Lens Templates
_Captured 2026-07-15. 9 lenses, matching the 9 curriculum models already built in lib/curriculum-models.js. Each lens breaks the year into periods with a default % allocation — teacher adjusts via sliders._

## Priority slider principle (Aj, 2026-07-15)
Each lens's Year Structure is a set of periods (usually 3-5) that together cover 100% of the year. Every period starts at a **default percentage** (shown below, from Aj's Grade 7 BC example). Teachers get a **slider per period** to reprioritize — increasing one period's % pulls from the others so the set still sums to 100%. This is the year-level counterpart to the unit-level priority sliders already spec'd (UNIT_PRIORITY_SCHEDULING_SPEC.md) — same mechanic, one level up in the hierarchy (lens period vs. individual unit).

## The 9 lenses, with default year-structure percentages (Grade 7 BC example)

### 1. Standards-Based
BC's official structure: Big Ideas + Curricular Competencies + Content together, organized as one integrated strand per major curriculum area rather than splitting Big Ideas/Content/Competencies apart. DRAFT example (Grade 7 BC) — flagged for Aj's refinement:
- Geography & Human Systems — 20%
- Cells, Body Systems & Science Foundations — 20%
- Heat, Energy & Forces — 20%
- Numeracy Progression (Fractions, Algebra, Geometry, Data) — 20% (spread across year, not a single block)
- Global Issues, Civilizations & Sustainability — 20%

What is taught: each period pulls its Big Idea + Curricular Competencies + Content directly from the matching BC curriculum area for that period (e.g. Science's Big Ideas/Competencies/Content for the "Heat, Energy & Forces" period) — this is the one lens where all three elements are always presented together rather than one being the anchor and the others supporting.

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

## Month-by-month breakdowns, maximum content detail (Grade 7 BC example, final pass 2026-07-15)
Filtered to the 9 built lenses only (dropped Big Ideas, Content, FPPL, Interdisciplinary-as-separate, same exclusions as elsewhere). This is the third and most granular pass — each month now lists specific sub-topics, not just subject areas. Treat this as the authoritative content-detail layer; it supersedes the two earlier month-by-month passes above it in commit history (kept in git history, not duplicated here).

### Skills-Based / Competency-Based
- Sept Inquiry Skills — asking testable questions, hypothesis building, planning investigations, selecting variables
- Oct Data Collection — measurement techniques, recording data, using tools (thermometers, scales, rulers)
- Nov Analysis — graphing (line, bar, scatter), identifying patterns, drawing conclusions
- Dec Communication — paragraph structure, oral presentations, argument writing, evidence-based claims
- Jan Innovation — design thinking, prototype development, iteration cycles
- Feb Innovation (cont.) — engineering challenges, testing + redesign
- Mar Critical Thinking — evaluating sources, bias + perspective, credibility checks
- Apr Personal/Social Skills — identity, collaboration, conflict resolution
- May Competency Integration — multi-competency project
- Jun Mastery Showcase — portfolio

### Integrated / Interdisciplinary (`theme_integrated`, using "Theme-Based" months)
- Sept Power — SS: government systems, authority; Science: energy sources; ELA: power dynamics in literature
- Oct Power (cont.) — SS: social power structures; Science: energy transfer; ADST: technological power
- Nov Change — SS: historical change (civilizations); Science: climate change; ELA: character change
- Dec Change (cont.) — ADST: technological change; Arts: change in artistic styles
- Jan Systems — Science: ecosystems; Math: number systems; SS: human systems
- Feb Systems (cont.) — Science: mechanical systems; SS: global systems
- Mar Identity — ELA: identity texts; SS: cultural identity
- Apr Identity (cont.) — Arts: identity expression; PHE: personal identity
- May Integration — cross-theme project
- Jun Showcase — theme exhibition

### Project-Based Learning (PBL)
- Sept–Oct Sustainable City Project — urban planning, ecosystems, energy systems, mapping, population density
- Nov Museum Exhibit Project — ancient civilizations, artifacts, historical storytelling, exhibit design
- Dec–Jan Documentary Project — global issues, research skills, media literacy, scriptwriting
- Feb–Mar Engineering Project — forces, simple machines, prototype testing, mechanical advantage
- Apr Community Action Project — local issues, advocacy, persuasive writing
- May Innovation Project — design thinking, student-selected content
- Jun Exhibition — presentation skills

### Inquiry-Based
- Sept Who am I? — identity, culture, personal narrative, community roles
- Oct How do systems shape life? — ecosystems, human systems, interdependence
- Nov How do systems shape life? (cont.) — energy flow, feedback loops
- Dec How does energy move? — heat transfer, particle theory
- Jan How does energy move? (cont.) — forces, machines
- Feb How are we connected globally? — trade, migration, globalization
- Mar How are we connected globally? (cont.) — climate, sustainability
- Apr Student-generated inquiries — content varies by student
- May Inquiry synthesis — content integrates across subjects
- Jun Showcase — communication skills

### Place-Based
- Sept Watershed — water systems, mapping local watershed, water cycle
- Oct Local Ecosystems — plants, animals, food webs, Indigenous ecological knowledge
- Nov Indigenous Knowledge — storywork, land relationships, seasonal cycles
- Dec Local Industry — forestry, fishing, tourism, resource extraction
- Jan Local Industry (cont.) — global trade links, supply chains
- Feb Local Climate — weather patterns, climate data, microclimates
- Mar Local Energy — hydro, solar, wind, local energy infrastructure
- Apr Stewardship — sustainability, action planning
- May Local History — archaeology, settlement, cultural landscapes
- Jun Community Exhibition — communication

### Spiral
- Sept Ecosystems — food chains, energy flow
- Oct Human Systems — cells, organs
- Nov Global Systems — climate, trade
- Dec Fractions — ratios, operations
- Jan Algebra — expressions, equations
- Feb Geometry — area, volume
- Mar Narrative Writing — story structure
- Apr Informational Writing — reports
- May Persuasive Writing — arguments
- Jun Spiral Review — all spirals revisited

### Mastery / Competency-Based Progressions
- Sept Inquiry Mastery — questions, hypotheses
- Oct Communication Mastery — oral + written skills
- Nov Numeracy Mastery I — fractions, ratios
- Dec Numeracy Mastery II — algebra basics
- Jan Scientific Reasoning I — variables, data
- Feb Scientific Reasoning II — analysis, conclusions
- Mar Social Reasoning — bias, evidence
- Apr Personal/Social — identity, collaboration
- May Mastery Projects — content varies by student
- Jun Showcase — communication

### Subject-Centered
- Sept Math + ELA Foundations — fractions, reading strategies
- Oct Social Studies — ancient civilizations
- Nov Science I — cells, systems
- Dec ELA Writing — narrative, informational
- Jan Math II — algebra, geometry
- Feb Science II — heat, energy
- Mar Science III — forces, machines
- Apr Social Studies II — global issues
- May ADST + Arts — coding, design, expression
- Jun PHE + Review — health, fitness, year review

### Standards-Based
Still no month-by-month example given across all three passes — outstanding. The Year Structure draft (5 periods × 20%) above needs a matching month breakdown before this lens is complete.

## Layer status: Year-level detail is done (Aj, 2026-07-15)
Aj considers this the final layer of year-level detail before moving to week-by-week. Claude agrees, with one caveat: **this is content detail, not build-readiness.** The three open structural questions from earlier are still unresolved and will matter once Week-level planning starts pulling from this year-level data:
1. How lens-period sliders (this doc) relate to unit-level priority sliders (UNIT_PRIORITY_SCHEDULING_SPEC.md) — still undefined.
2. Whether a teacher's lens choice applies uniformly across all subjects/grades or can vary — still undefined.
3. Standards-Based lens has no month-by-month example — the one lens with a real content gap.

None of these block continuing to Week-by-week conceptually, but they will need answers before this becomes a working generator rather than a content reference. Suggest resolving #1 either now or explicitly before Week-level work starts, since Week plans will need to know how time flows down from Year → Month → Week, and that flow currently has two undefined slider relationships in it.
