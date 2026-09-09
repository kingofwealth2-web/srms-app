import { useState, useId } from 'react'
import { useIsMobile } from '../lib/hooks'
import Select from './Select'
import DatePicker from './DatePicker'

export default function Field({
  label, value, onChange, type = 'text', placeholder, options, required, rows, style, onKeyDown,
  autoComplete, name, autoFocus, inputRef, adornment, adornmentWidth = 40, hint, error,
}) {
  const isMobile = useIsMobile()
  const [focused, setFocused] = useState(false)
  const fieldId = useId()
  const messageId = `${fieldId}-message`

  const inputStyle = {
    width: '100%',
    background: focused ? 'var(--ink4)' : 'var(--ink3)',
    border: `1px solid ${error ? 'var(--rose)' : focused ? 'rgba(232,184,75,0.45)' : 'var(--line2)'}`,
    borderRadius: 10,
    padding: isMobile ? '13px 14px' : '9px 13px',
    color: 'var(--white)',
    fontSize: isMobile ? 16 : 13.5,
    lineHeight: 1.5,
    transition: 'border-color var(--t-fast), background var(--t-fast), box-shadow var(--t-fast)',
    boxShadow: error ? '0 0 0 3px rgba(240,107,122,0.07)' : focused ? '0 0 0 3px rgba(232,184,75,0.07)' : 'none',
  }

  return (
    <div className={`srms-field${error ? ' is-error' : ''}`} style={{ marginBottom: 14, position: 'relative', ...style }}>
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
        <Select
          id={fieldId}
          name={name}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          menuLabel={label}
          placeholder='— Select —'
          options={[
            { value: '', label: '— Select —', disabled: required && !!value },
            ...options.map(o => ({ value: o.value ?? o, label: o.label ?? o })),
          ]}
          style={{ width: '100%' }}
          className={error ? 'is-error' : ''}
          aria-describedby={(error || hint) ? messageId : undefined}
        />
      ) : type === 'date' ? (
        <DatePicker id={fieldId} value={value ?? ''} onChange={onChange} label={label} required={required} style={inputStyle} aria-describedby={(error || hint) ? messageId : undefined}/>
      ) : rows ? (
        <textarea
          id={fieldId}
          name={name}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={(error || hint) ? messageId : undefined}
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
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={(error || hint) ? messageId : undefined}
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
      {(error || hint) && (
        <div id={messageId} className={`srms-field__message${error ? ' is-error' : ''}`} role={error ? 'alert' : undefined}>
          {error || hint}
        </div>
      )}
    </div>
  )
}
