// app/api/game-sessions/route.js
import { getCurrentUser } from '@/lib/session'
import { createLiveQuizSession } from '@/lib/game-factory'

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { subject, topic, grade, isDuel } = await request.json()
    const { session } = await createLiveQuizSession({ subject, topic, grade, isDuel, userId: user.id, sourceApp: 'lesson-planner' })
    return Response.json({ session })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
