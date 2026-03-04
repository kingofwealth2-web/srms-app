import { CURRENCIES, GHANA_PUBLIC_HOLIDAYS } from './constants'

// ── GRADE HELPERS ──────────────────────────────────────────────
export const ALL_COMPONENTS = ['classwork','homework','midsemester','final_exam','project']

export const DEFAULT_GRADING_SCALE = [
  {min:80, max:100, letter:'A', gpa:4.0, remark:'Excellent'},
  {min:65, max:79,  letter:'B', gpa:3.0, remark:'Very Good'},
  {min:50, max:64,  letter:'C', gpa:2.0, remark:'Good'},
  {min:0,  max:49,  letter:'F', gpa:0.0, remark:'Fail'},
]

export const DEFAULT_GRADE_COMPONENTS = [
  {key:'classwork',   label:'Classwork',   max_score:10, weight:10, enabled:true},
  {key:'homework',    label:'Homework',    max_score:10, weight:10, enabled:true},
  {key:'midsemester', label:'Midsemester', max_score:20, weight:20, enabled:true},
  {key:'final_exam',  label:'Final Exam',  max_score:50, weight:50, enabled:true},
  {key:'project',     label:'Project',     max_score:10, weight:10, enabled:true},
]

export const getGradeComponents = settings => settings?.grade_components || DEFAULT_GRADE_COMPONENTS

export const calcTotal = (g, gradeComponents) => {
  const comps = gradeComponents || DEFAULT_GRADE_COMPONENTS
  const active = comps.filter(c => c.enabled)
  if (!active.length) return 0
  return Math.round(active.reduce((sum, c) => {
    const raw    = +g[c.key] || 0
    const maxRaw = c.max_score || 1
    return sum + (raw / maxRaw) * c.weight
  }, 0))
}

export const getLetter     = (t, scale) => { for (const s of scale) if (t >= s.min && t <= s.max) return s.letter;       return 'F'  }
export const getGPA        = (t, scale) => { for (const s of scale) if (t >= s.min && t <= s.max) return s.gpa;          return 0    }
export const getGradeLetter = (t, scale) => { for (const s of scale) if (t >= s.min && t <= s.max) return s.letter || '--'; return '--' }
export const getGradeRemark = (t, scale) => { for (const s of scale) if (t >= s.min && t <= s.max) return s.remark || ''; return ''  }

// ── DATE / FORMAT HELPERS ──────────────────────────────────────
export const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
  : '--'

export const csvEscape = v => {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (/^[=+\-@]/.test(s)) s = "'" + s
  return s.replace(/"/g, '""')
}

// ── CURRENCY HELPERS ───────────────────────────────────────────
export const getCurrency = settings => {
  const base = CURRENCIES.find(c => c.code === (settings?.currency_code || 'GHS')) || CURRENCIES[0]
  return {
    ...base,
    position: settings?.currency_position || base.position,
    decimals: settings?.currency_decimals ?? base.decimals,
  }
}

export const fmtMoney = (n, currency) => {
  const c        = currency || CURRENCIES[0]
  const decimals = c.decimals ?? 2
  const formatted = Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return c.position === 'after' ? `${formatted} ${c.symbol}` : `${c.symbol}${formatted}`
}

// ── ID GENERATORS ──────────────────────────────────────────────
export const genSID = arr => {
  const max = arr.reduce((m, s) => Math.max(m, parseInt(s.student_id?.split('-')[1] || 0)), 0)
  return `STU-${String(max + 1).padStart(4, '0')}`
}

export const genRCP = arr => {
  const max = arr.filter(f => f.receipt_no)
    .reduce((m, f) => Math.max(m, parseInt(f.receipt_no?.split('-')[1] || 0)), 0)
  return `RCP-${String(max + 1).padStart(4, '0')}`
}

// ── YEAR HELPERS ───────────────────────────────────────────────
export function generateYears(centerYear) {
  const base = centerYear
    ? parseInt(centerYear.replace(/[^0-9]/g, '').slice(0, 4))
    : new Date().getFullYear()
  const years = []
  for (let y = base - 3; y <= base + 3; y++) years.push(`${y}/${y + 1}`)
  return years
}

export function currentYearFromSettings(settings) {
  return settings?.academic_year
    ? settings.academic_year.replace('-', '/')
    : `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
}

// ── HOLIDAY / VACATION HELPERS ─────────────────────────────────
export function getHolidayOnDate(dateStr, customHolidays = []) {
  if (!dateStr) return null
  const d      = new Date(dateStr + 'T00:00:00')
  const m      = d.getMonth() + 1
  const day    = d.getDate()
  const custom = customHolidays.find(h => h.date === dateStr)
  if (custom) return custom.name
  const gh = GHANA_PUBLIC_HOLIDAYS.find(h => h.month === m && h.day === day)
  if (gh) return gh.name
  return null
}

export function getVacationOnDate(dateStr, vacations = [], academicYear) {
  if (!dateStr) return null
  const vacs = vacations.filter(v => v.academic_year === academicYear)
  const v    = vacs.find(v => dateStr >= v.start_date && dateStr <= v.end_date)
  return v ? v.name : null
}

// ── ANNOUNCEMENT VISIBILITY ────────────────────────────────────
export function canSeeAnnouncement(role, ann) {
  if (!ann.active) return false
  if (ann.target_role === 'all')     return true
  if (ann.target_role === 'admin')   return role === 'superadmin' || role === 'admin'
  if (ann.target_role === 'teacher') return role === 'classteacher' || role === 'teacher'
  return false
}
