import { useState, useMemo } from 'react'
import { supabase } from '../../../supabase'
import { fmtDate } from '../../lib/helpers'
import { PLANS, PLAN_ORDER, FEATURE_LABELS } from '../../lib/constants'
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

export default function ActivatePlanModal({ school, profile, onClose, onSaved, logActivity, showToast }) {
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

  // Downgrade check -- only meaningful when moving between two real paid
  // tiers, not from trial/free into a plan (that's always an upgrade).
  const currentTier = PLAN_ORDER.includes(school?.plan) ? school.plan : null
  const isDowngrade = currentTier && PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(currentTier)
  const downgradeInfo = useMemo(() => {
    if (!isDowngrade) return null
    const from = PLANS[currentTier], to = PLANS[plan]
    const lostFeatures = Object.keys(from.features).filter(k => from.features[k] && !to.features[k]).map(k => FEATURE_LABELS[k] || k)
    const overStudents = to.studentLimit != null && (school.student_count || 0) > to.studentLimit
    const overStaff = to.userLimit != null && (school.staff_count || 0) > to.userLimit
    return { lostFeatures, overStudents, overStaff, toLabel: to.label, studentLimit: to.studentLimit, userLimit: to.userLimit }
  }, [isDowngrade, currentTier, plan, school])

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
    await supabase.from('admin_plan_changes').insert({
      school_id: school.id, change_type: 'plan_change',
      before_plan: school.plan || null, after_plan: plan,
      before_date: school.plan_expires_at || null, after_date: expiry,
      reason: note.trim() || null,
      changed_by: profile?.id, changed_by_name: profile?.full_name || profile?.email,
    })
    if (note.trim()) {
      const { error: noteErr } = await supabase.from('admin_notes').insert({ school_id: school.id, note: note.trim() })
      if (noteErr) console.error('Failed to save note:', noteErr.message)
    }

    showToast(isActive ? 'Plan updated successfully' : 'Plan activated successfully')
    await onSaved()
    onClose()
  }

  if (!school) return null

  return (
    <Modal title={(isActive ? 'Update Plan — ' : 'Activate Plan — ') + school.name} onClose={onClose} width={480}>
      <Field label='Plan Tier' value={plan} onChange={setPlan} options={PLAN_OPTIONS}/>
      {downgradeInfo && (
        <div style={{
          background: 'rgba(240,107,122,0.07)', border: '1px solid rgba(240,107,122,0.25)',
          borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 14, fontSize: 12, color: 'var(--mist2)',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--rose)', marginBottom: 6 }}>⚠ This is a downgrade to {downgradeInfo.toLabel}</div>
          {downgradeInfo.lostFeatures.length > 0 && (
            <div style={{ marginBottom: downgradeInfo.overStudents || downgradeInfo.overStaff ? 6 : 0 }}>
              They'll lose access to: {downgradeInfo.lostFeatures.join(', ')}.
            </div>
          )}
          {downgradeInfo.overStudents && (
            <div>Currently {school.student_count} students — {downgradeInfo.toLabel} caps at {downgradeInfo.studentLimit}.</div>
          )}
          {downgradeInfo.overStaff && (
            <div>Currently {school.staff_count} staff — {downgradeInfo.toLabel} caps at {downgradeInfo.userLimit}.</div>
          )}
        </div>
      )}
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
