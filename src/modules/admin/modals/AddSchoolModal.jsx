import { useState } from 'react'
import { supabase } from '../../../supabase'
import Modal from '../../components/Modal'
import Field from '../../components/Field'
import Btn from '../../components/Btn'
import Spinner from '../../components/Spinner'

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
]

export default function AddSchoolModal({ onClose, onSaved, logActivity, showToast }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', region: '', district: '',
    plan: 'pro', trialDays: 14,
    createAdmin: false, adminName: '', adminEmail: '',
  })
  const [saving, setSaving] = useState(false)
  const f = k => v => setForm(p => ({ ...p, [k]: v }))

  const genPw = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let pw = ''
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    return pw
  }

  const save = async () => {
    if (!form.name.trim()) { showToast('School name is required', 'error'); return }
    if (form.createAdmin && (!form.adminName.trim() || !form.adminEmail.trim())) {
      showToast('Admin name and email are required', 'error'); return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('admin_create_school', {
        p_name: form.name.trim(),
        p_address: form.address.trim(),
        p_region: form.region.trim(),
        p_district: form.district.trim(),
        p_phone: form.phone.trim(),
        p_email: form.email.trim(),
        p_plan: form.plan,
        p_trial_days: Number(form.trialDays) || 14,
      })
      if (error) throw error
      const schoolId = data.school_id

      let adminPw = null
      if (form.createAdmin) {
        adminPw = genPw()
        const { error: userErr } = await supabase.rpc('create_auth_user', {
          p_email: form.adminEmail.trim(),
          p_password: adminPw,
          p_full_name: form.adminName.trim(),
          p_role: 'superadmin',
          p_school_id: schoolId,
        })
        if (userErr) throw userErr
      }

      await logActivity(schoolId, 'School added', `${form.plan.toUpperCase()} plan · ${form.trialDays}-day trial`)
      showToast('School created successfully')
      if (adminPw) {
        // Keep this visible longer than a toast — it's a one-time credential
        window.alert(`Initial admin created.\n\nEmail: ${form.adminEmail}\nTemporary password: ${adminPw}\n\nShare this with the school — they'll be required to change it on first login.`)
      }
      await onSaved()
      onClose()
    } catch (e) {
      showToast('Failed to create school: ' + e.message, 'error')
    }
    setSaving(false)
  }

  return (
    <Modal title='Add School' onClose={onClose} width={560}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label='School Name' value={form.name} onChange={f('name')} placeholder='e.g. Kandit Standard School' required/>
        <Field label='Phone' value={form.phone} onChange={f('phone')} placeholder='0244 000 000'/>
        <Field label='Email' value={form.email} onChange={f('email')} type='email' placeholder='school@email.com'/>
        <Field label='Region' value={form.region} onChange={f('region')} placeholder='e.g. Ashanti'/>
        <Field label='District' value={form.district} onChange={f('district')} placeholder='e.g. Kumasi Metro'/>
        <Field label='Address' value={form.address} onChange={f('address')} placeholder='Town / District'/>
        <Field label='Initial Plan' value={form.plan} onChange={f('plan')} options={PLAN_OPTIONS}/>
        <Field label='Trial Days' value={form.trialDays} onChange={f('trialDays')} type='number'/>
      </div>

      <div style={{ marginTop: 4, marginBottom: 14, padding: '12px 14px', background: 'var(--ink3)', borderRadius: 'var(--r-sm)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--white)', cursor: 'pointer' }}>
          <input type='checkbox' checked={form.createAdmin} onChange={e => f('createAdmin')(e.target.checked)}/>
          Also create the initial superadmin login for this school
        </label>
        {form.createAdmin && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginTop: 12 }}>
            <Field label='Admin Name' value={form.adminName} onChange={f('adminName')} required/>
            <Field label='Admin Email' value={form.adminEmail} onChange={f('adminEmail')} type='email' required/>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant='ghost' onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <><Spinner/> Creating...</> : 'Create School'}</Btn>
      </div>
    </Modal>
  )
}
