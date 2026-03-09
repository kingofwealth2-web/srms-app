import Btn from './Btn'

export default function ConfirmModal({ title, body, icon, danger = false, confirmLabel, onConfirm, onClose }) {
  const handleConfirm = async () => { await onConfirm(); onClose() }
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,8,18,0.85)', backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.15s ease',
      padding: 20,
    }}>
      <div className='si' style={{
        background: 'var(--ink2)',
        border: `1px solid ${danger ? 'rgba(240,107,122,0.25)' : 'var(--line2)'}`,
        borderRadius: 18, padding: '26px 26px 22px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          {icon && (
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: danger ? 'rgba(240,107,122,0.1)' : 'var(--ink4)',
              border: `1px solid ${danger ? 'rgba(240,107,122,0.2)' : 'var(--line)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>{icon}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--white)', marginBottom: body ? 6 : 0, letterSpacing: '-0.01em' }}>{title}</div>
            {body && <div style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.6 }}>{body}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant='ghost' onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleConfirm}
            style={danger ? { background: 'var(--rose)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(240,107,122,0.3)' } : {}}>
            {confirmLabel || (danger ? 'Delete' : 'Confirm')}
          </Btn>
        </div>
      </div>
    </div>
  )
}