import { fmtDate, fmtMoney } from '../lib/helpers'
import KPI from '../components/KPI'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Btn from '../components/Btn'

export default function AdminDashboard({ schools, payments, activity, daysLeft, getExpiry, openAddSchool, diagnosticIssues, diagnosticsLoading, openDiagnostics }) {
  const totalRev = payments.reduce((a, p) => a + Number(p.amount || 0), 0)
  const now = new Date()
  const monthRev = payments.filter(p => {
    const d = new Date(p.paid_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((a, p) => a + Number(p.amount || 0), 0)

  const expiring30 = schools.filter(s => {
    const d = daysLeft(getExpiry(s))
    return d !== null && d >= 0 && d <= 30
  })

  const recentActivity = activity.slice(0, 8)

  return (
    <div>
      <PageHeader title='Dashboard' sub='Overview of all schools and activity'>
        <Btn onClick={openAddSchool}>+ Add School</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KPI label='Total Schools' value={schools.length} color='var(--gold)' index={0}/>
        <KPI label='Active Paying' value={schools.filter(s => s.status === 'active').length} color='var(--emerald)' index={1}/>
        <KPI label='Trials Running' value={schools.filter(s => s.status === 'trial').length} color='var(--amber)' index={2}/>
        <KPI label='Expired / Suspended' value={schools.filter(s => ['expired', 'suspended'].includes(s.status)).length} color='var(--rose)' index={3}/>
        <div style={{ gridColumn: 'span 2' }}>
          <KPI label='Total Revenue' value={fmtMoney(totalRev)} sub={fmtMoney(monthRev) + ' this month'} color='var(--gold)' index={4}/>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <KPI label='Expiring in 30 Days' value={expiring30.length} sub='schools need attention' color='var(--amber)' index={5}/>
        </div>
        <div style={{ gridColumn: 'span 4', cursor: 'pointer' }} onClick={openDiagnostics}>
          <KPI
            label='Data Diagnostics'
            value={diagnosticsLoading ? '…' : diagnosticIssues.length}
            sub={diagnosticsLoading ? 'Scanning all schools...' : diagnosticIssues.length === 0 ? 'No issues found' : `${diagnosticIssues.filter(i => i.severity === 'critical').length} critical -- click to review`}
            color={diagnosticIssues.some(i => i.severity === 'critical') ? 'var(--rose)' : diagnosticIssues.length > 0 ? 'var(--amber)' : 'var(--emerald)'}
            index={6}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>🔔 Upcoming Renewals</div>
            <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 2 }}>Next 30 days</div>
          </div>
          {expiring30.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--mist3)', fontSize: 13 }}>No renewals due soon</div>
          ) : (
            expiring30
              .sort((a, b) => daysLeft(getExpiry(a)) - daysLeft(getExpiry(b)))
              .slice(0, 5)
              .map(s => {
                const d = daysLeft(getExpiry(s))
                return (
                  <div key={s.id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mist3)' }}>{(s.plan || 'free').toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: d <= 7 ? 'var(--rose)' : d <= 14 ? 'var(--amber)' : 'var(--emerald)' }}>{d} days</div>
                      <div style={{ fontSize: 11, color: 'var(--mist3)' }}>{fmtDate(getExpiry(s))}</div>
                    </div>
                  </div>
                )
              })
          )}
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>⚡ Recent Activity</div>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--mist3)', fontSize: 13 }}>No activity yet</div>
          ) : (
            <div style={{ padding: '8px 20px' }}>
              {recentActivity.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: 5, flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--white)', fontWeight: 500 }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2 }}>{a.school_name || '—'} · {fmtDate(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
