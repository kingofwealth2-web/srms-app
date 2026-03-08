export default function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
      color: color || 'var(--mist2)',
      background: bg || `${color}14` || 'var(--ink4)',
      border: `1px solid ${color ? color + '28' : 'var(--line)'}`,
      lineHeight: 1.6,
    }}>
      {children}
    </span>
  )
}