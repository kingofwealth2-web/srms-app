import { useState } from 'react'

export default function Btn({ children, variant = 'primary', size = 'md', onClick, style, disabled }) {
  const v = {
    primary:  { bg: 'var(--gold)',               color: 'var(--ink)',   hover: 'var(--gold2)' },
    secondary:{ bg: 'var(--ink4)',               color: 'var(--mist)',  hover: 'var(--ink5)', border: '1px solid var(--line)' },
    ghost:    { bg: 'transparent',               color: 'var(--mist2)', hover: 'var(--ink4)', border: '1px solid var(--line)' },
    danger:   { bg: 'rgba(240,107,122,0.1)',     color: 'var(--rose)',  hover: 'rgba(240,107,122,0.18)', border: '1px solid rgba(240,107,122,0.25)' },
  }[variant] || {}

  const p  = { sm: '5px 14px', md: '8px 20px', lg: '12px 28px' }[size]
  const fs = { sm: '12px',     md: '13px',      lg: '14px' }[size]
  const [hov, setHov] = useState(false)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: p, fontSize: fs, fontWeight: 600,
        borderRadius: 'var(--r-sm)',
        fontFamily: "'Cabinet Grotesk',sans-serif",
        background: hov ? v.hover : v.bg,
        color: v.color,
        border: v.border || 'none',
        transition: 'all 0.15s',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
