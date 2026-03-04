export default function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--ink2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r)', padding: 20, ...style,
    }}>
      {children}
    </div>
  )
}
