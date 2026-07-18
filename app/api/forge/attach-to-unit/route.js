// app/api/forge/attach-to-unit/route.js
// Closes the loop: AI-generated original content (or any Forge resource)
// gets attached to a specific unit_priorities row's `resources` array, the
// same way an upload from the Resources page would be -- so it actually
// shows up on the Resources page, feeds into the printable Content |
// Resources | Assessment planner, and stays synced (editing it in Forge
// still updates the copy attached here, via the existing save_edit sync).
// Without this step, generated content stayed stranded in Forge with no
// path back into an actual unit. Aj, 2026-07-18.
import { getCurrentUser } from '@/lib/session'
import { sbSelect, sbUpdate } from '@/lib/supabase'

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { forgeResourceId, subject, unitName } = await request.json()
    if (!forgeResourceId || !subject || !unitName) {
      return Response.json({ error: 'forgeResourceId, subject, and unitName are required' }, { status: 400 })
    }

    const [forgeRes] = await sbSelect('forge_resources', `?id=eq.${forgeResourceId}&user_id=eq.${user.id}&select=*`)
    if (!forgeRes) return Response.json({ error: 'Forge resource not found' }, { status: 404 })

    const [unit] = await sbSelect('unit_priorities', `?user_id=eq.${user.id}&subject=eq.${encodeURIComponent(subject)}&unit_name=eq.${encodeURIComponent(unitName)}&select=id,resources`)
    if (!unit) return Response.json({ error: 'Unit not found -- add it to Unit Priorities first' }, { status: 404 })

    const newEntry = {
      type: forgeRes.origin === 'ai_generated_original' ? 'ai_generated' : 'teacher_upload',
      label: forgeRes.title,
      detail: (forgeRes.edited_text || forgeRes.original_text || '').slice(0, 500),
      forge_resource_id: forgeRes.id,
      attached_at: new Date().toISOString(),
    }

    const existingResources = unit.resources || []
    const alreadyAttached = existingResources.some((r) => r.forge_resource_id === forgeRes.id)
    const updatedResources = alreadyAttached
      ? existingResources.map((r) => (r.forge_resource_id === forgeRes.id ? newEntry : r))
      : [...existingResources, newEntry]

    await sbUpdate('unit_priorities', `?id=eq.${unit.id}`, { resources: updatedResources, updated_at: new Date().toISOString() })

    const attachedUnits = forgeRes.attached_units || []
    const alreadyTracked = attachedUnits.some((a) => a.subject === subject && a.unit_name === unitName)
    if (!alreadyTracked) {
      await sbUpdate('forge_resources', `?id=eq.${forgeResourceId}&user_id=eq.${user.id}`, {
        attached_units: [...attachedUnits, { subject, unit_name: unitName }],
      })
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
