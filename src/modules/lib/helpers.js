import { CURRENCIES, GHANA_PUBLIC_HOLIDAYS, LETTER_COLOR, NUMBER_GRADE_COLOR } from './constants'

// ── PAGINATION ──────────────────────────────────────────────────
// PostgREST caps any unbounded select at its default max-rows (1000) and silently
// returns only a partial, arbitrarily-ordered slice once a table passes that.
// queryFactory must return a *fresh* query builder each call (not an already-awaited
// one) so each page can apply its own .range().
export async function fetchAllRows(queryFactory) {
  const PAGE_SIZE = 1000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await queryFactory().range(from, from + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    if (data?.length) all = all.concat(data)
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { data: all }
}

// queryFactory must NOT already call .order() -- this function owns ordering,
// since it needs to filter on the same column it orders by ('id > lastId').
// Only safe for a unique, sequential column such as a primary key 'id'.
export async function fetchAllRowsByCursor(queryFactory, cursorCol = 'id') {
  const PAGE_SIZE = 1000
  let all = []
  let lastCursor = null
  while (true) {
    let q = queryFactory().order(cursorCol, { ascending: true }).limit(PAGE_SIZE)
    if (lastCursor !== null) q = q.gt(cursorCol, lastCursor)
    const { data, error } = await q
    if (error) return { data: null, error }
    if (data?.length) {
      all = all.concat(data)
      lastCursor = data[data.length - 1][cursorCol]
    }
    if (!data || data.length < PAGE_SIZE) break
  }
  return { data: all }
}

// ── ATTENDANCE HELPERS ──────────────────────────────────────────
// Folds "opening balance" rows (a pre-tracking historical present/total
// aggregate, entered once by a superadmin -- see Settings > Opening
// Attendance Balance) into a real attendance-record rate calculation.
// Both args should already be filtered to the same scope by the caller
// (e.g. both filtered to one student, or both filtered to one class).
export function calcAttendanceRate(records, openingBalances = []) {
  const obTotal   = openingBalances.reduce((sum, b) => sum + (b.total_days || 0), 0)
  const obPresent = openingBalances.reduce((sum, b) => sum + (b.present_days || 0), 0)
  const present = records.filter(a => a.status === 'Present').length + obPresent
  const absent  = records.filter(a => a.status === 'Absent').length
  const late    = records.filter(a => a.status === 'Late').length
  const excused = records.filter(a => a.status === 'Excused').length
  const total   = records.length + obTotal
  const rate    = total ? Math.round(present / total * 100) : null
  return { total, present, absent, late, excused, rate }
}

// ── GRADE HELPERS ──────────────────────────────────────────────
export const ALL_COMPONENTS = ['classwork','homework','midsemester','final_exam','project']

export const DEFAULT_GRADING_SCALE = [
  {min:80, max:100, letter:'A', gpa:4.0, remark:'Excellent'},
  {min:65, max:79,  letter:'B', gpa:3.0, remark:'Very Good'},
  {min:50, max:64,  letter:'C', gpa:2.0, remark:'Good'},
  {min:0,  max:49,  letter:'F', gpa:0.0, remark:'Fail'},
]

export const DEFAULT_NUMBER_GRADING_SCALE = [
  {min:90, max:100, letter:'1', gpa:4.0, remark:'Excellent'},
  {min:80, max:89,  letter:'2', gpa:3.5, remark:'Very Good'},
  {min:70, max:79,  letter:'3', gpa:3.0, remark:'Good'},
  {min:60, max:69,  letter:'4', gpa:2.5, remark:'Credit'},
  {min:50, max:59,  letter:'5', gpa:2.0, remark:'Credit'},
  {min:45, max:49,  letter:'6', gpa:1.5, remark:'Pass'},
  {min:35, max:44,  letter:'7', gpa:1.0, remark:'Weak Pass'},
  {min:0,  max:34,  letter:'8', gpa:0.0, remark:'Fail'},
]

// Returns the right color for a grade value based on grade system
export const getGradeColor = (grade, gradeSystem) => {
  if (!grade || grade === '--') return 'var(--mist2)'
  if (gradeSystem === 'number') return NUMBER_GRADE_COLOR[String(grade)] || 'var(--mist2)'
  return LETTER_COLOR[grade] || 'var(--mist2)'
}

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
  if (!active.length) return null
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

// Pass/fail derived from the school's own configured scale rather than a fixed
// number -- the lowest-min tier is always the fail band, whatever range that
// covers (e.g. the Number system's default scale fails below 35, not 50).
export const isPassing = (score, scale) => {
  if (score === null || score === undefined || !scale?.length) return null
  const lowest = [...scale].sort((a, b) => a.min - b.min)[0]
  return score > lowest.max
}

// Ranks by average (not raw summed total) so a student who's missing a grade
// in one subject isn't penalized against a fully-graded classmate just for
// having fewer numbers added up -- avg-rank and sum-rank agree once every
// student has a score for every subject, so this only changes anything during
// the "still entering grades" window, which is exactly when it was wrong.
// Students with no `avgKey` value at all are excluded from the ranking
// entirely (position: null) rather than being sorted to the bottom as if
// they'd scored zero.
export function rankByTotal(items, avgKey = 'avg') {
  const graded = items.filter(s => s[avgKey] !== null && s[avgKey] !== undefined)
  const ungraded = items.filter(s => s[avgKey] === null || s[avgKey] === undefined)
  graded.sort((a, b) => b[avgKey] - a[avgKey])
  let lastScore = null, lastRank = 0, seen = 0
  const ranked = graded.map(s => {
    seen++
    if (lastScore === null || s[avgKey] !== lastScore) { lastRank = seen; lastScore = s[avgKey] }
    return { ...s, position: lastRank }
  })
  return [...ranked, ...ungraded.map(s => ({ ...s, position: null }))]
}

// School progression, used only to order classes a school hasn't explicitly
// ordered itself. Earlier entries come first.
const CLASS_LEVELS = [
  'creche', 'crèche', 'nursery', 'pre-school', 'preschool', 'pre-k', 'prek',
  'kg', 'kindergarten',
  'basic', 'primary', 'class', 'grade', 'form',
  'jhs', 'j.h.s', 'js', 'junior',
  'shs', 's.h.s', 'sss', 'senior',
]

// Sort comparator for classes. An explicit sort_order always wins -- that is
// the school saying what its ladder looks like. Without one, fall back to
// school progression rather than plain alphabetical, which put "KG 1" after
// "BASIC 8" and "BASIC 10" before "BASIC 2". Unrecognised names keep their
// name order, after everything recognised.
export function compareClasses(a, b) {
  if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order
  if (a.sort_order != null) return -1
  if (b.sort_order != null) return 1
  const rank = c => {
    const name = (c.name || '').trim().toLowerCase()
    const level = CLASS_LEVELS.findIndex(l => name.startsWith(l))
    const num = parseInt((name.match(/\d+/) || [])[0], 10)
    return [level < 0 ? CLASS_LEVELS.length : level, Number.isNaN(num) ? 0 : num]
  }
  const [levelA, numA] = rank(a)
  const [levelB, numB] = rank(b)
  if (levelA !== levelB) return levelA - levelB
  if (numA !== numB) return numA - numB
  return (a.name || '').localeCompare(b.name || '')
}

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

// ── FEE HELPERS ─────────────────────────────────────────────────
// A fee's stored `paid` total and the actual sum of its payment transactions
// can drift apart (a "legacy" paid amount that predates a payment row, or a
// write that only updated one side) -- always trust whichever is higher
// rather than reading fee.paid directly, so every screen agrees on balance.
//
// allPaymentsOrIndex may be either the raw payments array (fine for a single
// one-off lookup) or a Map from buildPaymentsByFee() (fee_id -> summed
// amount). Pass the array only when checking one fee in isolation -- looping
// this over every fee with the raw array re-scans the whole payments table
// per fee (O(fees x payments)); build the index once with buildPaymentsByFee
// and pass that instead when computing this for many fees at once.
export function effectivePaid(fee, allPaymentsOrIndex) {
  const paymentsSum = allPaymentsOrIndex instanceof Map
    ? (allPaymentsOrIndex.get(fee.id) || 0)
    : allPaymentsOrIndex
        .filter(p => p.fee_id === fee.id)
        .reduce((a, p) => a + Number(p.amount || 0), 0)
  return Math.max(Number(fee.paid || 0), paymentsSum)
}

// Pre-sums payments by fee_id once (O(payments)) so effectivePaid() can be
// called in a loop over many fees at O(1) each, instead of O(payments) each.
export function buildPaymentsByFee(payments) {
  const map = new Map()
  for (const p of payments) {
    map.set(p.fee_id, (map.get(p.fee_id) || 0) + Number(p.amount || 0))
  }
  return map
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
export function getHolidayOnDate(dateStr, customHolidays = [], disabledHolidayIds = []) {
  if (!dateStr) return null
  const d      = new Date(dateStr + 'T00:00:00')
  const m      = d.getMonth() + 1
  const day    = d.getDate()
  const custom = customHolidays.find(h => h.date === dateStr)
  if (custom) return custom.name
  const gh = GHANA_PUBLIC_HOLIDAYS.find(h => h.month === m && h.day === day)
  if (gh && !disabledHolidayIds.includes(gh.id)) return gh.name
  return null
}

export function getVacationOnDate(dateStr, vacations = [], academicYear) {
  if (!dateStr) return null
  const vacs = vacations.filter(v => v.academic_year === academicYear)
  const v    = vacs.find(v => dateStr >= v.start_date && dateStr <= v.end_date)
  return v ? v.name : null
}

// ── NAME HELPERS ───────────────────────────────────────────────
// compact: First Last   (tables, dropdowns)
// full:    First Middle Last (profile, reports, cards)
export const fullName = (s, compact = false) => {
  if (!s) return ''
  const first  = s.first_name  || ''
  const middle = s.middle_name || ''
  const last   = s.last_name   || ''
  if (compact || !middle) return `${first} ${last}`.trim()
  return `${first} ${middle} ${last}`.trim()
}

// ── ANNOUNCEMENT VISIBILITY ────────────────────────────────────
export function canSeeAnnouncement(role, ann) {
  if (!ann.active) return false
  if (ann.target_role === 'all')     return true
  if (ann.target_role === 'admin')   return role === 'superadmin' || role === 'admin'
  if (ann.target_role === 'teacher') return role === 'classteacher' || role === 'teacher'
  return false
}