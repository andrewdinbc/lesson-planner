# MCP Connector Research — Fit for TeacherAssist / Lesson Planner Ecosystem
_Compiled 2026-07-15. FOIPA-aware review of six connected MCP connectors._

## Method
Each connector was checked for actual tool availability (not just "Connected" status in Claude settings) by direct test call where possible. Recommendations weigh product fit against FOIPA (BC's Freedom of Information and Protection of Privacy Act) implications for anything touching real student data.

## FOIPA framing (applies to every connector below)
Our products (Student Portfolio, Assessment Tool, Math Mastery) handle real BC K-12 student data. Our own Supabase projects default to **ca-central-1** specifically for Canadian data residency — that's the bar every connector below is measured against.

**Default rule: these connectors are teacher-facing / curriculum-reference / content-generation tools only.** None should ever receive actual student names, work samples, grades, or other student PII. Data flowing *from* a connector *into* our products (standards text, diagrams, question banks — one-directional) is low risk. Any flow of real student data *to* a connector is high risk and needs case-by-case legal review before it happens, regardless of how useful the integration seems.

---

## 1. Learning Commons — ✅ integrate now
**Status:** Confirmed working (authless, no OAuth). Live-tested: `find_standard_statement("3.NF.A.1")` returned the correct Common Core statement and grade level.
**What it does:** CASE standards lookup, learning-component breakdown (standards → smaller teachable skills), prerequisite/subsequent progression mapping (Student Achievement Partners Coherence Map).
**Data flow:** One-directional, standards text only. No student data involved at all — this is pure curriculum reference data, same category as a textbook.
**FOIPA risk:** None. Nothing student-identifiable ever touches this connector.
**Product fit:** Strong. Could supplement the per-province static curriculum config files (the `lib/bc-curriculum.js` Hydra pattern) with live standards lookups, and could power standards alignment directly in the Year Plan / Unit Priorities pages — e.g. showing the actual CCSS/BC standard text next to a unit instead of just a label.
**Recommendation:** Integrate now. Lowest-risk, clearest fit of the six.

## 2. Coteach — integrate later (pilot-scoped)
**Status:** Connector shows "Connected" but tools didn't load via search in this session — likely still needs OAuth completion on top of being added (same class of issue as Brisk/Eedi below).
**What it does:** Generates classroom-ready K-12 math diagrams.
**Data flow:** One-directional — we'd send a topic/prompt, get back a diagram. No student data needed to generate a diagram.
**FOIPA risk:** None if used as designed (topic → diagram). Risk only appears if someone mistakenly sent student-specific content (e.g. "diagram showing [Student Name]'s error") in a prompt — should be a documented usage rule, not a technical control, since the connector itself has no student-data awareness.
**Product fit:** Strong candidate for the Remediation Video system's step-through visuals (see `math-mastery` repo's `docs/REMEDIATION_VIDEO_SYSTEM_SPEC.md`) — could handle the diagram-generation piece of the interactive step-through component instead of building that from scratch.
**Recommendation:** Integrate later, scoped to the Remediation Video pilot (multiplication chapter) once that system's Phase 1 (data layer) is built. Confirm OAuth/tool access works before committing to it as a dependency.

## 3. Brisk Teaching — research/monitor, no integration yet
**Status:** Connector shows "Connected" but tools didn't load — same OAuth gap as Coteach/Eedi.
**What it does:** Turns ideas into interactive student activities and standards-aligned materials; has a `list_standards` tool.
**Data flow:** Would be one-directional (prompt → generated material) if integrated, same shape as our own generation pipeline.
**FOIPA risk:** None for the generation direction. This one's a closer product overlap than a data-flow question, though.
**Product fit:** This significantly overlaps with what TeacherAssist and Lesson Planner already do (generate standards-aligned teaching materials). Worth a closer look as **competitive reference** — how do they structure their standards-alignment UX — rather than a build-vs-integrate candidate, since we already own this capability.
**Recommendation:** Don't integrate. Worth 30 minutes of manual product research (what does their UI/output look like) for competitive awareness, not a Hyperion build task.

## 4. Eedi — integrate later (pilot-scoped)
**Status:** Connector shows "Connected" but tools didn't load — same OAuth gap.
**What it does:** Math diagnostic question bank (`search_questions` / `get_questions`) — pre-authored diagnostic multiple-choice questions designed to reveal specific misconceptions.
**Data flow:** One-directional — we'd query for questions on a topic/misconception, get back question content. No student data sent.
**FOIPA risk:** None for the query direction. If Eedi's diagnostic questions were ever shown to real students and their *answers* were then sent back to Eedi for any kind of tracking/analytics, that would be a different, higher-risk flow requiring explicit review — flag this clearly if that kind of two-way integration is ever considered.
**Product fit:** Strong candidate for seeding `diagnostic_signs` in the `math_remediation_patterns` table (Remediation Video system spec) — rather than hand-authoring every diagnostic criterion from the Sherman/Richardson/Yard book alone, Eedi's existing validated diagnostic question bank could supplement or cross-check pattern coverage.
**Recommendation:** Integrate later, same phase as Coteach — once Remediation Video Phase 1 (data layer) exists, use Eedi's question bank as a content source for populating/validating diagnostic criteria, one-directional query only.

## 5. MagicSchool AI — competitive reference only
**Status:** Not tested (no obvious tool call attempted this session).
**What it does:** Saves teaching materials to their own Resource Library.
**Data flow:** Would be one-directional (push our content in) if integrated at all — but this is fundamentally a competitor's storage/organization product.
**FOIPA risk:** N/A — not a data-flow question, it's a positioning question. If ever asked "should we save our generated materials into MagicSchool's library," that would mean sending our IP into a competitor's platform — don't do this regardless of FOIPA.
**Product fit:** None as an integration target. Useful only as competitive-landscape awareness for TeacherAssist/Lesson Planner positioning.
**Recommendation:** Do not integrate.

## 6. Canva — integrate now (low-risk, clear utility)
**Status:** Not tested (design tool, no student-data-adjacent tool calls attempted).
**What it does:** Design/export for visual assets.
**Data flow:** One-directional — we'd send design content/text, get back formatted visual assets. No student data involved in typical use (thumbnails, marketing, worksheet templates).
**FOIPA risk:** Low. The only scenario needing caution: if Canva were ever used to auto-generate a worksheet that gets pre-filled with a real student's name before printing (Student Portfolio's QR-code worksheet flow) — that would put a student's name into a third-party design tool's history/storage. Recommend keeping student-name personalization as a separate, local step (printed/overlaid after export) rather than sending student names into Canva itself.
**Product fit:** Direct fit for TPT thumbnail/marketing asset production (currently manual/ad-hoc per product history) and worksheet *template* design (structure only, no student PII) for Student Portfolio.
**Recommendation:** Integrate now for marketing assets and blank worksheet templates. Keep student-name personalization out of Canva entirely — do that step locally after export.

---

## Summary table

| Connector | Working now? | Student PII risk | Recommendation |
|---|---|---|---|
| Learning Commons | ✅ Yes | None | Integrate now |
| Coteach | ⚠️ OAuth incomplete | None (if scoped) | Integrate later — Remediation Video pilot |
| Brisk Teaching | ⚠️ OAuth incomplete | None | Do not integrate — competitive research only |
| Eedi | ⚠️ OAuth incomplete | None (query-only) | Integrate later — Remediation Video pilot |
| MagicSchool AI | Not tested | N/A | Do not integrate |
| Canva | Not tested | Low (keep student names out) | Integrate now — marketing/templates |

## Immediate action item (not FOIPA-related, a functional blocker)
Coteach, Brisk Teaching, and Eedi all show "Connected" in Claude's connector settings but their tools don't actually load in-session. Learning Commons (the one authless connector) works fine. This strongly suggests the other three need a completed OAuth login step beyond just being "added" — worth confirming/re-authenticating each individually before relying on any of them for a build task.
