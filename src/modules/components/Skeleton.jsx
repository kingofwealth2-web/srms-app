// Skeleton shimmer for loading states
// Single skeleton line
export default function Skeleton({ width = '100%', height = 14, style = {} }) {
  return (
    <div className='srms-skeleton' style={{
      width, height,
      borderRadius: 6,
      ...style,
    }}/>
  )
}
// Table rows skeleton — drop inside a <tbody>
// Usage: <SkeletonRows count={8} cols={5}/>
export function SkeletonRows({ count = 6, cols = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} style={{ padding: '12px 16px' }}>
          <div className='srms-skeleton' style={{
            height: 12,
            borderRadius: 6,
            width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '75%',
            animationDelay: `${i * 0.05}s`,
          }}/>
        </td>
      ))}
    </tr>
  ))
}

