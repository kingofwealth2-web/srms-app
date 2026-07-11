import { useState } from 'react'
import { supabase } from '../../../supabase'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

export default function NoteModal({ school, onClose, onSaved, logActivity, showToast }) {
  const [text, setText]     = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!text.trim()) { showToast('Note cannot be empty', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('admin_notes').insert({ school_id: school.id, note: text.trim() })
    if (error) { showToast('Failed to save note: ' + error.message, 'error'); setSaving(false); return }
    await logActivity(school.id, 'Note added', text.trim().slice(0, 60) + (text.length > 60 ? '…' : ''))
    showToast('Note saved')
    await onSaved()
    onClose()
  }

  if (!school) return null

  return (
    <Modal title={'Add Note — ' + school.name} onClose={onClose} width={440}>
      <Field label='Note' value={text} onChange={setText} rows={4} placeholder='Write your note here…'/>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <><Spinner/> Saving...</> : 'Save Note'}</Btn>
      </div>
    </Modal>
  )
}
