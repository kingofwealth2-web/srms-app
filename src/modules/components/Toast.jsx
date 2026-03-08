export default function Toast({ msg, type = 'success', isMobile }) {
  const isError = type === 'error'
  const color   = isError ? 'var(--rose)' : 'var(--emerald)'
  const icon    = isError ? '✕' : '✓'

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? 20 : 28,
      right: isMobile ? 16 : 28,
      left: isMobile ? 16 : 'auto',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 18px 11px 14px',
      background: 'var(--ink3)',
      border: `1px solid ${color}30`,
      borderRadius: 12,
      boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${color}12`,
      animation: 'toastIn 0.3s cubic-bezier(.16,1,.3,1) both',
      maxWidth: isMobile ? '100%' : 340,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: `${color}18`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color, flexShrink: 0,
      }}>{icon}</div>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)', lineHeight: 1.4 }}>{msg}</span>
    </div>
  )
}