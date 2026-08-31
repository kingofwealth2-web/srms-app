import { useState, useRef, useEffect, useId } from 'react'
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
  const inputId = useId()

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

  return (
    <div ref={wrapRef} className={`srms-search-select ${open ? 'is-open' : ''}`} style={{ marginBottom: 14, ...style }}>
      {label && <label htmlFor={inputId} className="srms-search-select__label">{label}{required && <span style={{ color: 'var(--gold)', marginLeft: 3 }}>*</span>}</label>}
      <div className="srms-search-select__control">
        <svg className="srms-search-select__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        <input
          id={inputId}
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
          className="srms-search-select__input"
        />
        {value && !disabled && (
          <button type='button' onMouseDown={e => { e.preventDefault(); clear() }} aria-label='Clear'
            className="srms-search-select__clear">×</button>
        )}
      </div>
      {open && !disabled && (
        <div className="srms-search-select__menu" role="listbox">
          <div className="srms-search-select__header"><span>Students</span><span>{matches.length} result{matches.length===1?'':'s'}</span></div>
          {matches.length === 0 ? (
            <div className="srms-search-select__empty">No students found</div>
          ) : matches.map((s, i) => (
            <button type="button" role="option" aria-selected={selected?.id === s.id} key={s.id}
              onMouseDown={e => { e.preventDefault(); pick(s) }}
              onMouseEnter={() => setHighlight(i)}
              className={`srms-search-select__option ${i === highlight ? 'is-active' : ''} ${selected?.id === s.id ? 'is-selected' : ''}`}>
              {/* name truncates so it can't push the class/ID off a narrow (phone) row */}
              <span className="srms-search-select__name">{fullName(s, true)}</span>
              <span className="srms-search-select__meta">{[classNameOf(s.class_id), s.student_id].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
