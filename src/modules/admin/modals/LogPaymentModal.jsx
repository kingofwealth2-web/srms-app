import { useState } from 'react'
import { supabase } from '../../../supabase'
import { fmtMoney } from '../../lib/helpers'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

const today = () => new Date().toISOString().split('T')[0]

export default function LogPaymentModal({ schools, defaultSchoolId, onClose, onSaved, logActivity, showToast }) {
  const [schoolId, setSchoolId] = useState(defaultSchoolId || schools[0]?.id || '')
  const [amount, setAmount]     = useState('')
  const [date, setDate]         = useState(today())
  const [desc, setDesc]         = useState('')
  const [saving, setSaving]     = useState(false)

  const save = async () => {
    if (!schoolId || !amount || !desc.trim() || !date) { showToast('Please fill all fields', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('admin_payments').insert({
      school_id: schoolId, amount: Number(amount), paid_at: date, description: desc.trim(),
    })
    if (error) { showToast('Failed to log payment: ' + error.message, 'error'); setSaving(false); return }
    await logActivity(schoolId, `Payment logged — ${fmtMoney(amount)}`, desc.trim())
    showToast('Payment logged')
    await onSaved()
    onClose()
  }

  return (
    <Modal title='Log Payment' onClose={onClose} width={460}>
      <Field label='School' value={schoolId} onChange={setSchoolId}
        options={schools.map(s => ({ value: s.id, label: s.name }))}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label='Amount (GHS)' value={amount} onChange={setAmount} type='number' placeholder='0.00'/>
        <Field label='Date' value={date} onChange={setDate} type='date'/>
      </div>
      <Field label='Description' value={desc} onChange={setDesc} placeholder='e.g. Trial balance, Year 1 renewal' required/>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <><Spinner/> Logging...</> : 'Log Payment'}</Btn>
      </div>
    </Modal>
  )
}
