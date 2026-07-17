// app/api/mini-games/[id]/route.js
// Deliberately NO auth check -- students scan a QR code and land here
// with no login. Read-only, and only game content (questions/word),
// never anything tied to the teacher's account beyond what's needed to
// render the game.
import { sbSelect, sbUpdate } from '@/lib/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const [game] = await sbSelect('mini_games', `?id=eq.${id}&select=id,game_type,subject,topic,grade,game_data,play_count&limit=1`)
    if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })

    // best-effort play counter, not critical if it races
    sbUpdate('mini_games', `?id=eq.${id}`, { play_count: (game.play_count || 0) + 1 }).catch(() => {})

    return Response.json({ game })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
