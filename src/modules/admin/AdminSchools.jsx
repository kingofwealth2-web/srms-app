import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { fmtDate, fmtMoney } from '../lib/helpers'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import DataTable from '../components/DataTable'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'

const STATUS_COLOR = { trial: 'var(--sky)', active: 'var(--emerald)', grace: 'var(--amber)', expired: 'var(--rose)', suspended: 'var(--rose)' }
const PLAN_COLOR    = { free: 'var(--mist3)', starter: 'var(--sky)', basic: 'var(--gold)', pro: 'var(--emerald)' }

function daysLeftLabel(d, status) {
  if (status === 'suspended') return <span style={{ color: 'var(--mist3)' }}>Suspended</span>
  if (d === null) return <span style={{ color: 'var(--mist3)' }}>—</span>
  if (d < 0) return <span style={{ color: 'var(--rose)', fontWeight: 600 }}>Expired {Math.abs(d)}d ago</span>
  const color = d <= 7 ? 'var(--rose)' : d <= 30 ? 'var(--amber)' : 'var(--emerald)'
  return <span style={{ color, fontWeight: 600 }}>{d} days</span>
}

export default function AdminSchools(props) {
  const { schools, daysLeft, getExpiry, openActivate, openAddSchool, confirmSuspend, unsuspend } = props
  const [search, setSearch]   = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fPlan, setFPlan]     = useState('')
  const [detailId, setDetailId] = useState(null)

  const list = schools.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    if (fStatus && s.status !== fStatus) return false
    if (fPlan && s.plan !== fPlan) return false
    return true
  })

  const columns = [
    { key: 'name', label: 'School', render: (v, s) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--mist3)' }}>{s.phone || ''}</div>
      </div>
    ) },
    { key: 'plan', label: 'Plan', render: v => <Badge color={PLAN_COLOR[v] || 'var(--mist3)'}>{(v || 'free').toUpperCase()}</Badge> },
    { key: 'status', label: 'Status', render: v => <Badge color={STATUS_COLOR[v] || 'var(--mist3)'}>{v}</Badge> },
    { key: 'id', label: 'Expiry', render: (_, s) => fmtDate(getExpiry(s)) },
    { key: 'plan_expires_at', label: 'Days Left', render: (_, s) => daysLeftLabel(daysLeft(getExpiry(s)), s.status) },
    { key: 'student_count', label: 'Students', render: v => <><strong>{v}</strong> <span style={{ color: 'var(--mist3)', fontSize: 11 }}>students</span></> },
    { key: '_actions', label: 'Actions', render: (_, s) => (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        <Btn size='sm' onClick={() => openActivate(s.id)}>Activate</Btn>
        <Btn size='sm' variant='ghost' onClick={() => setDetailId(id => id === s.id ? null : s.id)}>Detail</Btn>
        {s.status === 'suspended'
          ? <Btn size='sm' variant='secondary' onClick={() => unsuspend(s.id)}>Unsuspend</Btn>
          : <Btn size='sm' variant='danger' onClick={() => confirmSuspend(s.id)}>Suspend</Btn>}
      </div>
    ) },
  ]

  const detailSchool = schools.find(s => s.id === detailId)

  return (
    <div>
      <PageHeader title='Schools' sub='All registered clients'>
        <Btn onClick={openAddSchool}>+ Add School</Btn>
      </PageHeader>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <Field label={null} value={search} onChange={setSearch} placeholder='Search by name…'/>
        </div>
        <div style={{ width: 160 }}>
          <Field label={null} value={fStatus} onChange={setFStatus} options={[
            { value: '', label: 'All Status' }, { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' },
            { value: 'grace', label: 'Grace' }, { value: 'expired', label: 'Expired' }, { value: 'suspended', label: 'Suspended' },
          ]}/>
        </div>
        <div style={{ width: 160 }}>
          <Field label={null} value={fPlan} onChange={setFPlan} options={[
            { value: '', label: 'All Plans' }, { value: 'free', label: 'Free' }, { value: 'starter', label: 'Starter' },
            { value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' },
          ]}/>
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        <DataTable columns={columns} data={list} onRow={s => setDetailId(id => id === s.id ? null : s.id)}/>
      </Card>

      {detailSchool && <SchoolDetail school={detailSchool} {...props} />}
    </div>
  )
}

function SchoolDetail({ school, notes, comms, payments, onboarding, ONBOARDING_ITEMS, openLogPayment, openNote, openComm, toggleObItem, confirmLockUser, unlockUser, openPasswordReset, confirmViewAs }) {
  const [tab, setTab] = useState('info')
  const sNotes = notes.filter(n => n.school_id === school.id)
  const sComms = comms.filter(c => c.school_id === school.id)
  const sPay   = payments.filter(p => p.school_id === school.id)
  const sOb    = onboarding.find(o => o.school_id === school.id) || {}
  const obDone = ONBOARDING_ITEMS.filter(([k]) => sOb[k]).length

  const tabs = [
    ['info', 'Info'],
    ['payments', `Payments (${sPay.length})`],
    ['notes', `Notes (${sNotes.length})`],
    ['comms', `Comms (${sComms.length})`],
    ['onboarding', 'Onboarding'],
    ['users', `Users (${school.staff_count})`],
  ]

  return (
    <Card style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)' }}>{school.name}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size='sm' onClick={() => openLogPayment(school.id)}>Log Payment</Btn>
          <Btn size='sm' variant='ghost' onClick={() => openNote(school.id)}>Add Note</Btn>
          <Btn size='sm' variant='ghost' onClick={() => openComm(school.id)}>Log Contact</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)' }}>
        {tabs.map(([k, label]) => (
          <div key={k} onClick={() => setTab(k)} style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: tab === k ? 'var(--gold2)' : 'var(--mist3)',
            borderBottom: `2px solid ${tab === k ? 'var(--gold)' : 'transparent'}`, marginBottom: -1,
          }}>{label}</div>
        ))}
      </div>

      {tab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          <div>
            <SectionLabel>Contact</SectionLabel>
            <InfoLine>📞 {school.phone || '—'}</InfoLine>
            <InfoLine>✉️ {school.email || '—'}</InfoLine>
            <InfoLine>📍 {school.address || '—'}</InfoLine>
            <InfoLine>🗺 {[school.district, school.region].filter(Boolean).join(', ') || '—'}</InfoLine>
          </div>
          <div>
            <SectionLabel>Plan</SectionLabel>
            <div style={{ marginBottom: 6 }}><Badge color={PLAN_COLOR[school.plan]}>{(school.plan || 'free').toUpperCase()}</Badge> <Badge color={STATUS_COLOR[school.status]}>{school.status}</Badge></div>
            <InfoLine>Expiry: <strong style={{ color: 'var(--white)' }}>{fmtDate(school.plan_expires_at || school.trial_ends_at)}</strong></InfoLine>
            <InfoLine>Students: <strong style={{ color: 'var(--white)' }}>{school.student_count}</strong></InfoLine>
            <InfoLine>Staff: <strong style={{ color: 'var(--white)' }}>{school.staff_count}</strong></InfoLine>
          </div>
          <div>
            <SectionLabel>Revenue</SectionLabel>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--emerald)' }}>{fmtMoney(sPay.reduce((a, p) => a + Number(p.amount || 0), 0))}</div>
            <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 4 }}>{sPay.length} payment{sPay.length !== 1 ? 's' : ''} logged</div>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        sPay.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Date', 'Amount', 'Description'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--mist3)', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {sPay.map(p => (
                <tr key={p.id}><td style={{ padding: '8px 0', fontSize: 13 }}>{fmtDate(p.paid_at)}</td><td style={{ padding: '8px 0', fontSize: 13, color: 'var(--emerald)', fontWeight: 600 }}>{fmtMoney(p.amount)}</td><td style={{ padding: '8px 0', fontSize: 13 }}>{p.description}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon='💰' text='No payments logged yet'/>
      )}

      {tab === 'notes' && (
        <>
          {sNotes.length ? sNotes.map(n => (
            <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, color: 'var(--white)', marginBottom: 4 }}>{n.note}</div>
              <div style={{ fontSize: 11, color: 'var(--mist3)' }}>{fmtDate(n.created_at)}</div>
            </div>
          )) : <EmptyState icon='📝' text='No notes yet'/>}
          <Btn size='sm' variant='ghost' onClick={() => openNote(school.id)} style={{ marginTop: 12 }}>+ Add Note</Btn>
        </>
      )}

      {tab === 'comms' && (
        <>
          {sComms.length ? sComms.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <Badge color='var(--sky)'>{c.channel}</Badge>
                <span style={{ fontSize: 12, color: 'var(--mist3)' }}>{fmtDate(c.comm_date)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--white)' }}>{c.summary}</div>
            </div>
          )) : <EmptyState icon='💬' text='No communications logged yet'/>}
          <Btn size='sm' variant='ghost' onClick={() => openComm(school.id)} style={{ marginTop: 12 }}>+ Log Contact</Btn>
        </>
      )}

      {tab === 'onboarding' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--mist3)', marginBottom: 6 }}>{obDone}/{ONBOARDING_ITEMS.length} complete</div>
          <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${Math.round(obDone / ONBOARDING_ITEMS.length * 100)}%`, background: 'var(--gold)' }}/>
          </div>
          {ONBOARDING_ITEMS.map(([k, label]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <input type='checkbox' checked={!!sOb[k]} onChange={e => toggleObItem(school.id, k, e.target.checked)}/>
              <span style={{ fontSize: 13, color: 'var(--white)', textDecoration: sOb[k] ? 'line-through' : 'none', opacity: sOb[k] ? 0.6 : 1 }}>{label}</span>
            </label>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <UsersTab schoolId={school.id} schoolName={school.name} confirmLockUser={confirmLockUser} unlockUser={unlockUser} openPasswordReset={openPasswordReset} confirmViewAs={confirmViewAs}/>
      )}
    </Card>
  )
}

function UsersTab({ schoolId, schoolName, confirmLockUser, unlockUser, openPasswordReset, confirmViewAs }) {
  const [users, setUsers]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    supabase.from('profiles').select('id,full_name,email,role,locked,created_at').eq('school_id', schoolId).order('full_name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setLoadError(error.message)
        else setUsers(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [schoolId])

  if (loading) return <div style={{ padding: 20, color: 'var(--mist3)', fontSize: 13 }}>Loading users…</div>
  if (loadError) return <div style={{ padding: 20, color: 'var(--rose)', fontSize: 13 }}>Failed to load users: {loadError}</div>
  if (!users?.length) return <EmptyState icon='👤' text='No users found for this school'/>

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--mist3)', padding: '6px 8px 6px 0', borderBottom: '1px solid var(--line)' }}>{h}</th>)}</tr></thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td style={{ padding: '8px 8px 8px 0', fontSize: 13, fontWeight: 600 }}>{u.full_name || '—'}</td>
            <td style={{ padding: '8px 8px 8px 0', fontSize: 12, color: 'var(--mist3)' }}>{u.email || '—'}</td>
            <td style={{ padding: '8px 8px 8px 0' }}><Badge color='var(--sky)'>{(u.role || '—').toUpperCase()}</Badge></td>
            <td style={{ padding: '8px 8px 8px 0' }}>{u.locked ? <Badge color='var(--rose)'>Locked</Badge> : <Badge color='var(--emerald)'>Active</Badge>}</td>
            <td style={{ padding: '8px 8px 8px 0', fontSize: 12, color: 'var(--mist3)' }}>{fmtDate(u.created_at)}</td>
            <td style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn size='sm' variant='ghost'
                  disabled={u.locked}
                  title={u.locked ? 'Unlock this account before viewing as this user' : ''}
                  onClick={() => confirmViewAs(u.id, u.full_name, u.role, schoolId, schoolName)}>View As</Btn>
                <Btn size='sm' variant='ghost' onClick={() => openPasswordReset(u.id, u.full_name)}>Reset Password</Btn>
                {u.locked
                  ? <Btn size='sm' variant='secondary' onClick={() => unlockUser(u.id, u.full_name, schoolId)}>Unlock</Btn>
                  : <Btn size='sm' variant='danger' onClick={() => confirmLockUser(u.id, u.full_name, schoolId)}>Lock</Btn>}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{children}</div>
}
function InfoLine({ children }) {
  return <div style={{ fontSize: 13, marginBottom: 6, color: 'var(--mist2)' }}>{children}</div>
}
function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--mist3)' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  )
}
