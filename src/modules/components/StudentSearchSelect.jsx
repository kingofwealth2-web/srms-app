import { useState, useRef, useEffect } from 'react'
import { fullName } from '../lib/helpers'

// Type-to-filter single-student picker. Replaces scroll-list <select>s anywhere
// one student must be chosen. Matches on name AND student ID, shows the class,
// and searches only the `students` passed in -- so callers scope it to whatever
// filters are active (a class, "my students", etc.) and the results follow.
export default function StudentSearchSelect({
  students = [], value, onChange, classes = [],
  label, required, placeholder = 'Search student by name or ID…',
  maxResults = 50, autoFocus = false, disabled = false, style,
}) {
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState(false)  // typing a query vs. showing the picked name
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)

  const classNameOf = id => classes.find(c => c.id === id)?.name || ''
  const selected    = students.find(s => s.id === value) || null

  // Close when clicking outside.
  useEffect(() => {
    const onDoc = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setEditing(false) } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q = query.trim().toLowerCase()
  const matches = students.filter(s => {
    if (!q) return true  // empty query -> show the whole (already-scoped) list
    return fullName(s).toLowerCase().includes(q) || (s.student_id || '').toLowerCase().includes(q)
  }).slice(0, maxResults)

  useEffect(() => { setHighlight(0) }, [query, open])

  const pick  = s => { onChange(s.id); setQuery(''); setEditing(false); setOpen(false) }
  const clear = () => { onChange(''); setQuery(''); setEditing(true); setOpen(true) }

  // Input shows the live query while typing, otherwise the selected student's name.
  const inputValue = editing ? query : (selected ? fullName(selected, true) : '')

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--mist2)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
    fontFamily: "'Clash Display',sans-serif",
  }
  const inputStyle = {
    width: '100%', background: 'var(--ink3)', border: '1px solid var(--line2)',
    borderRadius: 10, padding: '9px 34px', color: 'var(--white)', fontSize: 13.5,
    boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'text', opacity: disabled ? 0.5 : 1,
  }

  return (
    <div ref={wrapRef} style={{ marginBottom: 14, position: 'relative', ...style }}>
      {label && <label style={labelStyle}>{label}{required && <span style={{ color: 'var(--gold)', marginLeft: 3 }}>*</span>}</label>}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mist3)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
        <input
          value={inputValue}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setEditing(true); setOpen(true) }}
          onFocus={() => { if (!disabled) { setEditing(true); setQuery(''); setOpen(true) } }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown')      { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(matches.length - 1, h + 1)) }
            else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)) }
            else if (e.key === 'Enter')     { if (open && matches[highlight]) { e.preventDefault(); pick(matches[highlight]) } }
            else if (e.key === 'Escape')    { setOpen(false); setEditing(false) }
          }}
          style={inputStyle}
        />
        {value && !disabled && (
          <button type='button' onMouseDown={e => { e.preventDefault(); clear() }} aria-label='Clear'
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--mist3)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        )}
      </div>
      {open && !disabled && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--ink3)', border: '1px solid var(--line2)', borderRadius: 10, zIndex: 100, maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {matches.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--mist3)' }}>No students found</div>
          ) : matches.map((s, i) => (
            <div key={s.id}
              onMouseDown={e => { e.preventDefault(); pick(s) }}
              onMouseEnter={() => setHighlight(i)}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)', background: i === highlight ? 'var(--ink4)' : 'transparent' }}>
              {/* name truncates so it can't push the class/ID off a narrow (phone) row */}
              <span style={{ fontWeight: 500, color: 'var(--white)', flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(s, true)}</span>
              <span style={{ fontSize: 11, color: 'var(--mist3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{[classNameOf(s.class_id), s.student_id].filter(Boolean).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
