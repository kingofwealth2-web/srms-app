export default function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span className='d' style={{
        fontSize: 10, fontWeight: 600, color: 'var(--mist3)',
        textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap',
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
    </div>
  )
}
