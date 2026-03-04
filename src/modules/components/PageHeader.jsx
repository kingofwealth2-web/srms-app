import { useIsMobile } from '../lib/hooks'

export default function PageHeader({ title, sub, children }) {
  const isMobile = useIsMobile()
  return (
    <div className='fu' style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: isMobile ? 20 : 28,
      flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <h1 className='d' style={{
          fontSize: isMobile ? 20 : 26,
          fontWeight: 700, letterSpacing: '-0.02em',
        }}>{title}</h1>
        {sub && <p style={{
          color: 'var(--mist2)',
          fontSize: isMobile ? 12 : 13,
          marginTop: 4,
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
