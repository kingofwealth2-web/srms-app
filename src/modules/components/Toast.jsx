export default function Toast({ msg, type = 'success', isMobile }) {
  const color = type === 'error' ? 'var(--rose)' : 'var(--emerald)'
  const pos   = isMobile
    ? { bottom: 20, left: 16, right: 16, transform: 'none' }
    : { bottom: 28, right: 28 }

  return (
    <div className='fi' style={{
      position: 'fixed', zIndex: 2000,
      background: 'var(--ink2)',
      border: `1px solid ${color}40`,
      borderRadius: 'var(--r)',
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      ...pos,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{msg}</span>
    </div>
  )
}
