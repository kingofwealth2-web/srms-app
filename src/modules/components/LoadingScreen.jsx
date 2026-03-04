import Spinner from './Spinner'

export default function LoadingScreen({ msg = 'Loading...' }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, background: 'var(--ink)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 24px rgba(232,184,75,0.4)',
      }}>
        <span className='d' style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>S</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--mist2)', fontSize: 13 }}>
        <Spinner/> {msg}
      </div>
    </div>
  )
}
