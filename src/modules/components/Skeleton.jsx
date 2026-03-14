// Skeleton shimmer for loading states
import { useEffect } from 'react'

function injectSkeletonStyle() {
  if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
    const s = document.createElement('style')
    s.id = 'skeleton-style'
    s.textContent = `@keyframes skeleton-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
    document.head.appendChild(s)
  }
}

// Single skeleton line
export default function Skeleton({ width = '100%', height = 14, style = {} }) {
  useEffect(() => { injectSkeletonStyle() }, [])
  return (
    <div style={{
      width, height,
      borderRadius: 6,
      background: 'linear-gradient(90deg, var(--ink3) 25%, var(--ink4) 50%, var(--ink3) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s infinite',
      ...style,
    }}/>
  )
}

// Table rows skeleton — drop inside a <tbody>
// Usage: <SkeletonRows count={8} cols={5}/>
export function SkeletonRows({ count = 6, cols = 5 }) {
  useEffect(() => { injectSkeletonStyle() }, [])
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} style={{ padding: '12px 16px' }}>
          <div style={{
            height: 12,
            borderRadius: 6,
            width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '75%',
            background: 'linear-gradient(90deg, var(--ink3) 25%, var(--ink4) 50%, var(--ink3) 75%)',
            backgroundSize: '200% 100%',
            animation: `skeleton-shimmer 1.4s infinite`,
            animationDelay: `${i * 0.05}s`,
          }}/>
        </td>
      ))}
    </tr>
  ))
}

// SkeletonRows also injects style via Skeleton's useEffect when first Skeleton mounts
