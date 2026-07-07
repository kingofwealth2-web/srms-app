import { useState, useMemo } from 'react'
import { supabase } from '../../../supabase'
import { fmtDate } from '../../lib/helpers'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
]
const DURATION_OPTIONS = [
  { value: '30', label: '30 days (1 month)' },
  { value: '90', label: '90 days (3 months)' },
  { value: '180', label: '180 days (6 months)' },
  { value: '365', label: '365 days (1 year)' },
  { value: '730', label: '730 days (2 years)' },
  { value: '1095', label: '1095 days (3 years)' },
  { value: 'custom', label: 'Custom' },
]
const today = () => new Date().toISOString().split('T')[0]
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0] }

export default function ActivatePlanModal({ school, onClose, onSaved, logActivity, showToast }) {
  const isActive = school?.status === 'active' || school?.status === 'grace'

  const [plan, setPlan]           = useState(school?.plan && school.plan !== 'free' ? school.plan : 'pro')
  const [extendFrom, setExtendFrom] = useState('expiry') // 'expiry' | 'today'
  const [duration, setDuration]   = useState('365')
  const [customEnd, setCustomEnd] = useState('')
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)

  const basisDate = useMemo(() => {
    if (!isActive) return today()
    return extendFrom === 'expiry' && school?.plan_expires_at ? school.plan_expires_at.split('T')[0] : today()
  }, [isActive, extendFrom, school])

  const expiry = duration === 'custom' ? customEnd : (basisDate ? addDays(basisDate, Number(duration)) : '')

  const save = async () => {
    if (!expiry) { showToast('Please fill all required fields', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('settings').update({ plan, plan_expires_at: expiry }).eq('school_id', school.id)
    if (error) { showToast('Failed to activate plan: ' + error.message, 'error'); setSaving(false); return }

    const basisLabel = isActive
      ? (extendFrom === 'expiry' ? `extended from current expiry (${fmtDate(basisDate)})` : `reset from today (${fmtDate(basisDate)})`)
      : `${fmtDate(basisDate)} → ${fmtDate(expiry)}`
    const actionLabel = isActive ? `Plan updated — ${plan.toUpperCase()}` : `Plan activated — ${plan.toUpperCase()}`
    await logActivity(school.id, actionLabel, `${basisLabel} · new expiry ${fmtDate(expiry)}${note ? ' · ' + note : ''}`)
    if (note.trim()) await supabase.from('admin_notes').insert({ school_id: school.id, note: note.trim() })

    showToast(isActive ? 'Plan updated successfully' : 'Plan activated successfully')
    await onSaved()
    onClose()
  }

  if (!school) return null

  return (
    <Modal title={(isActive ? 'Update Plan — ' : 'Activate Plan — ') + school.name} onClose={onClose} width={480}>
      <Field label='Plan Tier' value={plan} onChange={setPlan} options={PLAN_OPTIONS}/>
      {isActive && (
        <Field label='Extend From' value={extendFrom} onChange={setExtendFrom} options={[
          { value: 'expiry', label: 'Current expiry date (recommended — keeps remaining time)' },
          { value: 'today', label: 'Today (resets to count from now)' },
        ]}/>
      )}
      <Field label='Duration' value={duration} onChange={setDuration} options={DURATION_OPTIONS}/>
      {duration === 'custom' && (
        <Field label='Custom End Date' value={customEnd} onChange={setCustomEnd} type='date'/>
      )}
      <Field label='Expiry Date (calculated)' value={expiry} onChange={() => {}} style={{ opacity: 0.7 }}/>
      {isActive && (
        <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: -10, marginBottom: 14 }}>
          {extendFrom === 'expiry'
            ? `New duration will be added on top of the current expiry (${fmtDate(basisDate)}), preserving time already paid for.`
            : `New duration starts counting from today, regardless of remaining time on the current plan.`}
        </div>
      )}
      <Field label='Note (optional)' value={note} onChange={setNote} placeholder='e.g. Paid full year upfront'/>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <><Spinner/> Saving...</> : (isActive ? 'Update Plan' : 'Activate')}</Btn>
      </div>
    </Modal>
  )
}
