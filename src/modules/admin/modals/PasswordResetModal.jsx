import { useState } from 'react'
import { supabase } from '../../../supabase'
import Modal from '../../components/Modal'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

function genPw() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export default function PasswordResetModal({ userId, userName, onClose, showToast }) {
  const [temp, setTemp]     = useState(genPw())
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)

  const submit = async () => {
    setSaving(true)
    const { error } = await supabase.rpc('reset_user_password', { p_user_id: userId, p_new_password: temp })
    setSaving(false)
    if (error) { showToast('Failed to reset password: ' + error.message, 'error'); return }
    setDone(true)
    showToast('Password reset successfully')
  }

  return (
    <Modal title={'Reset Password — ' + (userName || '')} onClose={onClose} width={420}>
      {!done ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--mist2)', marginBottom: 14 }}>
            A temporary password will be set. The user will be required to change it on next login.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input readOnly value={temp} style={{
              flex: 1, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1,
              background: 'var(--ink3)', border: '1px solid var(--line2)', borderRadius: 10,
              padding: '9px 13px', color: 'var(--white)', fontSize: 14,
            }}/>
            <Btn variant='ghost' size='sm' onClick={() => setTemp(genPw())}>🔄 Regenerate</Btn>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
            <Btn onClick={submit} disabled={saving}>{saving ? <><Spinner/> Setting...</> : 'Set Password'}</Btn>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--emerald)', lineHeight: 1.6, marginBottom: 16 }}>
            Password set successfully.<br/>
            Share this temporary password with the user: <strong style={{ fontFamily: 'monospace' }}>{temp}</strong><br/>
            They'll be required to change it on next login.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={onClose}>Done</Btn>
          </div>
        </>
      )}
    </Modal>
  )
}
