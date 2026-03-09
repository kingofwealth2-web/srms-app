// Usage:
//   <Skeleton width={120} height={14}/>
//   <Skeleton width='60%' height={14} style={{marginBottom:8}}/>
//   <SkeletonCard rows={4}/> — full card placeholder

export default function Skeleton({ width = '100%', height = 14, style }) {
  return (
    <div className='skeleton' style={{
      width, height,
      borderRadius: 6,
      ...style,
    }}/>
  )
}

export function SkeletonCard({ rows = 3, style }) {
  return (
    <div style={{
      background: 'var(--ink2)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', padding: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.055)',
      ...style,
    }}>
      <Skeleton width={120} height={11} style={{ marginBottom: 20 }}/>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === rows - 1 ? '55%' : '100%'}
          height={13}
          style={{ marginBottom: 10 }}
        />
      ))}
    </div>
  )
}

// Skeleton row for table loading
export function SkeletonRows({ count = 5, cols = 4 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} style={{ padding: '14px 16px' }}>
          <Skeleton width={j === 1 ? '70%' : j === 0 ? '40%' : '55%'} height={12}/>
        </td>
      ))}
    </tr>
  ))
}