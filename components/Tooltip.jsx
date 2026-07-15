'use client'
import { useState } from 'react'

// NOTE: this codebase uses inline styles throughout (see components/Header.jsx,
// app/units/page.js, app/week/page.js, app/year-plan/page.js) -- Tailwind is
// NOT installed (no dependency, no config, no globals.css). Any future
// component must use inline styles or plain CSS, not Tailwind classNames,
// or it will render completely unstyled in production.

const POSITION_STYLES = {
  top: { bottom: '100%', marginBottom: 8 },
  bottom: { top: '100%', marginTop: 8 },
  left: { right: '100%', marginRight: 8 },
  right: { left: '100%', marginLeft: 8 },
}

export default function Tooltip({ children, text, position = 'top' }) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
        {children}
      </div>
      {visible && (
        <div
          style={{
            position: 'absolute',
            left: position === 'left' || position === 'right' ? undefined : '50%',
            transform: position === 'left' || position === 'right' ? undefined : 'translateX(-50%)',
            ...POSITION_STYLES[position],
            background: '#1a1a1a',
            color: '#fff',
            fontSize: 12,
            borderRadius: 4,
            padding: '6px 10px',
            whiteSpace: 'nowrap',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
