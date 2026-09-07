export default function SectionTitle({ children, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, ...style }}>
      <div style={{
        width: 3, height: 14, borderRadius: 2,
        background: 'var(--gold)',
        flexShrink: 0,
      }}/>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--mist2)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        whiteSpace: 'nowrap', fontFamily: "'Clash Display',sans-serif",
      }}>{children}</span>
      <div style={{
        flex: 1, height: 1,
        background: 'var(--line)',
      }}/>
    </div>
  )
}
