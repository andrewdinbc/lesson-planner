// app/api/assessment-settings/route.js
// Deliberately separate from /api/teacher-inventories -- that route's POST
// overwrites the full onboarding row (subjects, grades, inventory scores,
// etc.), so a lightweight "change my default assessment type(s)" save can't
// safely go through it without risking clobbering unrelated fields. This
// route only ever touches default_assessment_type(s).
//
// default_assessment_types (plural, jsonb array) is the source of truth as
// of the multi-select UI change -- teachers can now check more than one
// default assessment type instead of picking exactly one. default_assessment_type
// (singular, text) is kept in sync as the first selected type for any older
// code path that still reads the singular field, so nothing else breaks.
import { sbSelect, sbUpdate, sbInsert } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const rows = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=default_assessment_type,default_assessment_types,custom_assessment_types&limit=1`)
    const row = rows[0]
    // Back-compat: if only the old singular field was ever set, seed the
    // array from it so returning teachers see their prior choice checked.
    const types = row?.default_assessment_types?.length
      ? row.default_assessment_types
      : (row?.default_assessment_type ? [row.default_assessment_type] : ['quiz'])
    return Response.json({ default_assessment_types: types, custom_assessment_types: row?.custom_assessment_types || [] })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { default_assessment_types, custom_assessment_types } = await request.json()
    const patch = {}

    if (default_assessment_types !== undefined) {
      if (!Array.isArray(default_assessment_types) || default_assessment_types.length === 0) {
        return Response.json({ error: 'default_assessment_types must be a non-empty array' }, { status: 400 })
      }
      patch.default_assessment_types = default_assessment_types
      patch.default_assessment_type = default_assessment_types[0] // keep singular field in sync for back-compat
    }

    // custom_assessment_types: teacher-added assessment types beyond the
    // built-in list in lib/assessment-types.js (e.g. "Reading Conference",
    // "Running Record"). Stored as [{ key, label }], key auto-slugified
    // from the label so it merges cleanly with the built-in ASSESSMENT_TYPES
    // shape everywhere else in the app.
    if (custom_assessment_types !== undefined) {
      if (!Array.isArray(custom_assessment_types)) {
        return Response.json({ error: 'custom_assessment_types must be an array' }, { status: 400 })
      }
      patch.custom_assessment_types = custom_assessment_types
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const existing = await sbSelect('teacher_inventories', `?user_id=eq.${user.id}&select=id&limit=1`)
    if (existing.length) {
      await sbUpdate('teacher_inventories', `?user_id=eq.${user.id}`, patch)
    } else {
      // No onboarding row yet (teacher skipped the inventory) -- create a
      // minimal skipped row just to hold this preference.
      await sbInsert('teacher_inventories', [{ user_id: user.id, skipped: true, ...patch }])
    }
    return Response.json(patch)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
