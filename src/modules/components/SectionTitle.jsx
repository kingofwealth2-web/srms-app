export default function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--mist3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        whiteSpace: 'nowrap', fontFamily: "'Clash Display',sans-serif",
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
    </div>
  )
}