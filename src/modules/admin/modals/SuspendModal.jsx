import { useState } from 'react'
import { supabase } from '../../../supabase'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

const REASON_OPTIONS = [
  { value: 'non_payment',     label: 'Non-payment' },
  { value: 'voluntary_pause', label: 'Voluntary pause (e.g. school closed for holidays)' },
  { value: 'other',           label: 'Other' },
]
const REASON_LABEL = { non_payment: 'Non-payment', voluntary_pause: 'Voluntary pause', other: 'Other' }

export default function SuspendModal({ school, profile, onClose, onSaved, logActivity, showToast }) {
  const [reasonType, setReasonType] = useState('non_payment')
  const [detail, setDetail]         = useState('')
  const [saving, setSaving]         = useState(false)

  const save = async () => {
    setSaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('settings').update({ cancelled_at: now }).eq('school_id', school.id)
    if (error) { showToast('Failed to suspend school: ' + error.message, 'error'); setSaving(false); return }

    const reasonText = REASON_LABEL[reasonType] + (detail.trim() ? ' — ' + detail.trim() : '')
    await logActivity(school.id, 'School suspended', reasonText)
    await supabase.from('admin_plan_changes').insert({
      school_id: school.id, change_type: 'suspend',
      before_date: null, after_date: now,
      reason: reasonText,
      changed_by: profile?.id, changed_by_name: profile?.full_name || profile?.email,
    })

    showToast('School suspended')
    await onSaved()
    onClose()
  }

  if (!school) return null

  return (
    <Modal title={'Suspend — ' + school.name} onClose={onClose} width={440}>
      <p style={{ fontSize: 13, color: 'var(--mist2)', marginBottom: 14, lineHeight: 1.6 }}>
        They will lose access immediately. This can be reversed anytime via Unsuspend.
      </p>
      <Field label='Reason' value={reasonType} onChange={setReasonType} options={REASON_OPTIONS}/>
      <Field label='Detail (optional)' value={detail} onChange={setDetail} placeholder='e.g. 3 months overdue, promised payment by Friday'/>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving} style={{ background: 'var(--rose)', color: '#fff', border: 'none' }}>
          {saving ? <><Spinner/> Suspending...</> : 'Suspend'}
        </Btn>
      </div>
    </Modal>
  )
}
