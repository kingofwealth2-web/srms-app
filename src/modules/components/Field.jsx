import { useState, useId } from 'react'
import { useIsMobile } from '../lib/hooks'

export default function Field({
  label, value, onChange, type = 'text', placeholder, options, required, rows, style, onKeyDown,
  autoComplete, name, autoFocus, inputRef, adornment, adornmentWidth = 40,
}) {
  const isMobile = useIsMobile()
  const [focused, setFocused] = useState(false)
  const fieldId = useId()

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
        <label htmlFor={fieldId} style={{
          cursor: 'pointer',
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
            id={fieldId}
            name={name}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={selectStyle}
          >
            <option value='' disabled={required && !!value}>— Select —</option>
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
          id={fieldId}
          name={name}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            id={fieldId}
            ref={inputRef}
            name={name}
            type={type}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onWheel={type === 'number' ? e => e.target.blur() : undefined}
            onKeyDown={e => {
              if (type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) e.preventDefault()
              onKeyDown?.(e)
            }}
            style={adornment ? { ...inputStyle, paddingRight: adornmentWidth + 12 } : inputStyle}
          />
          {adornment && (
            <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
              {adornment}
            </div>
          )}
        </div>
      )}
    </div>
  )
}