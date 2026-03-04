import { useIsMobile } from '../lib/hooks'

export default function Modal({ title, subtitle, onClose, children, width = 520 }) {
  const isMobile = useIsMobile()

  if (isMobile) return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5,5,10,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        width: '100%', background: 'var(--ink2)',
        borderTop: '1px solid var(--line)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.3s cubic-bezier(.16,1,.3,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line2)' }}/>
        </div>
        <div style={{
          padding: '12px 20px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <h3 className='d' style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--mist2)', marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--ink4)', border: '1px solid var(--line)',
            color: 'var(--mist2)', width: 30, height: 30, borderRadius: '50%',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>×</button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  )

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5,5,10,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div className='fu' style={{
        width: '100%', maxWidth: width,
        background: 'var(--ink2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <h3 className='d' style={{ fontSize: 17, fontWeight: 600 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--mist2)', marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose}
            style={{
              background: 'var(--ink4)', border: '1px solid var(--line)',
              color: 'var(--mist2)', width: 30, height: 30, borderRadius: '50%',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink5)'; e.currentTarget.style.color = 'var(--white)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink4)'; e.currentTarget.style.color = 'var(--mist2)' }}
          >×</button>
        </div>
        <div style={{ padding: '24px 28px' }}>{children}</div>
      </div>
    </div>
  )
}
