'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BG = 'linear-gradient(135deg, #4a6fa5 0%, #7a5aa5 100%)'

export default function JoinLandingPage() {
  const [code, setCode] = useState('')
  const router = useRouter()

  function go() {
    if (code.trim().length < 4) return
    router.push(`/join/${code.trim().toUpperCase()}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', sans-serif", color: '#fff', textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 16 }}>Enter Game Code</h1>
        <input
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          placeholder="ABC123" maxLength={8} autoFocus
          style={{ fontSize: 24, padding: 14, borderRadius: 8, border: 'none', textAlign: 'center', width: 200, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}
        />
        <br />
        <button onClick={go} disabled={code.trim().length < 4} style={{ padding: '12px 32px', fontSize: 16, fontWeight: 700, borderRadius: 8, border: 'none', background: '#fff', color: '#4a6fa5', cursor: 'pointer' }}>
          Go
        </button>
      </div>
    </div>
  )
}
