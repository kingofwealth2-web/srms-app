export default function Spinner() {
  return (
    <div style={{
      width: 20, height: 20,
      border: '2px solid var(--line)',
      borderTopColor: 'var(--gold)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}/>
  )
}
