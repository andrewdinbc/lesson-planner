// app/api/draw-sessions/route.js
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentUser } from '@/lib/session'
import { sbInsert } from '@/lib/supabase'
import { generateJoinCode } from '@/lib/live-game'
import { generateWordList } from '@/lib/draw-game'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { subject, topic, grade } = await request.json()

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const words = await generateWordList(anthropic, { subject, topic, grade, count: 8 })
    if (!words.length) return Response.json({ error: 'Could not generate a word list for this topic' }, { status: 500 })

    let session = null
    for (let attempt = 0; attempt < 4 && !session; attempt++) {
      try {
        const [inserted] = await sbInsert('draw_sessions', [{
          user_id: user.id, join_code: generateJoinCode(), status: 'lobby',
          subject: subject || null, topic: topic || null, words, total_rounds: Math.min(6, words.length),
        }])
        session = inserted
      } catch (e) {
        if (attempt === 3) throw e
      }
    }

    return Response.json({ session })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
