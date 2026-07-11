import { useState } from 'react'
import { fmtDate } from '../lib/helpers'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Field from '../components/Field'

export default function AdminActivity({ schools, activity }) {
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')

  const list = activity.filter(a => {
    if (schoolFilter && a.school_id !== schoolFilter) return false
    if (search && !`${a.action}${a.school_name}${a.detail || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <PageHeader title='Activity Log' sub='All actions across all schools'/>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: '1 1 240px' }}>
          <Field label={null} value={search} onChange={setSearch} placeholder='Search activity…'/>
        </div>
        <div style={{ width: 200 }}>
          <Field label={null} value={schoolFilter} onChange={setSchoolFilter}
            options={[{ value: '', label: 'All Schools' }, ...schools.map(s => ({ value: s.id, label: s.name }))]}/>
        </div>
      </div>

      <Card>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--mist3)', fontSize: 13 }}>No activity yet</div>
        ) : (
          list.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: 5, flexShrink: 0 }}/>
              <div>
                <div style={{ fontSize: 13, color: 'var(--white)' }}>
                  {a.action}
                  {a.detail && <span style={{ color: 'var(--mist3)', fontWeight: 400 }}> — {a.detail}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2 }}>{a.school_name || '—'} · {fmtDate(a.created_at)}</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
