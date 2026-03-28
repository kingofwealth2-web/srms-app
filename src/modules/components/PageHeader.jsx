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
          fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15,
          color: 'var(--white)',
          // Subtle gold text shadow for premium glow
          textShadow: '0 0 40px rgba(232,184,75,0.12)',
        }}>{title}</h1>
        {sub && <p style={{
          color: 'var(--mist3)', fontSize: 12.5, marginTop: 5, lineHeight: 1.5,
          letterSpacing: '0.01em',
        }}>{sub}</p>}
      </div>
      {children && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
          {children}
        </div>
      )}
    </div>
  )
}