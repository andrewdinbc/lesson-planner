import { signIn } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) return Response.json({ error: 'email and password required' }, { status: 400 })
    const data = await signIn(email, password)
    const res = Response.json({ user: data.user })
    res.headers.set(
      'Set-Cookie',
      `lp_session=${data.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure`
    )
    return res
  } catch (e) {
    return Response.json({ error: e.message }, { status: 401 })
  }
}
