import { useState } from 'react'
import { supabase } from '../../../supabase'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

const today = () => new Date().toISOString().split('T')[0]
const CHANNEL_OPTIONS = ['WhatsApp', 'Call', 'Email', 'In-person'].map(c => ({ value: c, label: c }))

export default function CommModal({ school, onClose, onSaved, logActivity, showToast }) {
  const [channel, setChannel] = useState('WhatsApp')
  const [date, setDate]       = useState(today())
  const [summary, setSummary] = useState('')
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    if (!summary.trim()) { showToast('Summary cannot be empty', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('admin_comms').insert({
      school_id: school.id, channel, comm_date: date, summary: summary.trim(),
    })
    if (error) { showToast('Failed to log communication: ' + error.message, 'error'); setSaving(false); return }
    await logActivity(school.id, `Contact logged — ${channel}`, summary.trim().slice(0, 60))
    showToast('Communication logged')
    await onSaved()
    onClose()
  }

  if (!school) return null

  return (
    <Modal title={'Log Communication — ' + school.name} onClose={onClose} width={460}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label='Channel' value={channel} onChange={setChannel} options={CHANNEL_OPTIONS}/>
        <Field label='Date' value={date} onChange={setDate} type='date'/>
      </div>
      <Field label='Summary' value={summary} onChange={setSummary} rows={3} placeholder='What was discussed?'/>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <><Spinner/> Logging...</> : 'Log'}</Btn>
      </div>
    </Modal>
  )
}
