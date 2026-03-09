export default function Toast({ msg, type = 'success', isMobile }) {
  const isError   = type === 'error'
  const isWarning = type === 'warning'
  const color = isError ? 'var(--rose)' : isWarning ? 'var(--amber)' : 'var(--emerald)'
  const icon  = isError ? '✕' : isWarning ? '!' : '✓'

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? 20 : 28,
      right: isMobile ? 16 : 28,
      left: isMobile ? 16 : 'auto',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 20px 11px 0',
      background: 'var(--ink3)',
      border: `1px solid ${color}28`,
      borderRadius: 12,
      borderLeft: `3px solid ${color}`,
      boxShadow: `0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px ${color}10`,
      animation: 'toastIn 0.3s cubic-bezier(.16,1,.3,1) both',
      maxWidth: isMobile ? '100%' : 360,
      overflow: 'hidden',
    }}>
      {/* Left icon zone */}
      <div style={{
        width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: `${color}18`,
          border: `1px solid ${color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color, flexShrink: 0,
        }}>{icon}</div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)', lineHeight: 1.4 }}>{msg}</span>
    </div>
  )
}