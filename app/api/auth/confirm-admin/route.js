import { createClient } from '@supabase/supabase-js'

// One-off admin utility: confirm a user's email directly via the service
// role key, bypassing the "check your email" step. Not meant to be a
// permanent public route -- gated by a hardcoded check against Aj's own
// admin email so this can't be used to confirm arbitrary accounts.
export async function POST(request) {
  try {
    const { email } = await request.json()
    if (email !== 'andrewsinbc3@gmail.com') {
      return Response.json({ error: 'Not authorized for this email' }, { status: 403 })
    }

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError
    const user = users.users.find((u) => u.email === email)
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true })
    if (updateError) throw updateError

    return Response.json({ confirmed: true, userId: user.id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
