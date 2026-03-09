export default function Btn({ children, variant = 'primary', size = 'md', onClick, style, disabled, title }) {
  const styles = {
    primary: {
      background: 'var(--gold)',
      color: '#0c0c15',
      fontWeight: 700,
      border: 'none',
      shadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 12px rgba(232,184,75,0.22)',
      hoverBg: 'var(--gold2)',
      hoverShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 20px rgba(232,184,75,0.32)',
    },
    secondary: {
      background: 'var(--ink4)',
      color: 'var(--mist)',
      fontWeight: 500,
      border: '1px solid var(--line2)',
      shadow: 'none',
      hoverBg: 'var(--ink5)',
      hoverShadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--mist2)',
      fontWeight: 500,
      border: '1px solid var(--line2)',
      shadow: 'none',
      hoverBg: 'var(--ink4)',
      hoverShadow: 'none',
    },
    danger: {
      background: 'rgba(212,79,94,0.08)',
      color: 'var(--rose)',
      fontWeight: 600,
      border: '1px solid rgba(212,79,94,0.22)',
      shadow: 'none',
      hoverBg: 'rgba(212,79,94,0.14)',
      hoverShadow: 'none',
    },
  }[variant] || {}

  const pad  = { sm: '5px 13px',  md: '8px 18px',  lg: '11px 26px' }[size]
  const fs   = { sm: '12px',      md: '13px',       lg: '14px'      }[size]
  const rad  = { sm: '8px',       md: '10px',       lg: '12px'      }[size]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: pad, fontSize: fs, fontWeight: styles.fontWeight,
        borderRadius: rad, letterSpacing: '-0.01em',
        fontFamily: "'Cabinet Grotesk',sans-serif",
        background: styles.background,
        color: styles.color,
        border: styles.border || 'none',
        boxShadow: styles.shadow,
        transition: 'background var(--t-fast), box-shadow var(--t-fast), opacity var(--t-fast), transform var(--t-snap)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: 'translateY(0)',
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background  = styles.hoverBg
        e.currentTarget.style.boxShadow   = styles.hoverShadow
        e.currentTarget.style.transform   = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = styles.background
        e.currentTarget.style.boxShadow   = styles.shadow
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(0) scale(0.98)' }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)' }}
    >
      {children}
    </button>
  )
}