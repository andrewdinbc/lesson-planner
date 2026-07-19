// app/api/unit-priorities/route.js
import { sbSelect, sbInsert, sbUpdate } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'
import { defaultRowsForSubjects, checkMismatch } from '@/lib/unit-priorities'

// GET: fetch this teacher's unit priorities, seeding defaults on first load
// if they have subjects selected (from teacher_inventories) but no rows yet.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    let rows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc,sort_order.asc`)

    if (!rows.length) {
      const [inv] = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=subjects&limit=1`)
      const subjects = inv?.subjects || []
      if (subjects.length) {
        const defaults = defaultRowsForSubjects(subjects).map((r) => ({ user_id: user.id, ...r }))
        rows = await sbInsert('unit_priorities', defaults)
      }
    }

    return Response.json({ units: rows })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// POST: update one or more unit rows (priority slider changes, removal
// toggles, high_scrutiny opt-in for non-LA/Math subjects), and optionally
// run the mismatch check against total instructional weeks.
//
// la_category: legacy single-strand override, kept for back-compat.
// la_categories: current cross-strand override (jsonb array of
// reading/writing/oral) -- lets a unit legitimately appear under more than
// one Language Arts section (Aj's "cross Language Arts tasks" request,
// e.g. a Novel Study touching Reading, Writing, and Oral all at once).
// Falls back to the heuristic in lib/language-arts-categories.js when unset.
//
// saved_for_later: whether the end-of-unit assessment reminder should show
// as deferred ("saved for later", the default) vs. actionable right now.
// Defaults to true so the reminder doesn't nag by default -- teachers
// uncheck it when they actually want to act on a specific unit's reminder.
//
// year_rotation: for split (A/B year rotation) classes -- 'A', 'B', or null
// (null = taught every year). Half the year's content is covered on each
// rotation year so students never repeat what they already had.
export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await request.json()

    if (Array.isArray(body.updates)) {
      for (const u of body.updates) {
        const patch = {
          priority: u.priority,
          high_scrutiny: u.high_scrutiny,
          removed: u.removed,
          sort_order: u.sort_order,
          assessment_type: u.assessment_type,
          la_category: u.la_category ?? null,
          la_categories: u.la_categories ?? null,
          saved_for_later: u.saved_for_later ?? true,
          year_rotation: u.year_rotation ?? null,
          updated_at: new Date().toISOString(),
        }
        if (u.resources !== undefined) patch.resources = u.resources
        await sbUpdate('unit_priorities', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(u.subject)}&unit_name=eq.${encodeURIComponent(u.unit_name)}`, patch)
      }
    }

    // Quick-add a unit from a Language Arts Elaboration idea (e.g. "Novel
    // Study" -> Reading Writing) -- inserts a new row pre-tagged with the
    // strands that elaboration covers, at equal priority to start.
    // - Plain "Add as a Unit Frame": content_summary/curricular_competency
    //   stay empty -- an intentional placeholder to fill in later.
    // - After "AI build me this unit" / "AI: creative way to cover this",
    //   the client has already generated content_summary and
    //   curricular_competency and passes them along here to save in the
    //   same insert, plus source_elaboration_key linking back to the idea
    //   this unit was built from (so the teacher can always trace what
    //   content it's supposed to cover).
    if (body.addUnit) {
      const { subject, unit_name, la_categories, content_summary, curricular_competency, source_elaboration_key } = body.addUnit
      if (subject && unit_name) {
        // Durable de-dup guard, added 2026-07-19: this insert previously had
        // no protection against the same elaboration being added twice --
        // e.g. a fast double-click firing two requests before the client's
        // state-driven `disabled` re-render could catch up (React state
        // updates aren't synchronous, so there's a real window where two
        // click events can both reach here before the first response comes
        // back and the UI reflects "already added"). Result: two identical
        // rows, both showing as "added"/line-through, i.e. a duplicated
        // task. Checking for an existing row with the same
        // source_elaboration_key here closes the gap server-side, which is
        // the only place it can be closed reliably -- no client-side fix
        // alone can fully rule out the race.
        if (source_elaboration_key) {
          const existing = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(subject)}&source_elaboration_key=eq.${encodeURIComponent(source_elaboration_key)}&select=id&limit=1`)
          if (existing.length > 0) {
            const rows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc,sort_order.asc`)
            return Response.json({ units: rows, mismatch: null })
          }
        }
        const existingForSubject = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(subject)}&select=sort_order&order=sort_order.desc&limit=1`)
        const nextSortOrder = (existingForSubject[0]?.sort_order ?? -1) + 1
        await sbInsert('unit_priorities', [{
          user_id: user.id, subject, unit_name, priority: 1, sort_order: nextSortOrder,
          la_categories: la_categories || null,
          content_summary: content_summary || null,
          curricular_competency: curricular_competency || null,
          source_elaboration_key: source_elaboration_key || null,
        }])
      }
    }

    const rows = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&select=*&order=subject.asc,sort_order.asc`)

    let mismatch = null
    if (body.totalInstructionalWeeksAvailable) {
      mismatch = checkMismatch(rows, body.totalInstructionalWeeksAvailable)
    }

    return Response.json({ units: rows, mismatch })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
