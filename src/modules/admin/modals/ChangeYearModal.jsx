import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

// Format the app uses everywhere: "YYYY/YYYY" with the second year one after
// the first (e.g. 2026/2027). currentYearFromSettings normalises a stored dash
// to a slash, so we always write the slash form here.
const YEAR_RE = /^(\d{4})\/(\d{4})$/
function validYear(y) {
  const m = YEAR_RE.exec((y || '').trim())
  return !!m && Number(m[2]) === Number(m[1]) + 1
}
function shiftYear(y, delta) {
  const m = YEAR_RE.exec((y || '').trim())
  if (!m) return y
  return `${Number(m[1]) + delta}/${Number(m[2]) + delta}`
}

// Ministry-only correction: sets which academic year a school is currently in.
// Because the year-lock keys off settings.academic_year, this instantly makes
// the chosen year editable again and re-locks the others — the clean way to
// undo an accidental rollover (no data is moved or deleted).
export default function ChangeYearModal({ school, profile, onClose, onSaved, logActivity, showToast }) {
  const current = school?.academic_year || ''
  const [newYear, setNewYear] = useState(current)
  const [reason, setReason]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [hint, setHint]       = useState(null)   // { fees, enrol } record counts for the target year

  const ok      = validYear(newYear)
  const changed = ok && newYear.trim() !== current

  // Show how many records already live in the target year, so the admin can see
  // they're switching to a real year and catch an accidental empty/typo year.
  useEffect(() => {
    if (!school || !changed) { setHint(null); return }
    let cancelled = false
    const yr = newYear.trim()
    ;(async () => {
      const [{ count: fees }, { count: enrol }] = await Promise.all([
        supabase.from('fees').select('id', { count: 'exact', head: true }).eq('school_id', school.id).eq('academic_year', yr),
        supabase.from('student_year_enrolment').select('id', { count: 'exact', head: true }).eq('school_id', school.id).eq('academic_year', yr),
      ])
      if (!cancelled) setHint({ fees: fees || 0, enrol: enrol || 0 })
    })()
    return () => { cancelled = true }
  }, [school, newYear, changed])

  const save = async () => {
    if (!ok) { showToast('Enter a valid year like 2026/2027', 'error'); return }
    if (!changed) { showToast('That is already the current academic year', 'error'); return }
    const yr = newYear.trim()
    setSaving(true)
    const { error } = await supabase.from('settings').update({ academic_year: yr }).eq('school_id', school.id)
    if (error) { showToast('Failed to change academic year: ' + error.message, 'error'); setSaving(false); return }

    await logActivity(school.id, 'Academic year changed', `${current || 'not set'} → ${yr}${reason.trim() ? ' · ' + reason.trim() : ''}`)
    await supabase.from('admin_plan_changes').insert({
      school_id: school.id, change_type: 'year_change',
      reason: `${current || 'not set'} → ${yr}${reason.trim() ? ' · ' + reason.trim() : ''}`,
      changed_by: profile?.id, changed_by_name: profile?.full_name || profile?.email,
    })

    showToast(`Academic year set to ${yr}`)
    await onSaved()
    onClose()
  }

  if (!school) return null

  return (
    <Modal title={`Change Academic Year — ` + school.name} onClose={onClose} width={460}>
      <div style={{ fontSize: 12, color: 'var(--mist3)', marginBottom: 14 }}>
        Current academic year: <strong style={{ color: 'var(--white)' }}>{current || 'not set'}</strong>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <Btn size='sm' variant='ghost' disabled={!validYear(current)} onClick={() => setNewYear(shiftYear(current, -1))}>← Previous year</Btn>
        <Btn size='sm' variant='ghost' disabled={!validYear(current)} onClick={() => setNewYear(shiftYear(current, 1))}>Next year →</Btn>
      </div>

      <Field label='Set current year to' value={newYear} onChange={setNewYear} placeholder='e.g. 2026/2027'/>
      {newYear.trim() && !ok && (
        <div style={{ fontSize: 12, color: 'var(--rose)', marginTop: -6, marginBottom: 10 }}>
          Use the format YYYY/YYYY with consecutive years (e.g. 2026/2027).
        </div>
      )}
      {changed && hint && (
        <div style={{ fontSize: 12, color: hint.fees || hint.enrol ? 'var(--mist2)' : 'var(--amber)', marginTop: -6, marginBottom: 10 }}>
          {hint.fees || hint.enrol
            ? `This year has ${hint.enrol} enrolment record(s) and ${hint.fees} fee record(s).`
            : '⚠ No records exist in this year yet — double-check it is the year you mean.'}
        </div>
      )}

      <Field label='Reason (optional)' value={reason} onChange={setReason} placeholder='e.g. Reversing an accidental year rollover'/>

      <div style={{ fontSize: 12, color: 'var(--mist3)', margin: '4px 0 14px', lineHeight: 1.5 }}>
        This only changes which year the school is currently working in. No records are moved or deleted — the other years stay exactly as they are, just read-only.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving || !changed}>{saving ? <><Spinner/> Saving…</> : 'Change Year'}</Btn>
      </div>
    </Modal>
  )
}
