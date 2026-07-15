'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { COLORS as C } from '@/lib/theme'

const LINKS = [
  { href: '/dashboard', label: 'Your Plans' },
  { href: '/steering', label: 'Steering Documents' },
]

export default function Header() {
  const pathname = usePathname()
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: `1px solid ${C.border}`,
      padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24, fontFamily: 'Georgia, serif',
    }}>
      <Link href="/dashboard" style={{ fontWeight: 700, color: C.navy, textDecoration: 'none', fontSize: 16 }}>
        chalk<span style={{ color: C.gold }}>&circuit</span> Lesson Planner
      </Link>
      <div style={{ display: 'flex', gap: 16 }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} style={{
            color: pathname === l.href ? C.gold : C.navy, textDecoration: 'none', fontSize: 13,
            fontWeight: pathname === l.href ? 700 : 400,
          }}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
