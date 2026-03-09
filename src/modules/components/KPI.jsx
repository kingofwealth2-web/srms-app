import { useState, useEffect, useRef } from 'react'

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(target)
  const raf = useRef(null)
  const prevTarget = useRef(target)

  useEffect(() => {
    const str = String(target)
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
        padding: '22px 24px 20px',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}50`
        e.currentTarget.style.boxShadow   = `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}20, inset 0 1px 0 rgba(255,255,255,0.06)`
        e.currentTarget.style.transform   = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.boxShadow   = 'inset 0 1px 0 rgba(255,255,255,0.06)'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color} 0%, ${color}55 65%, transparent 100%)`,
        borderRadius: '14px 14px 0 0',
      }}/>

      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 120, height: 120,
        background: `radial-gradient(circle, ${color}1c 0%, transparent 68%)`,
        pointerEvents: 'none',
      }}/>

      {/* Label with accent dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 5px ${color}90`,
          flexShrink: 0,
        }}/>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--mist3)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: "'Clash Display',sans-serif",
        }}>{label}</span>
      </div>

      <div className='d' style={{
        fontSize: 34, fontWeight: 700, color,
        letterSpacing: '-0.03em', lineHeight: 1,
      }}>{animated}</div>

      {sub && (
        <div style={{
          fontSize: 11.5, color: 'var(--mist3)', marginTop: 12,
          borderTop: '1px solid var(--line)', paddingTop: 10,
        }}>{sub}</div>
      )}
    </div>
  )
}