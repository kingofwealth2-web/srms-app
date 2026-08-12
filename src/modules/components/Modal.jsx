import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '../lib/hooks'

export default function Modal({ title, subtitle, onClose, children, width = 520 }) {
  const isMobile = useIsMobile()
  const onCloseRef = useRef(onClose)
  const dialogRef = useRef(null)
  const titleId = useId()
  const subtitleId = useId()
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

    document.body.style.overflow = 'hidden'
    dialog?.querySelector(focusableSelector)?.focus()

    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll(focusableSelector)]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [])

  const backdropStyle = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(8,8,18,0.72)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    padding: isMobile ? 12 : 20,
    animation: 'fadeIn 0.2s ease both',
  }

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={backdropStyle}
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={subtitle ? subtitleId : undefined}
        className='si'
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : width,
          maxHeight: isMobile ? 'calc(100dvh - 24px)' : 'calc(100dvh - 40px)',
          background: 'var(--ink2)',
          border: '1px solid var(--line2)',
          borderRadius: isMobile ? 16 : 20,
          boxShadow: isMobile ? '0 8px 40px rgba(0,0,0,0.5)' : 'var(--shadow-lg, 0 32px 80px rgba(0,0,0,0.7))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {title && (
          <div style={{
            padding: isMobile ? '18px 20px 14px' : '22px 26px 18px',
            borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
            flexShrink: 0,
          }}>
            <div style={{ minWidth: 0 }}>
              <h3 id={titleId} className='d' style={{ fontSize: isMobile ? 16 : 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--white)' }}>{title}</h3>
              {subtitle && <p id={subtitleId} style={{ fontSize: 12, color: 'var(--mist2)', marginTop: isMobile ? 3 : 4, lineHeight: 1.5 }}>{subtitle}</p>}
            </div>
            <CloseBtn onClick={onClose}/>
          </div>
        )}
        <div style={{
          padding: isMobile ? '20px 20px 28px' : '22px 26px 26px',
          overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0,
        }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label='Close dialog' style={{
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
