export default function Card({ children, style, hover = false, onClick }) {
  // In dark mode: inner top highlight creates depth.
  // In light mode: drop shadow creates separation from warm page bg.
  // We use a CSS var trick — set both and let the theme pick.
  const base = {
    background: 'var(--ink2)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-lg)',
    padding: 24,
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.055)',  // dark mode: top highlight
      '0 2px 8px rgba(0,0,0,0.14)',              // both: subtle lift
    ].join(', '),
    transition: 'border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast)',
    ...style,
  }
  if (!hover && !onClick) return <div style={base}>{children}</div>
  return (
    <div
      style={{ ...base, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--line2)'
        e.currentTarget.style.boxShadow = [
          'inset 0 1px 0 rgba(255,255,255,0.07)',
          '0 8px 32px rgba(0,0,0,0.22)',
        ].join(', ')
        if (onClick) e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.boxShadow = [
          'inset 0 1px 0 rgba(255,255,255,0.055)',
          '0 2px 8px rgba(0,0,0,0.14)',
        ].join(', ')
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {children}
    </div>
  )
}