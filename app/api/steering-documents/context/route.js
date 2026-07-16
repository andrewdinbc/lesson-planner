import { buildSteeringContext } from '@/lib/steering-context'

export const runtime = 'nodejs'
export const maxDuration = 60

// Cross-app endpoint: lets ANY Chalk & Circuit product (Math Mastery,
// Assessment Tool, Student Portfolio, etc.) inject Aj's steering
// documents into its own AI generation calls -- not just Lesson
// Planner's own /api/generate. Same shared secret already used for the
// Hyperion admin proxy (STEERING_SYNC_SECRET), reused here for a second
// purpose: read access for generation, not just admin write access.
//
// Usage from another product's server-side generation route:
//   const res = await fetch('https://lesson-planner-liart.vercel.app/api/steering-documents/context', {
//     headers: { 'x-steering-sync-secret': process.env.STEERING_SYNC_SECRET }
//   })
//   const { context } = await res.json()
//   // append `context` into your own generation prompt template
export async function GET(request) {
  const syncSecret = request.headers.get('x-steering-sync-secret')
  if (!syncSecret || !process.env.STEERING_SYNC_SECRET || syncSecret !== process.env.STEERING_SYNC_SECRET) {
    return Response.json({ error: 'Not authorized' }, { status: 401 })
  }

  try {
    const context = await buildSteeringContext()
    return Response.json({ context })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
