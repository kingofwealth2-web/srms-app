import { useState } from 'react'
import { supabase } from '../../supabase'
import { fullName } from '../lib/helpers'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'

const ROLE_COLOR = { superadmin: 'var(--gold)', admin: 'var(--gold)', classteacher: 'var(--sky)', teacher: 'var(--sky)', parent: 'var(--violet)' }

export default function AdminSearch({ schools, openSchool }) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [students, setStudents] = useState([])
  const [users, setUsers] = useState([])

  const schoolName = id => schools.find(s => s.id === id)?.name || '—'

  const runSearch = async () => {
    const term = q.trim()
    if (term.length < 2) return
    setLoading(true)
    setRan(true)
    const [{ data: stu }, { data: usr }] = await Promise.all([
      supabase.from('students')
        .select('id,student_id,first_name,last_name,school_id,guardian_name,guardian_phone,archived')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%,guardian_name.ilike.%${term}%,guardian_phone.ilike.%${term}%`)
        .limit(25),
      supabase.from('profiles')
        .select('id,full_name,email,role,school_id,locked')
        .neq('role', 'ministry_admin')
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(25),
    ])
    setStudents(stu || [])
    setUsers(usr || [])
    setLoading(false)
  }

  const onKeyDown = e => { if (e.key === 'Enter') runSearch() }

  return (
    <div>
      <PageHeader title='Search' sub='Find a student, parent, or staff member across every school'/>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: '1 1 400px' }}>
          <Field label={null} value={q} onChange={setQ} onKeyDown={onKeyDown}
            placeholder='Name, student ID, email, or guardian phone…'/>
        </div>
        <Btn onClick={runSearch} disabled={q.trim().length < 2 || loading}>{loading ? <><Spinner/> Searching...</> : 'Search'}</Btn>
      </div>

      {!ran && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--mist3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13 }}>Search across all schools at once — no need to know which one first.</div>
        </div>
      )}

      {ran && !loading && students.length === 0 && users.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--mist3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤷</div>
          <div style={{ fontSize: 13 }}>No matches for "{q}".</div>
        </div>
      )}

      {users.length > 0 && (
        <Card style={{ padding: 0, marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 700, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Staff & Parents ({users.length})
          </div>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                  {u.full_name || '—'} {u.locked && <Badge color='var(--rose)'>Locked</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 2 }}>
                  {u.email || '—'} · <Badge color={ROLE_COLOR[u.role] || 'var(--mist3)'}>{(u.role || '—').toUpperCase()}</Badge> · {schoolName(u.school_id)}
                </div>
              </div>
              <Btn size='sm' onClick={() => openSchool(u.school_id)}>Open School →</Btn>
            </div>
          ))}
        </Card>
      )}

      {students.length > 0 && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 700, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Students ({students.length})
          </div>
          {students.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                  {fullName(s)} {s.archived && <Badge color='var(--mist3)'>Archived</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 2 }}>
                  {s.student_id || '—'} · Guardian: {s.guardian_name || '—'} {s.guardian_phone ? `(${s.guardian_phone})` : ''} · {schoolName(s.school_id)}
                </div>
              </div>
              <Btn size='sm' onClick={() => openSchool(s.school_id)}>Open School →</Btn>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
