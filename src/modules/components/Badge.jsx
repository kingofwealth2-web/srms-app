export default function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      color: color || 'var(--mist2)',
      background: bg || 'var(--ink4)',
    }}>
      {children}
    </span>
  )
}
