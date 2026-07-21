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
Filled 2026-07-15. Note this lens runs 10 explicit monthly standards-blocks rather than the 5-period/20%-each draft sketched earlier in this doc — the month-by-month below supersedes that draft's period framing (the 5x20% split can still work as a rolled-up Year Overview summary of these 10 months, just needs re-deriving from this data rather than treated as separately authoritative).
- Sept Foundations & Proficiency Baseline — Math: review Grade 6 numeracy, diagnostic placement tasks; ELA: reading strategies (predicting, questioning, summarizing), baseline writing sample; Competencies: self-assessment, goal-setting, "I can" statements
- Oct Number & Operations Standards — Math: fraction equivalence/ordering/add-subtract, ratios and proportional reasoning; ELA (supporting): word problems, math journals; Competencies: reasoning and modeling with numbers
- Nov Algebra Standards — Math: expressions, variables, simple equations, patterns and relationships; ELA (supporting): explaining algebraic thinking in writing; Competencies: representing patterns, solving for unknowns
- Dec Geometry & Measurement Standards — Math: area/perimeter/volume of common shapes, angle types and measurement; Competencies: visualizing/describing shapes, using tools accurately
- Jan Science: Cells & Body Systems Standards — Science: cell structure and function, major body systems and interactions; Competencies: questioning, planning investigations, using models
- Feb Science: Heat & Energy Standards — Science: heat transfer (conduction/convection/radiation), particle model of matter; Competencies: observing, measuring, explaining phenomena
- Mar Science: Forces & Machines Standards — Science: gravity/friction/balanced-unbalanced forces, simple machines and mechanical advantage; Competencies: designing and testing devices, interpreting results
- Apr Social Studies: Ancient Civilizations Standards — SS: Mesopotamia/Egypt/Greece/Rome (governance, belief systems, technology); Competencies: inquiry into continuity/change, cause/effect, evidence use
- May Social Studies: Global Issues Standards — SS: contemporary global issues (conflict, poverty, climate), children's rights, international organizations; Competencies: taking perspectives, evaluating responses, proposing actions
- Jun Integration & Proficiency Summative — Cross-curricular integrated tasks drawing on math/science/SS/ELA; Competencies: communicating understanding, reflecting on growth; Standards focus: summative proficiency-scale judgments on key learning standards

## Resolved: lens-period sliders vs. unit-priority sliders (2026-07-15)
Two-level time allocation, defined top-down:
1. **Year-level lens % defines the time window.** E.g. PBL's "Engineer a Machine — 30% of year" ≈ 12 of 40 weeks.
2. **Unit-priority sliders (within that window) define subject time shares.** E.g. within those 12 weeks: Science 60%, Math 25%, ELA 15% — even when subjects are integrated daily rather than blocked separately.
3. **Week-by-week generation reads both layers in order**: pull the lens period + its week-count, pull the unit priorities inside that period, then distribute standards-aligned tasks across weeks so each subject's targeted standards get covered in proportion to its slider by the period's end.

Plain version: **lens-period sliders define *when*; unit-priority sliders define *what proportion of content* fills that window.** This directly connects UNIT_PRIORITY_SCHEDULING_SPEC.md's unit sliders to this doc's lens-period sliders — they're not two independent systems, unit sliders operate *inside* whatever window a lens period carves out.

## Resolved: lens choice scope (2026-07-15)
Two-tier model, chosen over strict per-teacher or strict per-subject:
- **Primary lens (per teacher)** — one dominant lens for the whole year (e.g. "this teacher runs a PBL year"), used to frame the week: theme, driving question, or project context.
- **Secondary lens (per subject, optional)** — a subject can run its own lens for how its tasks/progression are structured inside each block (e.g. Math = Standards-Based, Science = Inquiry-Based, SS = Place-Based), even while the primary lens still frames the overall week experience.
- This keeps the classroom experience coherent (one clear year-long framing story) while still letting subject-specific pedagogy vary underneath it.

## Layer status: Year-level detail is complete (2026-07-15)
All three prior open questions are now resolved:
1. Lens-period vs. unit-priority slider relationship — resolved above (windowing model).
2. Lens choice scope — resolved above (primary/secondary two-tier model).
3. Standards-Based month gap — filled above.

**Sequencing update, 2026-07-21 — see `docs/YEAR_PLAN_SEQUENCING_REFINED.md`.** This doc's "ready to move to Week-by-week planning" note (below) skipped 4 steps a real teacher takes first: summative assessment planning, formative assessment mapping, differentiation/supports, and resources/materials — all mapped against Aj's reference teacher workflow in the refined doc. Week-by-week generation should follow *that* plan for Unit Assessment & Support first, not go straight from Unit Priority to Week/Day content as originally noted here.

Ready to move to Week-by-week planning. Week generation logic should implement the windowing model above: read lens period + week count → read unit priorities inside that window → distribute tasks.
