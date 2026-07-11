import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Badge from '../components/Badge'

const PLAN_COLOR = { free: 'var(--mist3)', starter: 'var(--sky)', basic: 'var(--gold)', pro: 'var(--emerald)' }

export default function AdminOnboarding({ schools, onboarding, ONBOARDING_ITEMS, toggleObItem }) {
  return (
    <div>
      <PageHeader title='Onboarding' sub='Setup progress per school'/>
      {schools.map(s => {
        const sOb = onboarding.find(o => o.school_id === s.id) || {}
        const done = ONBOARDING_ITEMS.filter(([k]) => sOb[k]).length
        const pct = Math.round(done / ONBOARDING_ITEMS.length * 100)
        return (
          <Card key={s.id} style={{ marginBottom: 12, padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 2 }}>{done}/{ONBOARDING_ITEMS.length} steps complete · {pct}%</div>
              </div>
              <Badge color={PLAN_COLOR[s.plan]}>{(s.plan || 'free').toUpperCase()}</Badge>
            </div>
            <div style={{ padding: '14px 20px 18px' }}>
              <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)' }}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 20px' }}>
                {ONBOARDING_ITEMS.map(([k, label]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                    <input type='checkbox' checked={!!sOb[k]} onChange={e => toggleObItem(s.id, k, e.target.checked)}/>
                    <span style={{ fontSize: 13, color: 'var(--white)', textDecoration: sOb[k] ? 'line-through' : 'none', opacity: sOb[k] ? 0.6 : 1 }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
