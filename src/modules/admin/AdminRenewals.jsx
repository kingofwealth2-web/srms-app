import { useState } from 'react'
import { fmtDate } from '../lib/helpers'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Btn from '../components/Btn'
import Field from '../components/Field'

export default function AdminRenewals({ schools, comms, daysLeft, getExpiry, openActivate, openComm }) {
  const [days, setDays] = useState('30')

  const list = schools.filter(s => {
    const d = daysLeft(getExpiry(s))
    if (days === 'all') return d !== null && d <= 30
    return d !== null && d >= 0 && d <= Number(days)
  }).sort((a, b) => daysLeft(getExpiry(a)) - daysLeft(getExpiry(b)))

  return (
    <div>
      <PageHeader title='Renewals' sub='Schools needing attention'>
        <div style={{ width: 200 }}>
          <Field label={null} value={days} onChange={setDays} options={[
            { value: '7', label: 'Expiring in 7 days' },
            { value: '14', label: 'Expiring in 14 days' },
            { value: '30', label: 'Expiring in 30 days' },
            { value: 'all', label: 'All expired / expiring' },
          ]}/>
        </div>
      </PageHeader>

      <Card style={{ padding: 0 }}>
        {list.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mist3)', fontSize: 13 }}>No renewals in this window</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['School', 'Plan', 'Expiry', 'Days Left', 'Last Contacted', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '9px 16px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(s => {
                const d = daysLeft(getExpiry(s))
                const lastComm = comms.filter(c => c.school_id === s.id).sort((a, b) => new Date(b.comm_date) - new Date(a.comm_date))[0]
                const rowBg = d <= 7 ? 'rgba(240,107,122,0.04)' : d <= 14 ? 'rgba(251,159,58,0.04)' : 'transparent'
                return (
                  <tr key={s.id} style={{ background: rowBg, borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 16px' }}><div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div></td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{(s.plan || 'free').toUpperCase()}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{fmtDate(getExpiry(s))}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: d < 0 ? 'var(--rose)' : d <= 7 ? 'var(--rose)' : d <= 30 ? 'var(--amber)' : 'var(--emerald)' }}>
                      {d < 0 ? `Expired ${Math.abs(d)}d ago` : `${d} days`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--mist3)' }}>{lastComm ? `${fmtDate(lastComm.comm_date)} · ${lastComm.channel}` : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn size='sm' onClick={() => openActivate(s.id)}>Renew</Btn>
                        <Btn size='sm' variant='ghost' onClick={() => openComm(s.id)}>Log Contact</Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
