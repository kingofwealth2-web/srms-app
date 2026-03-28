import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { calcTotal, getGradeComponents, getLetter, fmtDate, fmtMoney, getCurrency, fullName } from '../lib/helpers'
import { STATUS_META } from '../lib/constants'
import { usePlan } from '../lib/hooks'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Card from '../components/Card'
import KPI from '../components/KPI'
import Spinner from '../components/Spinner'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'

// ── PARENT PORTAL ───────────────────────────────────────────────
export default function ParentPortal({ profile, onSignOut }) {
  const [isDark, setIsDark] = useState(() => {
    try { const s = localStorage.getItem('srms-theme'); return s ? s === 'dark' : true } catch { return true }
  })
  useEffect(() => {
    document.body.classList.toggle('light', !isDark)
    try { localStorage.setItem('srms-theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])
  const [loading, setLoading]           = useState(true)
  const [children, setChildren]         = useState([])   // student rows
  const [selectedId, setSelectedId]     = useState(null)
  const [tab, setTab]                   = useState('overview')

  // per-student data (fetched when selectedId changes)
  const [grades, setGrades]             = useState([])
  const [attendance, setAttendance]     = useState([])
  const [fees, setFees]                 = useState([])
  const [payments, setPayments]         = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [releases, setReleases]         = useState([])   // grade_releases rows
  const [settings, setSettings]         = useState(null)
  const [classes, setClasses]           = useState([])
  const [subjects, setSubjects]         = useState([])
  const [dataLoading, setDataLoading]   = useState(false)

  // ── Initial load: children + settings ────────────────────────
  useEffect(() => {
    const load = async () => {
      const schoolId = profile?.school_id
      if (!schoolId) { setLoading(false); return }

      const [
        { data: links },
        { data: settingsRow },
        { data: classRows },
        { data: subjectRows },
        { data: annRows },
        { data: releaseRows },
      ] = await Promise.all([
        supabase.from('parent_students').select('student_id').eq('parent_id', profile.id),
        supabase.from('settings').select('*').eq('school_id', schoolId).single(),
        supabase.from('classes').select('*').eq('school_id', schoolId),
        supabase.from('subjects').select('*').eq('school_id', schoolId),
        supabase.from('announcements').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(30),
        supabase.from('grade_releases').select('*').eq('school_id', schoolId),
      ])

      const studentIds = (links || []).map(l => l.student_id)
      let studentRows = []
      if (studentIds.length > 0) {
        const { data: studs } = await supabase.from('students').select('*').in('id', studentIds)
        studentRows = studs || []
      }

      setSettings(settingsRow)
      setClasses(classRows || [])
      setSubjects(subjectRows || [])
      setAnnouncements(annRows || [])
      setReleases(releaseRows || [])
      setChildren(studentRows)
      if (studentRows.length > 0) setSelectedId(studentRows[0].id)
      setLoading(false)
    }
    load()
  }, [profile])

  // ── Load per-student data when child switches ─────────────────
  useEffect(() => {
    if (!selectedId) return
    const load = async () => {
      setDataLoading(true)
      const [
        { data: gradeRows },
        { data: attRows },
        { data: feeRows },
        { data: payRows },
      ] = await Promise.all([
        supabase.from('grades').select('*').eq('student_id', selectedId),
        supabase.from('attendance').select('*').eq('student_id', selectedId).order('date', { ascending: false }),
        supabase.from('fees').select('*').eq('student_id', selectedId),
        supabase.from('payments').select('*').eq('student_id', selectedId).order('created_at', { ascending: false }),
      ])
      setGrades(gradeRows || [])
      setAttendance(attRows || [])
      setFees(feeRows || [])
      setPayments(payRows || [])
      setDataLoading(false)
    }
    load()
  }, [selectedId, profile?.school_id])

  const student    = children.find(c => c.id === selectedId)
  const currency   = getCurrency(settings)
  const periods    = settings?.period_type === 'term'
    ? Array.from({ length: settings?.period_count || 2 }, (_, i) => `Term ${i + 1}`)
    : Array.from({ length: settings?.period_count || 2 }, (_, i) => `Semester ${i + 1}`)
  const gradeComps = getGradeComponents(settings)
  const activeComps = gradeComps.filter(c => c.enabled)

  // ── Derived ───────────────────────────────────────────────────
  const isReleased = (year, period) =>
    releases.some(r => r.academic_year === year && r.period === period)

  const attSummary = (() => {
    const total   = attendance.length
    const present = attendance.filter(a => a.status === 'Present').length
    const absent  = attendance.filter(a => a.status === 'Absent').length
    const late    = attendance.filter(a => a.status === 'Late').length
    const rate    = total > 0 ? Math.round((present / total) * 100) : null
    return { total, present, absent, late, rate }
  })()

  const feeSummary = (() => {
    const totalCharged = fees.reduce((a, f) => a + Number(f.amount || 0), 0)
    const totalPaid    = payments.reduce((a, p) => a + Number(p.amount || 0), 0)
    const balance      = totalCharged - totalPaid
    return { totalCharged, totalPaid, balance }
  })()

  // released grade periods for this student
  const releasedYears = [...new Set(
    grades.filter(g => isReleased(g.year, g.period)).map(g => `${g.year}__${g.period}`)
  )].map(k => { const [year, period] = k.split('__'); return { year, period } })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <Spinner />
      <div style={{ fontSize: 13, color: 'var(--mist3)' }}>Loading portal...</div>
    </div>
  )

  // ── Plan gate: block portal if school's plan doesn't include parentPortal ──
  const planHook = usePlan(settings)
  if (!planHook.can('parentPortal')) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', padding: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <Btn variant='ghost' size='sm' onClick={onSignOut}>Sign Out</Btn>
      </div>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>🔒</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Portal Unavailable</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--white)', marginBottom: 10, letterSpacing: '-0.02em' }}>Parent Portal not active</h2>
        <p style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.7, marginBottom: 28 }}>
          {settings?.school_name || 'This school'} is not currently subscribed to a plan that includes the Parent Portal. Please contact the school for more information.
        </p>
        <Btn variant='ghost' onClick={onSignOut}>Sign Out</Btn>
      </div>
    </div>
  )

  if (children.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32 }}>👋</div>
      <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 700 }}>No children linked</div>
      <div style={{ fontSize: 14, color: 'var(--mist3)', textAlign: 'center', maxWidth: 320 }}>
        Your account hasn't been linked to any student records yet. Please contact the school office.
      </div>
      <Btn variant='ghost' onClick={onSignOut} style={{ marginTop: 8 }}>Sign Out</Btn>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>

      {/* ── Top bar ─────────────────────────────────────── */}
      <div style={{ background: 'var(--ink2)', borderBottom: '1px solid var(--line)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 30, background: 'var(--gold)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Clash Display',sans-serif", fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>S</div>
            <div>
              <div style={{ fontFamily: "'Clash Display',sans-serif", fontWeight: 700, fontSize: 14 }}>{settings?.school_name || 'SRMS'}</div>
              <div style={{ fontSize: 10, color: 'var(--mist3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Parent Portal</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setIsDark(d => !d)} title={isDark ? 'Light mode' : 'Dark mode'}
              style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', transition: 'all 0.2s', border: `1px solid ${isDark ? 'var(--line2)' : 'rgba(232,184,75,0.35)'}`, background: isDark ? 'var(--ink5)' : 'rgba(232,184,75,0.15)', padding: 0, flexShrink: 0 }}>
              <span style={{ position: 'absolute', left: 6, fontSize: 10, opacity: isDark ? 0.35 : 1, lineHeight: 1, top: '50%', transform: 'translateY(-50%)' }}>☀</span>
              <span style={{ position: 'absolute', right: 6, fontSize: 9, opacity: isDark ? 1 : 0.3, lineHeight: 1, top: '50%', transform: 'translateY(-50%)' }}>🌙</span>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: isDark ? 'var(--mist2)' : 'var(--gold)', position: 'absolute', top: 3, transition: 'transform 0.2s, background 0.2s', transform: isDark ? 'translateX(22px)' : 'translateX(2px)' }}/>
            </button>
            <Avatar name={profile?.full_name} size={30} />
            <Btn variant='ghost' size='sm' onClick={onSignOut}>Sign Out</Btn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>

        {/* ── Child switcher ───────────────────────────── */}
        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {children.map(c => {
              const cls = classes.find(cl => cl.id === c.class_id)
              const active = c.id === selectedId
              return (
                <button key={c.id} onClick={() => { setSelectedId(c.id); setTab('overview') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12,
                    background: active ? 'var(--gold-dim)' : 'var(--ink2)',
                    border: `1px solid ${active ? 'rgba(232,184,75,0.35)' : 'var(--line)'}`,
                    cursor: 'pointer', transition: 'all 0.15s' }}>
                  <Avatar name={fullName(c)} size={32} color={active ? 'var(--gold)' : undefined} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--gold)' : 'var(--white)' }}>{fullName(c)}</div>
                    <div style={{ fontSize: 11, color: 'var(--mist3)' }}>{cls?.name || 'No class'}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Student header card ──────────────────────── */}
        {student && (
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {student.photo
              ? <img src={student.photo} alt='' style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)', flexShrink: 0 }} />
              : <Avatar name={fullName(student)} size={56} />
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{fullName(student)}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--mist3)' }}>ID: <span style={{ color: 'var(--mist)', fontFamily: "'JetBrains Mono',monospace" }}>{student.student_id}</span></span>
                <span style={{ fontSize: 12, color: 'var(--mist3)' }}>Class: <span style={{ color: 'var(--mist)' }}>{classes.find(c => c.id === student.class_id)?.name || '—'}</span></span>
                {student.gender && <span style={{ fontSize: 12, color: 'var(--mist3)' }}>Gender: <span style={{ color: 'var(--mist)' }}>{student.gender}</span></span>}
                {student.dob && <span style={{ fontSize: 12, color: 'var(--mist3)' }}>DOB: <span style={{ color: 'var(--mist)' }}>{fmtDate(student.dob)}</span></span>}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab bar ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--ink2)', padding: 4, borderRadius: 10, border: '1px solid var(--line)', flexWrap: 'wrap' }}>
          {[
            { key: 'overview', label: 'Overview', icon: '◉' },
            { key: 'profile', label: 'Profile', icon: '👤' },
            { key: 'grades', label: 'Grades', icon: '📊' },
            { key: 'attendance', label: 'Attendance', icon: '📅' },
            { key: 'fees', label: 'Fees', icon: '💰' },
            { key: 'announcements', label: 'Announcements', icon: '📢' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, minWidth: 100, padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === t.key ? 'var(--ink4)' : 'transparent',
                color: tab === t.key ? 'var(--gold)' : 'var(--mist3)',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: "'Cabinet Grotesk',sans-serif" }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {dataLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>}

        {!dataLoading && (
          <>
            {/* ── OVERVIEW ───────────────────────────── */}
            {tab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                  <KPI label='Attendance Rate' value={attSummary.rate !== null ? `${attSummary.rate}%` : '—'}
                    color={attSummary.rate >= 80 ? 'var(--emerald)' : attSummary.rate >= 60 ? 'var(--amber)' : 'var(--rose)'} />
                  <KPI label='Days Present' value={attSummary.present} color='var(--emerald)' />
                  <KPI label='Days Absent' value={attSummary.absent} color='var(--rose)' />
                  <KPI label='Fee Balance' value={fmtMoney(feeSummary.balance, currency)}
                    color={feeSummary.balance <= 0 ? 'var(--emerald)' : 'var(--rose)'} />
                </div>

                {/* Recent attendance */}
                <Card style={{ marginBottom: 16 }}>
                  <SectionTitle>Recent Attendance</SectionTitle>
                  {attendance.length === 0
                    ? <p style={{ fontSize: 13, color: 'var(--mist3)', padding: '12px 0' }}>No attendance records yet.</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {attendance.slice(0, 8).map((a, i) => {
                          const m = STATUS_META[a.status] || {}
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--ink3)', borderRadius: 8 }}>
                              <span style={{ fontSize: 13, color: 'var(--mist)' }}>{fmtDate(a.date)}</span>
                              <Badge color={m.color} bg={m.bg}>{a.status}</Badge>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </Card>

                {/* Recent announcements */}
                <Card>
                  <SectionTitle>Latest Announcements</SectionTitle>
                  {announcements.length === 0
                    ? <p style={{ fontSize: 13, color: 'var(--mist3)', padding: '12px 0' }}>No announcements.</p>
                    : announcements.slice(0, 3).map((a, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--mist3)' }}>{fmtDate(a.created_at)}</div>
                      </div>
                    ))
                  }
                </Card>
              </div>
            )}

            {/* ── PROFILE ────────────────────────────── */}
            {tab === 'profile' && student && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card>
                  <SectionTitle>Personal Information</SectionTitle>
                  <ProfileRow label='Full Name'    value={fullName(student)} />
                  <ProfileRow label='Student ID'   value={student.student_id} mono />
                  <ProfileRow label='Date of Birth' value={fmtDate(student.dob)} />
                  <ProfileRow label='Gender'       value={student.gender} />
                  <ProfileRow label='Class'        value={classes.find(c => c.id === student.class_id)?.name} />
                  <ProfileRow label='Phone'        value={student.phone} />
                  <ProfileRow label='Email'        value={student.email} />
                  <ProfileRow label='Address'      value={student.address} />
                  {student.medical_info && <ProfileRow label='Medical Notes' value={student.medical_info} />}
                </Card>
                <Card>
                  <SectionTitle>Guardian Information</SectionTitle>
                  <ProfileRow label='Guardian Name'     value={student.guardian_name} />
                  <ProfileRow label='Relationship'      value={student.guardian_relation} />
                  <ProfileRow label='Guardian Phone'    value={student.guardian_phone} />
                  <ProfileRow label='Guardian Email'    value={student.guardian_email} />
                  <div style={{ marginTop: 20 }}>
                    <SectionTitle>Enrolment</SectionTitle>
                    <ProfileRow label='Entry Year'       value={student.entry_year} />
                    <ProfileRow label='Status'           value={student.archived ? 'Archived' : 'Active'} />
                    {student.archived && <ProfileRow label='Leaving Reason' value={student.leaving_reason} />}
                  </div>
                </Card>
              </div>
            )}

            {/* ── GRADES ─────────────────────────────── */}
            {tab === 'grades' && (
              <div>
                {releasedYears.length === 0 ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
                      <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Results Not Yet Available</div>
                      <div style={{ fontSize: 14, color: 'var(--mist3)', maxWidth: 340, margin: '0 auto', lineHeight: 1.7 }}>
                        Grade results for your child will be made available by the school at the end of each academic period. Check back after results day.
                      </div>
                    </div>
                  </Card>
                ) : (
                  releasedYears.map(({ year, period }) => {
                    const periodGrades = grades.filter(g => g.year === year && g.period === period)
                    const scale = settings?.grading_scale || []
                    if (periodGrades.length === 0) return null
                    const totals = periodGrades.map(g => calcTotal(g, gradeComps)).filter(t => t !== null)
                    const avg = totals.length ? Math.round(totals.reduce((a,b)=>a+b,0)/totals.length*10)/10 : null
                    const avgLetter = avg !== null ? getLetter(avg, scale) : '—'
                    const avgColor = avg >= 80 ? 'var(--emerald)' : avg >= 60 ? 'var(--sky)' : avg >= 50 ? 'var(--amber)' : 'var(--rose)'
                    return (
                      <Card key={`${year}-${period}`} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <SectionTitle style={{ margin: 0 }}>{year} — {period}</SectionTitle>
                          <Badge color='var(--emerald)' bg='rgba(45,212,160,0.1)'>✓ Released</Badge>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                          <div style={{ background: 'var(--ink3)', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: avgColor, fontFamily: "'Clash Display',sans-serif" }}>{avg ?? '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Average</div>
                          </div>
                          <div style={{ background: 'var(--ink3)', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--white)', fontFamily: "'Clash Display',sans-serif" }}>{avgLetter}</div>
                            <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grade</div>
                          </div>
                          <div style={{ background: 'var(--ink3)', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', fontFamily: "'Clash Display',sans-serif" }}>{periodGrades.length}</div>
                            <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subjects</div>
                          </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--line)' }}>
                                <th style={thStyle}>Subject</th>
                                {activeComps.map(comp => <th key={comp.key} style={{ ...thStyle, color: 'var(--mist2)', textAlign: 'center' }}>{comp.label}</th>)}
                                <th style={{ ...thStyle, color: 'var(--white)', textAlign: 'center' }}>Total</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {periodGrades.map(g => {
                                const subj = subjects.find(s => s.id === g.subject_id)
                                const total = calcTotal(g, gradeComps)
                                const letter = getLetter(total, scale)
                                const gradeColor = total >= 80 ? 'var(--emerald)' : total >= 60 ? 'var(--sky)' : total >= 50 ? 'var(--amber)' : 'var(--rose)'
                                const gradeBg = total >= 80 ? 'rgba(45,212,160,0.1)' : total >= 60 ? 'rgba(91,168,245,0.1)' : total >= 50 ? 'rgba(251,159,58,0.1)' : 'rgba(240,107,122,0.1)'
                                return (
                                  <tr key={g.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--white)' }}>{subj?.name || '—'}</td>
                                    {activeComps.map(comp => <td key={comp.key} style={{ ...tdStyle, color: 'var(--mist3)', textAlign: 'center' }}>{g[comp.key] ?? '—'}</td>)}
                                    <td style={{ ...tdStyle, fontWeight: 700, color: gradeColor, textAlign: 'center' }}>{total !== null ? total.toFixed(1) : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                      <Badge color={gradeColor} bg={gradeBg}>{letter}</Badge>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            )}

            {/* ── ATTENDANCE ─────────────────────────── */}
            {tab === 'attendance' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <KPI label='Total Days' value={attSummary.total} />
                  <KPI label='Present' value={attSummary.present} color='var(--emerald)' />
                  <KPI label='Absent' value={attSummary.absent} color='var(--rose)' />
                  <KPI label='Late' value={attSummary.late} color='var(--amber)' />
                  {attSummary.rate !== null && (
                    <KPI label='Attendance Rate' value={`${attSummary.rate}%`}
                      color={attSummary.rate >= 80 ? 'var(--emerald)' : attSummary.rate >= 60 ? 'var(--amber)' : 'var(--rose)'} />
                  )}
                </div>
                <Card>
                  <SectionTitle>Attendance History</SectionTitle>
                  {attendance.length === 0
                    ? <p style={{ fontSize: 13, color: 'var(--mist3)', padding: '12px 0' }}>No attendance records found.</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {attendance.map((a, i) => {
                          const m = STATUS_META[a.status] || {}
                          const cls = classes.find(c => c.id === a.class_id)
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--ink3)', borderRadius: 8 }}>
                              <span style={{ fontSize: 13, color: 'var(--mist)', minWidth: 80 }}>{fmtDate(a.date)}</span>
                              {cls && <span style={{ fontSize: 12, color: 'var(--mist3)', flex: 1 }}>{cls.name}</span>}
                              <Badge color={m.color} bg={m.bg}>{a.status}</Badge>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </Card>
              </div>
            )}

            {/* ── FEES ───────────────────────────────── */}
            {tab === 'fees' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <KPI label='Total Charged' value={fmtMoney(feeSummary.totalCharged, currency)} />
                  <KPI label='Total Paid' value={fmtMoney(feeSummary.totalPaid, currency)} color='var(--emerald)' />
                  <KPI label='Outstanding Balance' value={fmtMoney(feeSummary.balance, currency)}
                    color={feeSummary.balance <= 0 ? 'var(--emerald)' : 'var(--rose)'} />
                </div>
                <Card style={{ marginBottom: 16 }}>
                  <SectionTitle>Fee Schedule</SectionTitle>
                  {fees.length === 0
                    ? <p style={{ fontSize: 13, color: 'var(--mist3)', padding: '12px 0' }}>No fee records found.</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {fees.map((fee, i) => {
                          const paid    = payments.filter(p => p.fee_id === fee.id).reduce((a, p) => a + Number(p.amount || 0), 0)
                          const balance = Number(fee.amount || 0) - paid
                          const isPaid  = balance <= 0
                          return (
                            <div key={i} style={{ padding: '14px', background: 'var(--ink3)', borderRadius: 10, border: `1px solid ${isPaid ? 'rgba(45,212,160,0.15)' : 'var(--line)'}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{fee.fee_type || 'Fee'}</div>
                                <Badge color={isPaid ? 'var(--emerald)' : 'var(--rose)'} bg={isPaid ? 'rgba(45,212,160,0.1)' : 'rgba(240,107,122,0.1)'}>
                                  {isPaid ? 'Paid' : 'Outstanding'}
                                </Badge>
                              </div>
                              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--mist3)' }}>
                                <span>Charged: <span style={{ color: 'var(--mist)' }}>{fmtMoney(fee.amount, currency)}</span></span>
                                <span>Paid: <span style={{ color: 'var(--emerald)' }}>{fmtMoney(paid, currency)}</span></span>
                                {!isPaid && <span>Balance: <span style={{ color: 'var(--rose)' }}>{fmtMoney(balance, currency)}</span></span>}
                              </div>
                              {fee.year && <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 6 }}>{fee.year}{fee.period ? ` · ${fee.period}` : ''}</div>}
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </Card>
                {payments.length > 0 && (
                  <Card>
                    <SectionTitle>Payment History</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {payments.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--ink3)', borderRadius: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--mist3)', minWidth: 100 }}>{fmtDate(p.created_at)}</span>
                          <span style={{ fontSize: 12, color: 'var(--mist3)', flex: 1, fontFamily: "'JetBrains Mono',monospace" }}>{p.receipt_no || '—'}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--emerald)' }}>{fmtMoney(p.amount, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ── ANNOUNCEMENTS ──────────────────────── */}
            {tab === 'announcements' && (
              <div>
                {announcements.length === 0
                  ? <Card><p style={{ fontSize: 13, color: 'var(--mist3)', padding: '12px 0' }}>No announcements at this time.</p></Card>
                  : announcements.map((a, i) => (
                    <Card key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ fontFamily: "'Clash Display',sans-serif", fontWeight: 700, fontSize: 16 }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--mist3)', flexShrink: 0, marginLeft: 12 }}>{fmtDate(a.created_at)}</div>
                      </div>
                      {a.body && <div style={{ fontSize: 14, color: 'var(--mist)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{a.body}</div>}
                    </Card>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────
function ProfileRow({ label, value, mono }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: 90, flexShrink: 0, paddingTop: 1, fontFamily: "'Clash Display',sans-serif" }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--mist)', flex: 1, fontFamily: mono ? "'JetBrains Mono',monospace" : undefined }}>{value}</div>
    </div>
  )
}

const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--mist3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Clash Display',sans-serif", whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', fontSize: 13, color: 'var(--mist2)' }

function ordinal(n) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return s[(v-20)%10] || s[v] || s[0]
}