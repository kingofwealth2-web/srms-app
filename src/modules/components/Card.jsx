export default function Card({ children, style, hover = false, onClick }) {
  const base = {
    background: 'var(--ink2)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-lg)',
    padding: 24,
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
        e.currentTarget.style.boxShadow   = '0 8px 32px rgba(0,0,0,0.35)'
        if (onClick) e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.boxShadow   = 'none'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {children}
    </div>
  )
}