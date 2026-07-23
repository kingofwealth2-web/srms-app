import LogoMark from './LogoMark'

// `height` lets this sit inside the page area (sidebar and topbar still
// visible) rather than covering the viewport, for refetches of an already-open
// workspace.
export default function LoadingScreen({ msg = 'Loading...', height = '100vh' }) {
  return (
    <div style={{
      height, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, background: 'var(--ink)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: 'linear-gradient(135deg, var(--gold3), var(--gold2))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 40px rgba(232,184,75,0.3), 0 8px 24px rgba(0,0,0,0.4)',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        <LogoMark size={26}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 13, color: 'var(--mist2)', fontWeight: 500 }}>{msg}</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--mist3)',
              animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  )
}