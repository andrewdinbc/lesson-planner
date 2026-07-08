// lib/session.js — reads the httpOnly auth cookie set by app/api/auth/login
// and app/api/auth/signup, resolves it to a real Supabase user server-side.
import { cookies } from 'next/headers'
import { getUserFromToken } from './supabase'

export async function getCurrentUser() {
  const token = cookies().get('lp_session')?.value
  if (!token) return null
  return getUserFromToken(token)
}
