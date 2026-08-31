// `height` lets this sit inside the page area (sidebar and topbar still
// visible) rather than covering the viewport, for refetches of an already-open
// workspace.
export default function LoadingScreen({ msg = 'Loading...', height = '100vh' }) {
  return (
    <div style={{
      height, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 18, background: 'var(--ink)',
      animation: 'fadeIn 0.3s ease',
    }} role="status" aria-live="polite" aria-label={msg}>
      <svg className="srms-loading-mark" viewBox="0 0 100 96" aria-hidden="true">
        <path
          className="srms-loading-mark__guide"
          d="M72 24c-9-10-42-8-45 6-4 16 43 9 41 28-2 19-38 18-45 4"
        />
        <path
          className="srms-loading-mark__stroke"
          d="M72 24c-9-10-42-8-45 6-4 16 43 9 41 28-2 19-38 18-45 4"
        />
      </svg>
      <div style={{ fontSize: 13, color: 'var(--mist2)', fontWeight: 500 }}>{msg}</div>
    </div>
  )
}
