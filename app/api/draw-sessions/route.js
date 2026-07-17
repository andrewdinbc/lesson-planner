// app/api/draw-sessions/route.js
import { getCurrentUser } from '@/lib/session'
import { createDrawSession } from '@/lib/game-factory'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { subject, topic, grade } = await request.json()
    const { session } = await createDrawSession({ subject, topic, grade, userId: user.id, sourceApp: 'lesson-planner' })
    return Response.json({ session })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
