import { useEffect, useRef } from 'react'
import { useIsMobile } from '../lib/hooks'

export default function Modal({ title, subtitle, onClose, children, width = 520 }) {
  const isMobile = useIsMobile()
  const onCloseRef = useRef(onClose)
  const backdropRef = useRef(null)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (backdropRef.current) backdropRef.current.scrollTop = 0
    const onKey = e => { if (e.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [])

  // The backdrop is the scroll container — modal content never gets clipped
  const backdropStyle = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(8,8,18,0.72)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    animation: 'fadeIn 0.2s ease both',
  }

  if (isMobile) return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      ref={backdropRef} style={{ ...backdropStyle, padding: '5vh 12px 24px' }}
    >
      <div style={{
        width: '100%',
        background: 'var(--ink2)',
        borderRadius: 16,
        border: '1px solid var(--line2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.2s ease both',
        flexShrink: 0,
      }}>
        {title && (
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h3 className='d' style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h3>
              {subtitle && <p style={{ fontSize: 12, color: 'var(--mist2)', marginTop: 3 }}>{subtitle}</p>}
            </div>
            <CloseBtn onClick={onClose}/>
          </div>
        )}
        <div style={{ padding: '20px 20px 28px' }}>{children}</div>
      </div>
    </div>
  )

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      ref={backdropRef} style={{ ...backdropStyle, padding: '5vh 20px 24px' }}
    >
      <div className='si' style={{
        width: '100%', maxWidth: width,
        background: 'var(--ink2)',
        border: '1px solid var(--line2)',
        borderRadius: 20,
        flexShrink: 0,
        boxShadow: 'var(--shadow-lg, 0 32px 80px rgba(0,0,0,0.7))',
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