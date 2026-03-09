import { useEffect } from 'react'
import { useIsMobile } from '../lib/hooks'

export default function Modal({ title, subtitle, onClose, children, width = 520 }) {
  const isMobile = useIsMobile()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [])

  const backdrop = {
    position: 'fixed', inset: 0,
    background: 'rgba(8,8,18,0.82)',
    backdropFilter: 'blur(12px)',
    display: 'flex', justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease both',
  }

  if (isMobile) return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ ...backdrop, alignItems: 'flex-end', padding: 0 }}>
      <div style={{
        width: '100%', background: 'var(--ink2)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--line2)',
        borderBottom: 'none',
        maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 -16px 60px rgba(0,0,0,0.7)',
        animation: 'slideUp 0.32s cubic-bezier(.16,1,.3,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line3)' }}/>
        </div>
        {title && (
          <div style={{ padding: '8px 20px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h3 className='d' style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h3>
              {subtitle && <p style={{ fontSize: 12, color: 'var(--mist2)', marginTop: 3 }}>{subtitle}</p>}
            </div>
            <CloseBtn onClick={onClose}/>
          </div>
        )}
        <div style={{ padding: '20px 20px 32px' }}>{children}</div>
      </div>
    </div>
  )

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ ...backdrop, alignItems: 'center', padding: 20 }}>
      <div className='si' style={{
        width: '100%', maxWidth: width,
        background: 'var(--ink2)',
        border: '1px solid var(--line2)',
        borderRadius: 20,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}>
        {title && (
          <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h3 className='d' style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--white)' }}>{title}</h3>
              {subtitle && <p style={{ fontSize: 12, color: 'var(--mist2)', marginTop: 4, lineHeight: 1.5 }}>{subtitle}</p>}
            </div>
            <CloseBtn onClick={onClose}/>
          </div>
        )}
        <div style={{ padding: '22px 26px 26px' }}>{children}</div>
      </div>
    </div>
  )
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'var(--ink4)', border: '1px solid var(--line)',
      color: 'var(--mist2)', fontSize: 18,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0,
      transition: 'background var(--t-fast), color var(--t-fast)',
      lineHeight: 1,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink5)'; e.currentTarget.style.color = 'var(--white)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink4)'; e.currentTarget.style.color = 'var(--mist2)' }}
    >×</button>
  )
}