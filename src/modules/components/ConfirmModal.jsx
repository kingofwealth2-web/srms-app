import { useState } from 'react'
import Btn from './Btn'
import Modal from './Modal'

export default function ConfirmModal({ title, body, icon, danger = false, confirmLabel, onConfirm, onClose, onCancel }) {
  const [busy, setBusy] = useState(false)
  const handleClose = onClose || onCancel || (() => {})
  const handleConfirm = async () => {
    if (busy) return
    setBusy(true)
    try { await onConfirm(); handleClose() }
    finally { setBusy(false) }
  }
  return (
    <Modal title={title} onClose={handleClose} width={400}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div aria-hidden='true' style={{
            width: 42, height: 42, borderRadius: 12,
            background: danger ? 'rgba(240,107,122,0.1)' : 'var(--ink4)',
            border: `1px solid ${danger ? 'rgba(240,107,122,0.2)' : 'var(--line)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: danger ? 'var(--rose)' : 'var(--gold)', flexShrink: 0,
          }}><ConfirmIcon danger={danger}/></div>
        {body && <div style={{ flex: 1, fontSize: 13, color: 'var(--mist2)', lineHeight: 1.6 }}>{body}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant='ghost' onClick={handleClose} disabled={busy}>Cancel</Btn>
        <Btn onClick={handleConfirm} disabled={busy}
          style={danger ? { background: 'var(--rose)', color: '#fff', border: 'none' } : {}}>
          {busy ? 'Working…' : (confirmLabel || (danger ? 'Delete' : 'Confirm'))}
        </Btn>
      </div>
    </Modal>
  )
}

function ConfirmIcon({ danger }) {
  return danger
    ? <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M12 3.5 21 20H3z'/><path d='M12 9v5M12 17.3v.2'/></svg>
    : <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='9'/><path d='M12 10v6M12 7.2v.2'/></svg>
}
