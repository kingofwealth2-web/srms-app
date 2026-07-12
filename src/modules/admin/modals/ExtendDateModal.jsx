import { useState, useMemo } from 'react'
import { supabase } from '../../../supabase'
import { fmtDate } from '../../lib/helpers'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

const today = () => new Date().toISOString().split('T')[0]
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0] }

const QUICK_OPTIONS = [
  { value: '3',  label: '+3 days' },
  { value: '7',  label: '+7 days' },
  { value: '14', label: '+14 days' },
  { value: '30', label: '+30 days' },
  { value: 'custom', label: 'Custom date' },
]

// Shared by "Extend Trial" and "Grace Period" quick actions -- both are
// the same shape (push a settings date field out, with a reason), just a
// different column and change_type.
export default function ExtendDateModal({ school, field, label, changeType, profile, onClose, onSaved, logActivity, showToast }) {
  const currentValue = school?.[field] ? school[field].split('T')[0] : null
  const [duration, setDuration]   = useState('7')
  const [customEnd, setCustomEnd] = useState('')
  const [reason, setReason]       = useState('')
  const [saving, setSaving]       = useState(false)

  const basis = currentValue && new Date(currentValue) > new Date() ? currentValue : today()
  const newDate = duration === 'custom' ? customEnd : addDays(basis, Number(duration))

  const save = async () => {
    if (!newDate) { showToast('Please fill all required fields', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('settings').update({ [field]: newDate }).eq('school_id', school.id)
    if (error) { showToast(`Failed to update ${label.toLowerCase()}: ` + error.message, 'error'); setSaving(false); return }

    await logActivity(school.id, `${label} extended`, `${currentValue ? fmtDate(currentValue) : 'not set'} → ${fmtDate(newDate)}${reason ? ' · ' + reason : ''}`)
    await supabase.from('admin_plan_changes').insert({
      school_id: school.id, change_type: changeType,
      before_date: school[field] || null, after_date: newDate,
      reason: reason.trim() || null,
      changed_by: profile?.id, changed_by_name: profile?.full_name || profile?.email,
    })

    showToast(`${label} extended to ${fmtDate(newDate)}`)
    await onSaved()
    onClose()
  }

  if (!school) return null

  return (
    <Modal title={`Extend ${label} — ` + school.name} onClose={onClose} width={440}>
      <div style={{ fontSize: 12, color: 'var(--mist3)', marginBottom: 14 }}>
        Current {label.toLowerCase()} end: <strong style={{ color: 'var(--white)' }}>{currentValue ? fmtDate(currentValue) : 'not set'}</strong>
      </div>
      <Field label='Extend By' value={duration} onChange={setDuration} options={QUICK_OPTIONS}/>
      {duration === 'custom' && (
        <Field label='New End Date' value={customEnd} onChange={setCustomEnd} type='date'/>
      )}
      <Field label='New End Date (calculated)' value={newDate} onChange={() => {}} style={{ opacity: 0.7 }}/>
      <Field label='Reason (optional)' value={reason} onChange={setReason} placeholder='e.g. Payment delayed, bank transfer in progress'/>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <><Spinner/> Saving...</> : 'Extend'}</Btn>
      </div>
    </Modal>
  )
}
