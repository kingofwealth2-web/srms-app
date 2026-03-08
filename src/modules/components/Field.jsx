import { useState } from 'react'
import { useIsMobile } from '../lib/hooks'

export default function Field({ label, value, onChange, type = 'text', placeholder, options, required, rows, style }) {
  const isMobile = useIsMobile()
  const base = {
    width: '100%',
    background: 'var(--ink3)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-sm)',
    padding: isMobile ? '12px 14px' : '9px 14px',
    color: 'var(--white)',
    fontSize: isMobile ? 16 : 13,
    transition: 'border-color 0.15s',
    lineHeight: 1.5,
  }
  const [foc, setFoc] = useState(false)
  const fs = foc ? { borderColor: 'var(--gold)', boxShadow: '0 0 0 3px rgba(232,184,75,0.08)' } : {}

  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && (
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600,
          color: 'var(--mist2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 6,
          fontFamily: "'Clash Display',sans-serif",
        }}>
          {label}{required && <span style={{ color: 'var(--gold)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {options ? (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFoc(true)}
          onBlur={() => setFoc(false)}
          style={{ ...base, ...fs, cursor: 'pointer' }}
        >
          <option value=''>-- Select --</option>
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
      ) : rows ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          onFocus={() => setFoc(true)}
          onBlur={() => setFoc(false)}
          style={{ ...base, ...fs, resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFoc(true)}
          onBlur={() => setFoc(false)}
          onWheel={type === 'number' ? e => e.target.blur() : undefined}
          onKeyDown={type === 'number' ? e => { if(e.key==='ArrowUp'||e.key==='ArrowDown') e.preventDefault() } : undefined}
          style={{ ...base, ...fs }}
        />
      )}
    </div>
  )
}