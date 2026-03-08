import { useState } from 'react'
import { useIsMobile } from '../lib/hooks'

export default function Field({ label, value, onChange, type = 'text', placeholder, options, required, rows, style }) {
  const isMobile = useIsMobile()
  const [focused, setFocused] = useState(false)

  const inputStyle = {
    width: '100%',
    background: focused ? 'var(--ink4)' : 'var(--ink3)',
    border: `1px solid ${focused ? 'rgba(232,184,75,0.45)' : 'var(--line2)'}`,
    borderRadius: 10,
    padding: isMobile ? '13px 14px' : '9px 13px',
    color: 'var(--white)',
    fontSize: isMobile ? 16 : 13.5,
    lineHeight: 1.5,
    transition: 'border-color var(--t-fast), background var(--t-fast), box-shadow var(--t-fast)',
    boxShadow: focused ? '0 0 0 3px rgba(232,184,75,0.07)' : 'none',
  }

  const selectStyle = { ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', paddingRight: 36 }

  return (
    <div style={{ marginBottom: 14, position: 'relative', ...style }}>
      {label && (
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600,
          color: focused ? 'var(--mist)' : 'var(--mist2)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          marginBottom: 6,
          fontFamily: "'Clash Display',sans-serif",
          transition: 'color var(--t-fast)',
        }}>
          {label}
          {required && <span style={{ color: 'var(--gold)', marginLeft: 3 }}>*</span>}
        </label>
      )}

      {options ? (
        <div style={{ position: 'relative' }}>
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={selectStyle}
          >
            <option value=''>— Select —</option>
            {options.map(o => (
              <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
            ))}
          </select>
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: 'var(--mist3)', fontSize: 10,
          }}>▾</div>
        </div>
      ) : rows ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onWheel={type === 'number' ? e => e.target.blur() : undefined}
          onKeyDown={type === 'number' ? e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault() } : undefined}
          style={inputStyle}
        />
      )}
    </div>
  )
}