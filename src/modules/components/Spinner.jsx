export default function Spinner({ size = 18, color = 'var(--gold)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(255,255,255,0.08)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.65s linear infinite',
      flexShrink: 0,
    }}/>
  )
}