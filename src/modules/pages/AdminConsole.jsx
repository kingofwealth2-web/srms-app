import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import { fetchAllRows } from '../lib/helpers'
import { setImpersonationState, clearImpersonationState } from '../lib/impersonation'
import Btn from '../components/Btn'
import Spinner from '../components/Spinner'
import AdminDashboard  from '../admin/AdminDashboard'
import AdminSchools    from '../admin/AdminSchools'
import AdminSearch     from '../admin/AdminSearch'
import AdminRenewals   from '../admin/AdminRenewals'
import AdminPayments   from '../admin/AdminPayments'
import AdminOnboarding from '../admin/AdminOnboarding'
import AdminActivity   from '../admin/AdminActivity'
import AddSchoolModal      from '../admin/modals/AddSchoolModal'
import ActivatePlanModal   from '../admin/modals/ActivatePlanModal'
import LogPaymentModal     from '../admin/modals/LogPaymentModal'
import NoteModal           from '../admin/modals/NoteModal'
import CommModal           from '../admin/modals/CommModal'
import PasswordResetModal  from '../admin/modals/PasswordResetModal'
import ConfirmModal from '../components/ConfirmModal'

const NAV = [
  { key: 'dashboard',  label: 'Dashboard',  icon: '📊' },
  { key: 'search',     label: 'Search',     icon: '🔍' },
  { key: 'schools',    label: 'Schools',    icon: '🏫' },
  { key: 'renewals',   label: 'Renewals',   icon: '🔔' },
  { key: 'payments',   label: 'Payments',   icon: '💰' },
  { key: 'onboarding', label: 'Onboarding', icon: '✅' },
  { key: 'activity',   label: 'Activity Log', icon: '📋' },
]

const ONBOARDING_ITEMS = [
  ['contract_signed', 'Contract signed'],
  ['initial_payment', 'Initial payment received'],
  ['school_configured', 'School configured in SRMS'],
  ['superadmin_created', 'Superadmin account created'],
  ['staff_created', 'Staff accounts created'],
  ['training_done', 'Training completed'],
  ['followup_done', 'Follow-up done'],
]

function daysLeft(expiry) {
  if (!expiry) return null
  return Math.ceil((new Date(expiry) - new Date()) / 86400000)
}
function getExpiry(school) {
  return school.plan_expires_at || school.trial_ends_at
}

export default function AdminConsole({ profile, onSignOut }) {
  const [loading, setLoading]   = useState(true)
  const [section, setSection]   = useState('dashboard')
  const [toast, setToast]       = useState(null)
  const [jumpToSchoolId, setJumpToSchoolId] = useState(null)

  const [schools, setSchools]       = useState([])
  const [notes, setNotes]           = useState([])
  const [comms, setComms]           = useState([])
  const [payments, setPayments]     = useState([])
  const [onboarding, setOnboarding] = useState([])
  const [activity, setActivity]     = useState([])
  const [lastLoginBySchool, setLastLoginBySchool] = useState({})

  // Modal state — shared across sections since several actions (log payment,
  // log contact, activate plan) can be triggered from more than one section.
  const [modal, setModal] = useState(null) // {type, schoolId?, userId?, userName?}
  const [confirmState, setConfirmState] = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const logActivity = useCallback(async (schoolId, action, detail = '') => {
    const school = schools.find(s => s.id === schoolId)
    const { error } = await supabase.from('admin_activity').insert({ school_id: schoolId, school_name: school?.name || '', action, detail })
    if (error) console.error('Failed to log admin activity:', error.message)
  }, [schools])

  const loadAll = useCallback(async () => {
    const [
      { data: sc }, { data: st }, { data: py },
      { data: nt }, { data: cm }, { data: ob }, { data: ac },
      { data: stuCounts }, { data: staffProfiles },
    ] = await Promise.all([
      fetchAllRows(() => supabase.from('schools').select('id,name,address,phone,email,region,district,active,created_at').order('name')),
      fetchAllRows(() => supabase.from('settings').select('school_id,plan,trial_ends_at,plan_expires_at,grace_ends_at,cancelled_at,academic_year').order('id')),
      fetchAllRows(() => supabase.from('admin_payments').select('*').order('paid_at', { ascending: false })),
      fetchAllRows(() => supabase.from('admin_notes').select('*').order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('admin_comms').select('*').order('comm_date', { ascending: false })),
      fetchAllRows(() => supabase.from('admin_onboarding').select('*')),
      fetchAllRows(() => supabase.from('admin_activity').select('*').order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('students').select('school_id').eq('archived', false)),
      fetchAllRows(() => supabase.from('profiles').select('id,school_id')),
    ])

    const now = new Date()
    const mapped = (sc || []).map(s => {
      const sett = (st || []).find(x => x.school_id === s.id) || {}
      let status = 'expired'
      if (sett.cancelled_at) {
        status = 'suspended'
      } else if (sett.plan_expires_at) {
        const exp = new Date(sett.plan_expires_at)
        if (exp > now) status = 'active'
        else if (sett.grace_ends_at && new Date(sett.grace_ends_at) > now) status = 'grace'
        else status = 'expired'
      } else if (sett.trial_ends_at) {
        status = new Date(sett.trial_ends_at) > now ? 'trial' : 'expired'
      }
      return {
        ...s,
        plan: sett.plan || 'free',
        plan_expires_at: sett.plan_expires_at || null,
        trial_ends_at: sett.trial_ends_at || null,
        grace_ends_at: sett.grace_ends_at || null,
        academic_year: sett.academic_year || null,
        status,
        student_count: (stuCounts || []).filter(x => x.school_id === s.id).length,
        staff_count: (staffProfiles || []).filter(x => x.school_id === s.id).length,
      }
    })

    setSchools(mapped)
    setPayments(py || [])
    setNotes(nt || [])
    setComms(cm || [])
    setOnboarding(ob || [])
    setActivity(ac || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Shared actions used by multiple sections ──────────────────
  const openActivate = (schoolId) => setModal({ type: 'activate', schoolId })
  const openAddSchool = () => setModal({ type: 'addSchool' })
  const openLogPayment = (schoolId) => setModal({ type: 'payment', schoolId })
  const openNote = (schoolId) => setModal({ type: 'note', schoolId })
  const openComm = (schoolId) => setModal({ type: 'comm', schoolId })
  const openPasswordReset = (userId, userName) => setModal({ type: 'pwreset', userId, userName })
  const openSchool = (schoolId) => { setSection('schools'); setJumpToSchoolId(schoolId) }

  const confirmSuspend = (schoolId) => {
    const s = schools.find(x => x.id === schoolId)
    setConfirmState({
      title: 'Suspend School', icon: '⛔', danger: true, confirmLabel: 'Suspend',
      body: `Are you sure you want to suspend ${s?.name}? They will lose access immediately.`,
      onConfirm: async () => {
        const { error } = await supabase.from('settings').update({ cancelled_at: new Date().toISOString() }).eq('school_id', schoolId)
        if (error) { showToast('Failed to suspend school: ' + error.message, 'error'); return }
        await logActivity(schoolId, 'School suspended')
        showToast('School suspended')
        await loadAll()
      },
    })
  }

  const unsuspend = async (schoolId) => {
    const { error } = await supabase.from('settings').update({ cancelled_at: null }).eq('school_id', schoolId)
    if (error) { showToast('Failed to unsuspend school: ' + error.message, 'error'); return }
    await logActivity(schoolId, 'School unsuspended')
    showToast('School unsuspended')
    await loadAll()
  }

  const toggleObItem = async (schoolId, key, val) => {
    const existing = onboarding.find(o => o.school_id === schoolId)
    const { error } = existing
      ? await supabase.from('admin_onboarding').update({ [key]: val, updated_at: new Date().toISOString() }).eq('school_id', schoolId)
      : await supabase.from('admin_onboarding').insert({ school_id: schoolId, [key]: val })
    if (error) { showToast('Failed to update onboarding: ' + error.message, 'error'); return }
    await logActivity(schoolId, `Onboarding: ${key.replace(/_/g, ' ')} marked ${val ? 'done' : 'undone'}`)
    await loadAll()
  }

  const confirmLockUser = (userId, userName, schoolId) => {
    setConfirmState({
      title: 'Lock User Account', icon: '🔒', danger: true, confirmLabel: 'Lock',
      body: `This will prevent ${userName} from logging in. Their existing data will not be affected.`,
      onConfirm: async () => {
        const { error } = await supabase.rpc('admin_set_user_locked', { p_user_id: userId, p_locked: true })
        if (error) { showToast('Failed to lock user: ' + error.message, 'error'); return }
        await logActivity(schoolId, `User locked — ${userName}`, 'Account access disabled, data preserved')
        showToast(`${userName} locked`)
        await loadAll()
      },
    })
  }

  const unlockUser = async (userId, userName, schoolId) => {
    const { error } = await supabase.rpc('admin_set_user_locked', { p_user_id: userId, p_locked: false })
    if (error) { showToast('Failed to unlock user: ' + error.message, 'error'); return }
    await logActivity(schoolId, `User unlocked — ${userName}`)
    showToast(`${userName} unlocked`)
  }

  const confirmViewAs = (userId, userName, userRole, schoolId, schoolName) => {
    setConfirmState({
      title: 'View As ' + userName, icon: '🕵', danger: true, confirmLabel: 'View As',
      body: `You will be signed in as ${userName} (${userRole}) at ${schoolName}. All actions you take will be performed as if by them and shown in their account's own history. Exit anytime via the banner at the top of the screen.`,
      onConfirm: async () => {
        const { data, error } = await supabase.functions.invoke('view-as-user', { body: { target_user_id: userId } })
        if (error || data?.error) { showToast('Failed to view as user: ' + (data?.error || error.message), 'error'); return }
        setImpersonationState({
          startedAt: new Date().toISOString(),
          actorName: profile?.full_name, actorEmail: profile?.email,
          targetUserName: data.target.full_name, targetUserRole: data.target.role,
          targetSchoolId: data.target.school_id, targetSchoolName: data.target.school_name,
        })
        const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
        if (verifyErr) { clearImpersonationState(); showToast('Failed to view as user: ' + verifyErr.message, 'error') }
      },
    })
  }

  const closeModal = () => setModal(null)

  const shared = {
    schools, notes, comms, payments, onboarding, activity, lastLoginBySchool,
    daysLeft, getExpiry, ONBOARDING_ITEMS,
    openActivate, openAddSchool, openLogPayment, openNote, openComm, openPasswordReset, openSchool,
    confirmSuspend, unsuspend, toggleObItem, confirmLockUser, unlockUser, confirmViewAs,
    logActivity, showToast, reload: loadAll, jumpToSchoolId,
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
        <Spinner size={28}/>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ink)' }}>
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: '1px solid var(--line)', background: 'var(--ink2)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh' }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>SRMS Console</div>
          <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2 }}>Ministry Admin</div>
        </div>
        <nav style={{ padding: '12px 0', flex: 1 }}>
          {NAV.map(n => (
            <div key={n.key} onClick={() => setSection(n.key)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
              color: section === n.key ? 'var(--gold2)' : 'var(--mist3)',
              background: section === n.key ? 'var(--ink3)' : 'transparent',
              borderLeft: `3px solid ${section === n.key ? 'var(--gold)' : 'transparent'}`,
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, color: 'var(--mist2)', marginBottom: 10 }}>{profile?.full_name || profile?.email}</div>
          <Btn variant='ghost' size='sm' onClick={onSignOut} style={{ width: '100%', justifyContent: 'center' }}>Sign Out</Btn>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 220, flex: 1, padding: 28, minWidth: 0 }}>
        {section === 'dashboard'  && <AdminDashboard  {...shared}/>}
        {section === 'search'     && <AdminSearch     {...shared}/>}
        {section === 'schools'    && <AdminSchools    {...shared}/>}
        {section === 'renewals'   && <AdminRenewals   {...shared}/>}
        {section === 'payments'   && <AdminPayments   {...shared}/>}
        {section === 'onboarding' && <AdminOnboarding {...shared}/>}
        {section === 'activity'   && <AdminActivity   {...shared}/>}
      </div>

      {/* Shared modals */}
      {modal?.type === 'addSchool' && (
        <AddSchoolModal onClose={closeModal} onSaved={loadAll} logActivity={logActivity} showToast={showToast}/>
      )}
      {modal?.type === 'activate' && (
        <ActivatePlanModal
          school={schools.find(s => s.id === modal.schoolId)}
          onClose={closeModal} onSaved={loadAll} logActivity={logActivity} showToast={showToast}
        />
      )}
      {modal?.type === 'payment' && (
        <LogPaymentModal
          schools={schools} defaultSchoolId={modal.schoolId}
          onClose={closeModal} onSaved={loadAll} logActivity={logActivity} showToast={showToast}
        />
      )}
      {modal?.type === 'note' && (
        <NoteModal
          school={schools.find(s => s.id === modal.schoolId)}
          onClose={closeModal} onSaved={loadAll} logActivity={logActivity} showToast={showToast}
        />
      )}
      {modal?.type === 'comm' && (
        <CommModal
          school={schools.find(s => s.id === modal.schoolId)}
          onClose={closeModal} onSaved={loadAll} logActivity={logActivity} showToast={showToast}
        />
      )}
      {modal?.type === 'pwreset' && (
        <PasswordResetModal
          userId={modal.userId} userName={modal.userName}
          onClose={closeModal} showToast={showToast}
        />
      )}
      {confirmState && <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)}/>}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
          background: 'var(--ink2)', border: `1px solid ${toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)'}`,
          borderRadius: 10, padding: '12px 18px', fontSize: 13,
          color: toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)',
          maxWidth: 320, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>{toast.msg}</div>
      )}
    </div>
  )
}
