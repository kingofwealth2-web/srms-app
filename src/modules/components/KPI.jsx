import { useState, useEffect, useRef } from 'react'

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(target)
  const raf = useRef(null)
  const prevTarget = useRef(target)

  useEffect(() => {
    const str = String(target)
    // Extract numeric part and surrounding text
    const match = str.match(/^([^0-9-]*)(-?[\d,]+\.?\d*)([^0-9]*)$/)
    if (!match) { setVal(target); return }

    const prefix = match[1]
    const suffix = match[3]
    const num    = parseFloat(match[2].replace(/,/g, '')) || 0
    const prevNum = parseFloat(String(prevTarget.current).replace(/[^0-9.-]/g, '')) || 0
    prevTarget.current = target

    let start = null
    const ease = t => 1 - Math.pow(1 - t, 3)
    const hasDecimals = match[2].includes('.')
    const decimals = hasDecimals ? (match[2].split('.')[1]?.length || 0) : 0

    const fmt = n => {
      const fixed = n.toFixed(decimals)
      const parts = fixed.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return parts.join('.')
    }

    cancelAnimationFrame(raf.current)
    const run = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const cur = prevNum + (num - prevNum) * ease(p)
      setVal(`${prefix}${fmt(cur)}${suffix}`)
      if (p < 1) raf.current = requestAnimationFrame(run)
      else setVal(target)
    }
    raf.current = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf.current)
  }, [target])

  return val
}

export default function KPI({ label, value, color, sub, index = 0 }) {
  const animated = useCountUp(String(value))

  return (
    <div
      className={`fu fu${Math.min(index + 1, 8)}`}
      style={{
        background: 'var(--ink2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: '24px 26px',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}40`
        e.currentTarget.style.boxShadow   = `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}18`
        e.currentTarget.style.transform   = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.boxShadow   = 'none'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 100, height: 100,
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--mist3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
        fontFamily: "'Clash Display',sans-serif",
      }}>{label}</div>
      <div className='d' style={{
        fontSize: 34, fontWeight: 700, color,
        letterSpacing: '-0.03em', lineHeight: 1,
      }}>{animated}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 10 }}>{sub}</div>}
    </div>
  )
}