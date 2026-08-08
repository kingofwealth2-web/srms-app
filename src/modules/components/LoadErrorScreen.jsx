import Btn from './Btn'
import Spinner from './Spinner'

// Shown in place of a page whose heavy data (fees / payments / attendance)
// failed to load, so a failed fetch never renders as an empty ledger that
// reads like the records were deleted. `onRetry` re-runs just that load.
export default function LoadErrorScreen({ msg = "Couldn't load this data.", onRetry, retrying = false, height = '60vh' }) {
  return (
    <div style={{
      height, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, background: 'var(--ink)', textAlign: 'center', padding: '0 24px',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: 'rgba(240,107,122,0.12)', border: '1px solid rgba(240,107,122,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
      }}>⚠</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 340 }}>
        <div style={{ fontSize: 14, color: 'var(--white)', fontWeight: 600 }}>{msg}</div>
        <div style={{ fontSize: 12.5, color: 'var(--mist3)', lineHeight: 1.5 }}>
          This is a connection problem, not lost data — your records are safe. Check your internet and try again.
        </div>
      </div>
      {onRetry && (
        <Btn onClick={onRetry} disabled={retrying}>
          {retrying ? <><Spinner/> Retrying…</> : 'Try again'}
        </Btn>
      )}
    </div>
  )
}
