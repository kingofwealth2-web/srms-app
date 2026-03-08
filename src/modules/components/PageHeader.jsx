import { useIsMobile } from '../lib/hooks'

export default function PageHeader({ title, sub, children }) {
  const isMobile = useIsMobile()
  return (
    <div className='fu' style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      marginBottom: isMobile ? 22 : 30,
      flexWrap: 'wrap', gap: 14,
    }}>
      <div>
        <h1 className='d' style={{
          fontSize: isMobile ? 22 : 28,
          fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1,
          color: 'var(--white)',
        }}>{title}</h1>
        {sub && <p style={{
          color: 'var(--mist3)', fontSize: 13, marginTop: 5, lineHeight: 1.4,
        }}>{sub}</p>}
      </div>
      {children && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {children}
        </div>
      )}
    </div>
  )
}