import { supabase } from '../../supabase'
import { fmtDate, fmtMoney } from '../lib/helpers'
import KPI from '../components/KPI'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Btn from '../components/Btn'

export default function AdminPayments({ schools, payments, openLogPayment, showToast, reload, logActivity }) {
  const totalRev = payments.reduce((a, p) => a + Number(p.amount || 0), 0)
  const now = new Date()
  const monthRev = payments.filter(p => {
    const d = new Date(p.paid_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((a, p) => a + Number(p.amount || 0), 0)

  const schoolName = id => schools.find(s => s.id === id)?.name || '—'

  const deletePayment = async (p) => {
    if (!window.confirm('Delete this payment record?')) return
    const { error } = await supabase.from('admin_payments').delete().eq('id', p.id)
    if (error) { showToast('Failed to delete payment: ' + error.message, 'error'); return }
    await logActivity(p.school_id, `Payment deleted — ${fmtMoney(p.amount)}`, p.description)
    showToast('Payment deleted')
    await reload()
  }

  return (
    <div>
      <PageHeader title='Payments' sub='Revenue tracker'>
        <Btn onClick={() => openLogPayment(null)}>+ Log Payment</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <KPI label='Total Revenue' value={fmtMoney(totalRev)} color='var(--emerald)' index={0}/>
        <KPI label='This Month' value={fmtMoney(monthRev)} color='var(--gold)' index={1}/>
        <KPI label='Payments Logged' value={payments.length} color='var(--mist3)' index={2}/>
      </div>

      <Card style={{ padding: 0 }}>
        {payments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mist3)', fontSize: 13 }}>No payments logged yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'School', 'Amount', 'Description', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '9px 16px', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{fmtDate(p.paid_at)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{schoolName(p.school_id)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--emerald)', fontWeight: 600 }}>{fmtMoney(p.amount)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.description}</td>
                  <td style={{ padding: '12px 16px' }}><Btn size='sm' variant='danger' onClick={() => deletePayment(p)}>Delete</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
