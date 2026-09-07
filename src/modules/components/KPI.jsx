export default function KPI({ label, value, color, sub, index = 0 }) {
  return (
    <div
      className={`daybook-kpi fu fu${Math.min(index + 1, 8)}`}
      style={{
        background: 'var(--ink2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: '22px 24px 20px',
        position: 'relative', overflow: 'hidden',
        '--kpi-color': color,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}/>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--mist3)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: "'Clash Display',sans-serif",
        }}>{label}</span>
      </div>

      <div className='d' style={{
        fontSize: 34, fontWeight: 700, color,
        letterSpacing: '-0.03em', lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>

      {sub && (
        <div style={{
          fontSize: 11.5, color: 'var(--mist3)', marginTop: 12,
          borderTop: '1px solid var(--line)', paddingTop: 10,
        }}>{sub}</div>
      )}
    </div>
  )
}
