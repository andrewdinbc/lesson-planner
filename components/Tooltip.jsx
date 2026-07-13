'use client'
import { useState } from 'react'

const C = { navy: '#1c3557' }

export default function Tooltip({ text, children, width = 220 }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 8, width, padding: '8px 10px', background: C.navy, color: '#fff',
          borderRadius: 6, fontSize: 12, lineHeight: 1.4,
          zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', pointerEvents: 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid', borderColor: `${C.navy} transparent transparent transparent`,
          }} />
        </span>
      )}
    </span>
  )
}
