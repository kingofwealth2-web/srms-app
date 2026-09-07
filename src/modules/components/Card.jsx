export default function Card({ children, style, hover = false, onClick }) {
  const base = {
    background: 'var(--ink2)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-lg)',
    padding: 24,
    boxShadow: 'none',
    transition: 'border-color var(--t-fast), background var(--t-fast)',
    ...style,
  }
  if (!hover && !onClick) return <div className='card-surface' style={base}>{children}</div>
  return (
    <div
      className='card-surface is-interactive'
      style={{ ...base, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--line2)'
        e.currentTarget.style.background = 'var(--ink3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.background = 'var(--ink2)'
      }}
    >
      {children}
    </div>
  )
}
