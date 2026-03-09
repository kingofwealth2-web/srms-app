export default function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em',
      fontFamily: "'Cabinet Grotesk',sans-serif",
      color: color || 'var(--mist2)',
      background: bg || (color ? `${color}14` : 'var(--ink4)'),
      border: `1px solid ${color ? color + '2a' : 'var(--line)'}`,
      lineHeight: 1.65,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}