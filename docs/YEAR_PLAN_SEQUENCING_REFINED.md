# Year Plan — Full Sequencing, Refined Against Teacher-Authentic Workflow
_2026-07-21, Aj. Reconciles docs/YEAR_PLAN_LENS_TEMPLATES.md and
docs/UNIT_PRIORITY_SCHEDULING_SPEC.md against the broad-to-specific 11-step
workflow teachers actually use (Aj's reference, captured verbatim below the
mapping). Verdict: 7 of 11 steps were already covered by the existing two
specs, just under different names — mapped below. 4 were genuine gaps with
no home in either spec. This doc slots them in and fixes the sequencing._

## The 11-step reference workflow (source of truth for this doc)
1. Review curriculum standards
2. Identify year-long learning goals
3. Determine major units of study
4. Sequence the units logically
5. Allocate time for each unit
6. Plan summative assessments
7. Map formative assessments
8. Break units into learning sequences
9. Plan differentiation and supports
10. Identify resources and materials
11. Create the year-long pacing guide

## Mapping to what's actually built/spec'd today

| # | Step | Status | Where |
|---|---|---|---|
| 1 | Review curriculum standards | ✅ Shipped | `lib/bc-curriculum.js` — BC curriculum fetcher |
| 2 | Identify year-long learning goals | 🟡 Implicit | The chosen lens's Year Overview periods (`LENS_TEMPLATES` in `lib/year-plan.js`) ARE the year's overarching goals, stated through that lens's framing — but currently only surfaces as period labels a teacher slides %s on, never stated back to them as "here are this year's goals." See recommendation below. |
| 3 | Determine major units of study | ✅ Spec'd, matches exactly | `lib/unit-priorities.js` `DEFAULT_UNITS` — per-subject breakdown (LA: Reading/Writing/Oral Language; Math: Number/Patterns & Algebra/Geometry & Measurement/Data & Probability; etc.) populate-then-prune, matching the reference's "chapters of the year" language precisely |
| 4 | Sequence the units logically | ✅ Shipped | `sort_order` field on both `year_plan_lens_prefs` (period level) and unit priority rows (unit level) |
| 5 | Allocate time for each unit | ✅ Spec'd, resolved | Two-tier windowing model in `YEAR_PLAN_LENS_TEMPLATES.md`: `period_pct` (year-level, WHEN) → `computeWeekWindows()` converts to actual week ranges → unit priority weights (WHAT proportion of content fills that window) |
| 6 | Plan summative assessments | ❌ **Gap** | No field anywhere in either spec |
| 7 | Map formative assessments | ❌ **Gap** | No field anywhere in either spec |
| 8 | Break units into learning sequences | 🟡 Spec'd, not built | Year → Month → Week → Day zoom levels — this is the literal next planned step per the lens doc ("Ready to move to Week-by-week planning") |
| 9 | Plan differentiation and supports | ❌ **Gap** | No field anywhere. May exist ad hoc at the individual day-plan/lesson level elsewhere in the app, but nothing wired into the Year Plan flow itself |
| 10 | Identify resources and materials | ❌ **Gap** | Same — not present at the Year Plan / Unit level |
| 11 | Create the year-long pacing guide | ✅ Shipped | `app/print/scope-sequence` — the printable final output |

**Bottom line: the architecture is sound and the ordering is correct where it exists — the gap is 4 missing steps (6, 7, 9, 10), not a wrong sequence.**

## Where the 4 gaps slot in — this is the part that needed refining

The reference workflow's real teeth is in the *order*: assessments (6, 7) get planned **before** breaking units into learning sequences (8). That's backward design (Understanding by Design) — decide how you'll know they've learned it before deciding how you'll teach it. The current build sequencing jumps straight from Unit Priority (step 5) to "Week-by-week planning" (step 8) with nothing in between. That's exactly where 6, 7, 9, and 10 need to insert — not at the end, not bolted onto step 11.

**Refined build sequencing (supersedes the "Sequencing" note in both existing docs):**

```
Grade/Subject selection
  → BC curriculum fetch                                    [shipped]
  → Unit generation + priority                              [spec'd — UNIT_PRIORITY_SCHEDULING_SPEC.md]
  → Unit Assessment & Support Planning  ← NEW, this doc      [steps 6/7/9/10]
  → Month / Week / Day generation                            [spec'd — YEAR_PLAN_LENS_TEMPLATES.md, next planned step]
  → Weekly Schedule Builder                                  [spec'd elsewhere]
  → Scope & Sequence pacing guide (print)                    [shipped]
```

## New: Unit Assessment & Support Planning

One screen, one pass per unit (per row in unit priorities — or per period directly, for single-subject lenses like Standards-Based/Subject-Centered where a period *is* a unit). Steps 6, 7, 9, 10 are grouped into one screen rather than four, because from a teacher's chair they're naturally answered together: you look at one unit and decide *how I'll know they learned it, formally and informally, who needs extra support, and what I need to pull off the shelf.*

Proposed fields (one row per unit, all optional — matches the app's existing populate-then-prune pattern, a teacher wanting just the pacing guide shouldn't be blocked):

- `summative_assessment_type` — enum: `project` / `test` / `performance` / `portfolio` / `other`
- `summative_assessment_notes` — free text
- `formative_checkpoints` — free text or a short repeatable list (e.g. "exit ticket after lesson 3", "first-draft conference")
- `differentiation_notes` — free text, taggable by the reference's own 4 categories: ELL / IEP / enrichment / scaffold
- `resources_needed` — free text or tag list, taggable by the reference's own 6 categories: textbook / digital tool / manipulative / lab supply / reading / media

## Step 2 recommendation
Add a small read-only "This Year's Goals" summary, generated from the chosen lens's period labels, shown once before a teacher starts adjusting % sliders — makes step 2 an explicit, visible moment instead of something a teacher only infers backward from the periods they're about to reweight.

## Migration
Not yet applied. Proposing a new `unit_support_plan` table (one row per unit_priority row, same RLS pattern as `year_plan_lens_prefs`, ca-central-1) rather than adding 5 columns directly to `unit_priorities` — keeps the "just the pacing guide" fast path from carrying unused columns. Will write the actual SQL once Aj confirms this is the right home for it (vs. e.g. folding into the existing unit_priorities row).

## Status
Spec only, refining sequencing per Aj request 2026-07-21. Not yet built. Should land *before* Week/Day generation logic (the previously-next-planned step) so that generation can pull assessment/differentiation context into actual lesson content once it exists, rather than retrofitting it in after Week/Day is already built.
