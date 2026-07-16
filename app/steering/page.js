'use client'
import { COLORS as C, FONT_BODY } from '@/lib/theme'

// Steering documents are now managed exclusively from Hyperion Command
// Centre, not here -- this page used to have its own upload/paste/web
// forms, but Hyperion's /educational-ai-steering page proxies to the
// exact same backend (this app's own steering_documents table and
// /api/steering-documents routes -- see app/api/steering-documents/route.js
// and morpheus-scheduler's app/api/educational-steering/route.js), so
// having two separate front doors to the same data was just confusing.
// The API routes themselves are untouched -- Hyperion still depends on
// them as its actual storage layer.
export default function SteeringPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT_BODY, padding: 32 }}>
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🧭</div>
        <h1 style={{ color: C.navy, fontSize: 24, marginBottom: 12 }}>Steering documents moved</h1>
        <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Steering documents are now managed from Hyperion Command Centre, not here. This page's upload
          tools have been retired -- everything you add in Hyperion still feeds the same generation
          system teachers' plans are grounded in.
        </p>
        <a
          href="https://morpheus-scheduler.vercel.app/educational-ai-steering"
          style={{
            display: 'inline-block', padding: '10px 24px', background: C.gold, color: '#fff',
            borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}
        >
          Open Hyperion Steering Library →
        </a>
      </div>
    </div>
  )
}
