'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setNotice(''); setLoading(true)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.needsConfirmation) {
        setNotice('Check your email to confirm your account, then log in.')
        setMode('login')
      } else {
        router.push('/dashboard')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 32, width: 380 }}>
        <h1 style={{ color: C.navy, fontSize: 24, marginBottom: 20 }}>Lesson Planner</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button type="button" onClick={() => setMode('login')}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, background: mode === 'login' ? C.navy : '#fff', color: mode === 'login' ? '#fff' : C.navy, cursor: 'pointer' }}>
            Log In
          </button>
          <button type="button" onClick={() => setMode('signup')}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, background: mode === 'signup' ? C.navy : '#fff', color: mode === 'signup' ? '#fff' : C.navy, cursor: 'pointer' }}>
            Sign Up
          </button>
        </div>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
          style={{ width: '100%', padding: 10, marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        {error && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {notice && <div style={{ color: C.green, fontSize: 13, marginBottom: 12 }}>{notice}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
}
