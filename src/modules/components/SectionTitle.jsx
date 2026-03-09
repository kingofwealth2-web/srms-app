export default function SectionTitle({ children, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, ...style }}>
      {/* Gold accent bar */}
      <div style={{
        width: 3, height: 14, borderRadius: 2,
        background: 'linear-gradient(180deg, var(--gold2), var(--gold3))',
        flexShrink: 0,
        boxShadow: '0 0 6px rgba(232,184,75,0.35)',
      }}/>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--mist2)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        whiteSpace: 'nowrap', fontFamily: "'Clash Display',sans-serif",
      }}>{children}</span>
      {/* Fading divider */}
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, var(--line2) 0%, var(--line) 40%, transparent 100%)',
      }}/>
    </div>
  )
}