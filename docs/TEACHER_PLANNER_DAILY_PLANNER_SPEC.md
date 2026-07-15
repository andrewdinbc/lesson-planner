# Teacher Planner — Daily/Weekly Planner Feature Spec
_Captured 2026-07-15 from Aj's exact spec. Companion to the existing `ics_teacher_planner_*` task cluster (quiz generator, reading activity generator, whiteboard explainer, academic breaks) queued 2026-06-21._

A teacher's daily planner revolves around four core categories: planning, assessment, meetings, and class management, plus a yearly/term calendar layer.

## 1. Daily & Weekly Planning Pages
- **Weekly overview** — units being taught, assessments due, duties, meetings, reminders
- **Timetable blocks** — period-by-period schedule, room changes, recurring duties
- **Condensed lesson planning** — objectives, key activities, differentiation notes, resources, homework

Goal: reduce cognitive load by keeping essential info visible at a glance.

## 2. Assessment & Marking Records
- **Assessment notes** — free-text qualitative observations (e.g. "struggled with mixed numbers; reteach Tuesday")
- **Marking trackers** — records aligned to the school's marking policy
- **Follow-up actions** — space to note interventions, reteach plans, student-specific needs

Goal: source material for report cards, parent meetings, conferences.

## 3. Meeting Notes & Action Logs
- **Staff meeting notes** — key decisions, reminders, deadlines
- **Department/faculty notes** — curriculum alignment, shared resources, planning cycles
- **Action logs** — track commitments and follow-ups

Goal: consolidate scattered meeting notes into one place; useful for performance reviews / verifying completed tasks.

## 4. Class & Student Management Pages
- **Class lists** — names, groups, seating notes
- **Incident logs** — dated, factual notes protecting both teacher and student
- **Behavior/participation trackers** — quick reference for patterns or concerns

Goal: support classroom consistency and communication with families/admin.
Note: incident logs and behavior trackers touch student data — must follow the existing roster-folder library (File System Access API, `lib/roster-folder.js`) and ca-central-1 Supabase standing rules.

## 5. Yearly & Term Calendars
- Term dates
- Assessment periods
- School events

Goal: long-term pacing, prevents scheduling conflicts.

## Design principle (Aj's key takeaway)
Clarity, practicality, consistency. Avoid clutter — emphasize the sections teachers actually use under pressure: weekly planning, assessments, incidents, and ideas.

## Integration notes
- This is a distinct layer from the BC/Alberta/Ontario curriculum-fetch + year-plan generation work already shipped in `lesson-planner` (Big Ideas/Content/Curricular Competency, multi-grade support) — that's the AI *generation* engine; this spec is the day-to-day *operating* surface teachers live in around it.
- Natural home: new top-level sections/tabs in `lesson-planner` (or a dedicated "Daily Planner" area) sitting alongside the existing hierarchical year→month→week→day→lesson plan structure, rather than a separate product.
- Status: **spec only, not yet built.** Needs scoping into discrete Hyperion tasks (e.g. one per category above) before queuing.

## Business model clarification (Aj, 2026-07-15)
Teacher Planner (this daily/weekly planner spec) and TeacherAssist (report card comment generator) are **sold separately on TPT** — distinct listings, distinct purchases. They are only bundled/positioned together as part of the **holistic ecosystem offering sold through optimizeyourfreedom.com** (the existing Tier 3 model). This applies generally across Aj's product line, not just these two:
- TPT listings = standalone, single-purpose products, priced and marketed independently, each needs to work and sell on its own.
- optimizeyourfreedom.com = the ecosystem upsell, where owning multiple standalone products together is the pitch.
- Build implication: Teacher Planner's daily/weekly planner should be architecturally separable from TeacherAssist (even if they happen to share the `lesson-planner` codebase/repo) — no hard dependency that would break one if sold without the other. Cross-linking/integration is a Tier 3 ecosystem feature, not a base requirement.

## Weekly Schedule Builder (elementary) — spec captured 2026-07-15, NOT NEXT IN FLOW
Aj flagged this as info to remember for later — he believes the Year Plan needs to be finished first, and this weekly-schedule builder comes after, at the "week plan" stage. Do not build yet; revisit when the flow reaches weekly planning.

### Inputs to collect (elementary schools)
- Weekly schedule shape: prep time / non-contact time
- Lunch time
- Block length(s)
- School start and end time
- Fixed/non-movable blocks: PE, Library, Non-contact, banded literacy — these anchor the schedule and can't be shifted
- Preference signal: many teachers want Core classes (literacy, numeracy) in the morning — should inform auto-placement, not just be a checkbox

### Interaction model
- Teacher checkboxes the **types and sizes** of blocks they need (not manual entry of every block)
- System **auto-populates** an approximate weekly grid from those selections + fixed constraints + AM-core preference
- Resulting weekly view must be **draggable and dynamic**: dragging a block to a new slot in a column automatically shifts all other blocks in that column down (reflow, not overlap/overwrite)

### Open questions for when this is scoped
- Exact drag/reflow behavior across column boundaries (does dragging into a different day only affect that day's column, or does it ripple further?)
- How fixed blocks (PE/Library/etc.) interact with drag - are they lockable/non-draggable themselves, or just anchors for initial placement?
- Relationship to the Year Plan's time-distribution sliders (teacher-led/seatwork/collaborative/hands-on/student-led/non-instructional, already captured in the onboarding inventory) — likely feeds this weekly grid's proportions.

### Sequencing note
Confirmed with Aj: Year Plan generation flow should be completed/stable first; this Weekly Schedule Builder is the next layer after that, part of the Week-level planning stage.
