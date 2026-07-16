import { createClient } from '@supabase/supabase-js'

// One-off admin utility: force-set the password for Aj's own pre-existing
// admin account (id already hardcoded elsewhere in this codebase as
// ADMIN_USER_ID) via the service role key. Gated to that one email only.
export async function POST(request) {
  try {
    const { email, newPassword } = await request.json()
    if (email !== 'andrewsinbc3@gmail.com') {
      return Response.json({ error: 'Not authorized for this email' }, { status: 403 })
    }
    if (!newPassword || newPassword.length < 8) {
      return Response.json({ error: 'newPassword must be at least 8 characters' }, { status: 400 })
    }

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError
    const user = users.users.find((u) => u.email === email)
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    })
    if (updateError) throw updateError

    return Response.json({ passwordReset: true, userId: user.id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
