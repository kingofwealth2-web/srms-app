import Btn from './Btn'
import Modal from './Modal'

export default function ConfirmModal({ title, body, icon, danger = false, confirmLabel, onConfirm, onClose, onCancel }) {
  const handleClose = onClose || onCancel || (() => {})
  const handleConfirm = async () => { await onConfirm(); handleClose() }
  return (
    <Modal title={title} onClose={handleClose} width={400}>
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
        {body && <div style={{ flex: 1, fontSize: 13, color: 'var(--mist2)', lineHeight: 1.6 }}>{body}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant='ghost' onClick={handleClose}>Cancel</Btn>
        <Btn onClick={handleConfirm}
          style={danger ? { background: 'var(--rose)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(240,107,122,0.3)' } : {}}>
          {confirmLabel || (danger ? 'Delete' : 'Confirm')}
        </Btn>
      </div>
    </Modal>
  )
}
