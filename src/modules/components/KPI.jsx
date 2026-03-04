export default function KPI({ label, value, color, sub, index = 0 }) {
  return (
    <div
      className={`fu fu${index + 1}`}
      style={{
        background: 'var(--ink2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r)', padding: 22,
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s,box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 0 24px ${color}18`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle at top right,${color}14,transparent 70%)`,
        pointerEvents: 'none',
      }}/>
      <div className='d' style={{
        fontSize: 11, fontWeight: 600, color: 'var(--mist3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14,
      }}>{label}</div>
      <div className='d' style={{
        fontSize: 32, fontWeight: 700, color,
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 8 }}>{sub}</div>}
    </div>
  )
}
