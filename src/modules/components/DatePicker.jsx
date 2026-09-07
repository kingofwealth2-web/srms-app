import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '../lib/hooks'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Mo','Tu','We','Th','Fr','Sa','Su']
const pad = n => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  const now = new Date()
  return match
    ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
    : { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
}

export default function DatePicker({ id, value, onChange, label, required, style }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const initial = parseValue(value)
  const [draft, setDraft] = useState(initial)
  const [view, setView] = useState({ year: initial.year, month: initial.month })

  useEffect(() => {
    if (!open) return
    const next = parseValue(value)
    setDraft(next)
    setView({ year: next.year, month: next.month })
  }, [open, value])

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const formatted = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Choose date'

  return <>
    <button
      id={id}
      type='button'
      aria-label={`${label || 'Date'}: ${formatted}`}
      aria-haspopup='dialog'
      aria-expanded={open}
      onClick={() => setOpen(true)}
      className='srms-date-trigger'
      style={style}
    >
      <span className={value ? '' : 'is-placeholder'}>{formatted}</span>
      <CalendarIcon />
    </button>
    {open && createPortal(
      <div className={`srms-date-backdrop${isMobile ? ' is-mobile' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}>
        <section className='srms-date-picker' role='dialog' aria-modal='true' aria-label={label || 'Choose date'}>
          <header className='srms-date-picker__header'>
            <button type='button' className='srms-date-link' onClick={() => setOpen(false)}>Cancel</button>
            <strong>{label || 'Choose date'}</strong>
            <button type='button' className='srms-date-link is-done' onClick={() => { onChange(iso(draft.year, draft.month, draft.day)); setOpen(false) }}>Done</button>
          </header>
          {isMobile
            ? <WheelPicker value={draft} onChange={setDraft}/>
            : <CalendarGrid value={draft} view={view} setView={setView} onChange={setDraft}/>
          }
          <button type='button' className='srms-date-today' onClick={() => {
            const now = new Date(); const next = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
            setDraft(next); setView({ year: next.year, month: next.month })
          }}>Today</button>
          {!required && value && <button type='button' className='srms-date-clear' onClick={() => { onChange(''); setOpen(false) }}>Clear date</button>}
        </section>
      </div>, document.body,
    )}
  </>
}

function WheelPicker({ value, onChange }) {
  const years = useMemo(() => Array.from({ length: 131 }, (_, i) => new Date().getFullYear() + 10 - i), [])
  const days = new Date(value.year, value.month + 1, 0).getDate()
  const safeDay = Math.min(value.day, days)
  return <div className='srms-date-wheels'>
    <div className='srms-date-wheels__focus'/>
    <select size='5' aria-label='Day' value={safeDay} onChange={e => onChange({ ...value, day: Number(e.target.value) })}>
      {Array.from({ length: days }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
    </select>
    <select size='5' aria-label='Month' value={value.month} onChange={e => {
      const month = Number(e.target.value); const max = new Date(value.year, month + 1, 0).getDate()
      onChange({ ...value, month, day: Math.min(value.day, max) })
    }}>
      {MONTHS.map((month, i) => <option key={month} value={i}>{month}</option>)}
    </select>
    <select size='5' aria-label='Year' value={value.year} onChange={e => {
      const year = Number(e.target.value); const max = new Date(year, value.month + 1, 0).getDate()
      onChange({ ...value, year, day: Math.min(value.day, max) })
    }}>
      {years.map(year => <option key={year} value={year}>{year}</option>)}
    </select>
  </div>
}

function CalendarGrid({ value, view, setView, onChange }) {
  const first = new Date(view.year, view.month, 1)
  const offset = (first.getDay() + 6) % 7
  const count = new Date(view.year, view.month + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  const shift = delta => {
    const next = new Date(view.year, view.month + delta, 1)
    setView({ year: next.getFullYear(), month: next.getMonth() })
  }
  return <div className='srms-calendar'>
    <div className='srms-calendar__nav'>
      <button type='button' aria-label='Previous month' onClick={() => shift(-1)}>‹</button>
      <strong>{MONTHS[view.month]} {view.year}</strong>
      <button type='button' aria-label='Next month' onClick={() => shift(1)}>›</button>
    </div>
    <div className='srms-calendar__grid'>
      {WEEKDAYS.map(day => <span className='srms-calendar__weekday' key={day}>{day}</span>)}
      {cells.map((day, i) => day
        ? <button type='button' key={i} className={value.year === view.year && value.month === view.month && value.day === day ? 'is-selected' : ''} onClick={() => onChange({ year: view.year, month: view.month, day })}>{day}</button>
        : <span key={i}/>
      )}
    </div>
  </div>
}

function CalendarIcon() {
  return <svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round'>
    <rect x='3' y='5' width='18' height='16' rx='3'/><path d='M16 3v4M8 3v4M3 10h18'/>
  </svg>
}
