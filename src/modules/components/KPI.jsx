import { useState, useEffect, useRef } from 'react'

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const num = parseFloat(String(target).replace(/[^0-9.]/g, '')) || 0
    const isPercent = String(target).includes('%')
    let start = null
    const ease = t => 1 - Math.pow(1 - t, 3)
    const run = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const cur = Math.round(num * ease(p))
      setVal(isPercent ? cur + '%' : cur)
      if (p < 1) raf.current = requestAnimationFrame(run)
    }
    raf.current = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return val
}

export default function KPI({ label, value, color, sub, index = 0, prefix = '', suffix = '' }) {
  const animated = useCountUp(value)
  const raw = String(value)
  const hasNum = /\d/.test(raw)

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
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}40`
        e.currentTarget.style.boxShadow   = `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`
        e.currentTarget.style.transform   = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.boxShadow   = 'none'
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 100, height: 100,
        background: `radial-gradient(circle, ${color}1a 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>

      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--mist3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
        fontFamily: "'Clash Display',sans-serif",
      }}>{label}</div>

      <div className='d' style={{
        fontSize: 36, fontWeight: 700, color,
        letterSpacing: '-0.03em', lineHeight: 1,
        marginBottom: sub ? 10 : 0,
      }}>
        {prefix}{hasNum ? animated : raw}{!hasNum ? '' : suffix}
      </div>

      {sub && <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 8 }}>{sub}</div>}
    </div>
  )
}