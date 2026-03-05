import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

import G from './modules/styles/global'
import { useIsMobile } from './modules/lib/hooks'
import { ROLE_META } from './modules/lib/constants'
import { currentYearFromSettings, generateYears } from './modules/lib/helpers'

import Sidebar, { YearSwitcher } from './modules/layout/Sidebar'

import Spinner  from './modules/components/Spinner'
import Btn      from './modules/components/Btn'
import Toast    from './modules/components/Toast'
import Modal    from './modules/components/Modal'
import Field    from './modules/components/Field'
import Avatar   from './modules/components/Avatar'
import LoadingScreen from './modules/components/LoadingScreen'

import Login          from './modules/pages/Login'
import ResetPassword  from './modules/pages/ResetPassword'
import SchoolSetup    from './modules/pages/SchoolSetup'
import Dashboard      from './modules/pages/Dashboard'
import Students       from './modules/pages/Students'
import Classes        from './modules/pages/Classes'
import Grades         from './modules/pages/Grades'
import Attendance     from './modules/pages/Attendance'
import Fees           from './modules/pages/Fees'
import Behaviour      from './modules/pages/Behaviour'
import Reports        from './modules/pages/Reports'
import Announcements  from './modules/pages/Announcements'
import Users          from './modules/pages/Users'
import MyProfile      from './modules/pages/MyProfile'
import AuditLog       from './modules/pages/AuditLog'
import Settings       from './modules/pages/Settings'

export default function App() {
  const [session,setSession]       = useState(null)
  const [profile,setProfile]       = useState(null)
  const [isRecovery,setIsRecovery] = useState(false)
  const [settings,setSettings]     = useState(null)
  const [data,setData]             = useState({
    students:[],classes:[],subjects:[],grades:[],attendance:[],
    fees:[],payments:[],behaviour:[],announcements:[],enrolments:[],users:[],
  })
  const [page,setPage]             = useState('dashboard')
  const [feeFilter,setFeeFilter]   = useState('')
  const [collapsed,setCollapsed]   = useState(false)
  const [loading,setLoading]       = useState(true)
  const [toast,setToast]           = useState(null)
  const [drawerOpen,setDrawerOpen] = useState(false)
  const [isDark,setIsDark]         = useState(() => {
    try { const s = localStorage.getItem('srms-theme'); return s ? s === 'dark' : true } catch { return true }
  })
  const [selectedYear,setSelectedYear]   = useState(null)
  const [newYearModal,setNewYearModal]   = useState(false)
  const [newYearStep,setNewYearStep]     = useState(1)
  const [newYearTarget,setNewYearTarget] = useState('')
  const [newYearWorking,setNewYearWorking] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    document.body.classList.toggle('light', !isDark)
    try { localStorage.setItem('srms-theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const hash = window.location.hash
      if (hash.includes('type=recovery') && session) setIsRecovery(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { setDrawerOpen(false) }, [page])

  const loadData = useCallback(async (yr, prof, settingsRow) => {
    const year = yr || currentYearFromSettings(settingsRow)
    const [
      { data: students }, { data: classes }, { data: subjects },
      { data: grades }, { data: attendance }, { data: fees },
      { data: payments }, { data: behaviour }, { data: announcements },
      { data: enrolments }, { data: users },
    ] = await Promise.all([
      supabase.from('students').select('*').eq('school_id', prof?.school_id).order('student_id'),
      supabase.from('classes').select('*').eq('school_id', prof?.school_id).order('name'),
      supabase.from('subjects').select('*').eq('school_id', prof?.school_id).order('name'),
      supabase.from('grades').select('*').eq('school_id', prof?.school_id).eq('year', year),
      supabase.from('attendance').select('*').eq('school_id', prof?.school_id).eq('academic_year', year).order('date', { ascending: false }),
      supabase.from('fees').select('*').eq('school_id', prof?.school_id).eq('academic_year', year),
      supabase.from('payments').select('*').eq('school_id', prof?.school_id).eq('academic_year', year).order('created_at', { ascending: false }),
      supabase.from('behaviour').select('*').eq('school_id', prof?.school_id).eq('academic_year', year).order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').eq('school_id', prof?.school_id).eq('academic_year', year).order('created_at', { ascending: false }),
      supabase.from('student_year_enrolment').select('*').eq('school_id', prof?.school_id).eq('academic_year', year),
      supabase.from('profiles').select('*').eq('school_id', prof?.school_id),
    ])
    setData({
      students: students || [], classes: classes || [], subjects: subjects || [],
      grades: grades || [], attendance: attendance || [], fees: fees || [],
      payments: payments || [], behaviour: behaviour || [], announcements: announcements || [],
      enrolments: enrolments || [], users: users || [],
    })
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); setLoading(false); return }
    setLoading(true)
    const loadAll = async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()

      // Handle missing profile (edge case: signup upsert failed)
      let resolvedProf = prof
      if (!prof && session?.user) {
        const metaRole = session.user.user_metadata?.role || 'superadmin'
        const { data: newProf } = await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          role: metaRole,
          locked: false,
        }).select().single()
        resolvedProf = newProf
      }
      setProfile(resolvedProf)

      // Only fetch settings once we have a confirmed school_id
      let settingsRow = null
      if (resolvedProf?.school_id) {
        const { data, error } = await supabase.from('settings').select('*').eq('school_id', resolvedProf.school_id).single()
        if (!error && data) {
          settingsRow = data
        } else {
          // Retry once — occasional RLS latency on first login
          const { data: retry } = await supabase.from('settings').select('*').eq('school_id', resolvedProf.school_id).single()
          settingsRow = retry || null
        }
      }
      setSettings(settingsRow)

      await loadData(selectedYear, resolvedProf, settingsRow)
      setLoading(false)
    }
    loadAll()
  }, [session])

  useEffect(() => {
    if (!session || !settings || !profile) return
    loadData(selectedYear, profile, settings)
  }, [selectedYear])

  const logout = async () => { await supabase.auth.signOut(); setPage('dashboard') }

  const confirmNewYear = async () => {
    if (!newYearTarget) return
    setNewYearWorking(true)
    try {
      await supabase.from('attendance').update({ academic_year: activeYear }).is('academic_year', null).eq('school_id', profile.school_id)
      await supabase.from('fees').update({ academic_year: activeYear }).is('academic_year', null).eq('school_id', profile.school_id)
      await supabase.from('behaviour').update({ academic_year: activeYear }).is('academic_year', null).eq('school_id', profile.school_id)
      await supabase.from('announcements').update({ academic_year: activeYear }).is('academic_year', null).eq('school_id', profile.school_id)
      await supabase.from('grades').update({ year: activeYear }).is('year', null).eq('school_id', profile.school_id)

      const activeStudents = data.students.filter(s => !s.archived && s.class_id)
      if (activeStudents.length > 0) {
        const enrolmentRows = activeStudents.map(s => ({ school_id: profile.school_id, student_id: s.id, class_id: s.class_id, academic_year: activeYear }))
        await supabase.from('student_year_enrolment').delete().eq('school_id', profile.school_id).eq('academic_year', activeYear)
        await supabase.from('student_year_enrolment').insert(enrolmentRows)
      }

      const outstanding = data.fees.filter(f => Number(f.amount || 0) - Number(f.paid || 0) > 0)
      if (outstanding.length > 0) {
        const arrearRows = outstanding.map(f => ({
          school_id: profile.school_id,
          student_id: f.student_id,
          fee_type: f.fee_type + ' (Arrears from ' + activeYear + ')',
          amount: Number(f.amount || 0) - Number(f.paid || 0),
          paid: 0, academic_year: newYearTarget, is_arrear: true, arrear_from_year: activeYear,
        }))
        await supabase.from('fees').insert(arrearRows)
      }

      await supabase.from('students').update({ entry_year: activeYear }).is('entry_year', null).eq('school_id', profile.school_id)
      await supabase.from('settings').update({ academic_year: newYearTarget }).eq('id', settings.id).eq('school_id', profile.school_id)

      setSettings(p => ({ ...p, academic_year: newYearTarget }))
      setSelectedYear(null)
      setNewYearModal(false)
      setNewYearStep(1)
      setNewYearTarget('')
      showToast('New academic year ' + newYearTarget + ' started successfully.')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setNewYearWorking(false)
  }

  // ── Early returns ──────────────────────────────────────────────
  if (isRecovery) return <><style>{G}</style><ResetPassword onDone={() => { setIsRecovery(false); setSession(null) }}/></>
  if (loading)    return <><style>{G}</style><LoadingScreen msg={session ? 'Loading your workspace...' : 'Initialising...'}/></>
  if (!session || !profile) return <><style>{G}</style><Login onLogin={p => setProfile(p)}/></>
  if (!profile.school_id)   return <><style>{G}</style><style>{`@keyframes srms-load{to{width:100%}}`}</style><SchoolSetup profile={profile} onComplete={async (schoolId) => { setLoading(true); const { data: prof } = await supabase.from('profiles').select('*').eq('id', profile.id).single(); const { data: settingsRow } = await supabase.from('settings').select('*').eq('school_id', schoolId).single(); setProfile(prof); setSettings(settingsRow); await loadData(null, prof, settingsRow); setLoading(false) }} onCancel={async () => { await supabase.auth.signOut(); setProfile(null) }}/></>

  const currentYear   = currentYearFromSettings(settings)
  const activeYear    = selectedYear || currentYear
  const isViewingPast = selectedYear && selectedYear !== currentYear
  const props = { profile, data, setData, toast: showToast, settings, activeYear, isViewingPast, reloadData: () => loadData(activeYear, profile, settings) }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard    {...props} onNav={setPage} onNavFees={filter => { setFeeFilter(filter); setPage('fees') }}/>
      case 'students':      return <Students     {...props}/>
      case 'classes':       return <Classes      {...props} onPromotionComplete={() => { setNewYearStep(2); setNewYearModal(true) }}/>
      case 'grades':        return <Grades       {...props}/>
      case 'attendance':    return <Attendance   {...props}/>
      case 'fees':          return <Fees         {...props} initialFeeFilter={feeFilter} onFilterConsumed={() => setFeeFilter('')}/>
      case 'behaviour':     return <Behaviour    {...props}/>
      case 'reports':       return <Reports      {...props}/>
      case 'announcements': return <Announcements {...props}/>
      case 'users':         return <Users        {...props}/>
      case 'settings':      return <Settings     profile={profile} settings={settings} setSettings={setSettings} toast={showToast} activeYear={activeYear} onStartNewYear={() => setNewYearModal(true)}/>
      case 'myprofile':     return <MyProfile    profile={profile} setProfile={setProfile} toast={showToast}/>
      case 'auditlog':      return <AuditLog     profile={profile}/>
      default:              return <Dashboard    {...props} onNav={setPage}/>
    }
  }

  const pageTitles = {
    dashboard:'Dashboard', students:'Students', classes:'Classes & Subjects',
    grades:'Grades', attendance:'Attendance', fees:'Fees', behaviour:'Behaviour',
    reports:'Reports', announcements:'Announcements', users:'Users',
    settings:'Settings', auditlog:'Audit Log', myprofile:'My Profile',
  }

  return (
    <>
      <style>{G}</style>
      <div className='grain' style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          profile={profile} active={page} onNav={setPage}
          collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
          onLogout={logout} isMobile={isMobile}
          drawerOpen={drawerOpen} onDrawerClose={() => setDrawerOpen(false)}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--ink)' }}>

          {/* ── Topbar ── */}
          {isMobile ? (
            <div style={{ flexShrink: 0, borderBottom: '1px solid var(--line)', background: 'var(--ink2)' }}>
              <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
                <button onClick={() => setDrawerOpen(true)} style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'var(--ink4)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0 }}>
                  <div style={{ width: 18, height: 1.5, background: 'var(--mist2)', borderRadius: 1 }}/>
                  <div style={{ width: 18, height: 1.5, background: 'var(--mist2)', borderRadius: 1 }}/>
                  <div style={{ width: 18, height: 1.5, background: 'var(--mist2)', borderRadius: 1 }}/>
                </button>
                <span className='d' style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{pageTitles[page] || 'SRMS'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setIsDark(d => !d)} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--ink4)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{isDark ? '☀' : '🌙'}</span>
                  </button>
                  <button onClick={() => setPage('myprofile')} title='My Profile' style={{ background: 'none', borderRadius: '50%', padding: 0, cursor: 'pointer', lineHeight: 0 }}>
                    <Avatar name={profile?.full_name} size={34} color={ROLE_META[profile?.role]?.bg}/>
                  </button>
                </div>
              </div>
              {/* Mobile year bar */}
              <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderTop: '1px solid var(--line)', background: isViewingPast ? 'rgba(251,159,58,0.06)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: 'var(--mist3)', letterSpacing: '0.06em' }}>{settings?.school_name || 'SRMS'}</span>
                <span style={{ color: 'var(--line2)', fontSize: 10 }}>.</span>
                {profile?.role === 'superadmin' ? (
                  <YearSwitcher activeYear={activeYear} currentYear={currentYear} selectedYear={selectedYear} setSelectedYear={setSelectedYear} isMobile={true}/>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--mist3)' }}>{activeYear}</span>
                )}
                {isViewingPast && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', background: 'rgba(251,159,58,0.12)', border: '1px solid rgba(251,159,58,0.3)', borderRadius: 3, padding: '1px 6px', letterSpacing: '0.06em' }}>READ ONLY</span>}
              </div>
            </div>
          ) : (
            <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: '1px solid var(--line)', background: 'var(--ink2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className='d' style={{ fontSize: 12, color: 'var(--mist3)', fontWeight: 500, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{settings?.school_name || 'SRMS'}</span>
                <span style={{ color: 'var(--line2)' }}>.</span>
                {profile?.role === 'superadmin' ? (
                  <YearSwitcher activeYear={activeYear} currentYear={currentYear} selectedYear={selectedYear} setSelectedYear={setSelectedYear} isMobile={false}/>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--mist3)' }}>{activeYear}</span>
                )}
                {isViewingPast && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'rgba(251,159,58,0.12)', border: '1px solid rgba(251,159,58,0.3)', borderRadius: 4, padding: '2px 8px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>READ ONLY</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={() => setPage('myprofile')} title='My Profile'
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', borderRadius: 'var(--r-sm)', padding: '4px 8px', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ink4)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Avatar name={profile?.full_name} size={30} color={ROLE_META[profile?.role]?.bg}/>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: 'var(--white)' }}>{profile?.full_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--mist3)' }}>{ROLE_META[profile?.role]?.label}</div>
                  </div>
                </button>
                <button onClick={() => setIsDark(d => !d)} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--ink4)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-dim)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--ink4)' }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{isDark ? '☀' : '🌙'}</span>
                </button>
                <Btn variant='ghost' size='sm' onClick={logout}>Sign Out</Btn>
              </div>
            </div>
          )}

          {/* ── Page content ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 36px' }}>
            {renderPage()}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} isMobile={isMobile}/>}

      {/* ── New Academic Year Modal ── */}
      {newYearModal && (
        <Modal title='Start New Academic Year' subtitle={`Closing ${activeYear}`} onClose={() => !newYearWorking && setNewYearModal(false)} width={560}>
          {newYearStep === 1 && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--mist2)', marginBottom: 20, lineHeight: 1.7 }}>
                Starting a new academic year will archive all current data under <strong style={{ color: 'var(--gold)' }}>{activeYear}</strong> and open a fresh year. All previous data remains fully accessible by switching the year in the topbar.
              </p>
              <div style={{ background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>What will happen</div>
                {[
                  ['Students',      'Active students carry over. Promoted/graduated students stay in their new class/archived status.'],
                  ['Grades',        'All grades are saved under ' + activeYear + '. New year starts with no grades.'],
                  ['Attendance',    'All attendance saved under ' + activeYear + '. New year starts fresh.'],
                  ['Fees',          'Outstanding balances carry over as arrears. Paid fees archived under ' + activeYear + '.'],
                  ['Behaviour',     'Records carry over — full history always visible.'],
                  ['Announcements', 'Current announcements archived. New year starts clean.'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', marginTop: 5, flexShrink: 0 }}/>
                    <div><strong style={{ fontSize: 13 }}>{title}</strong><span style={{ fontSize: 12, color: 'var(--mist2)', marginLeft: 8 }}>{desc}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(240,107,122,0.06)', border: '1px solid rgba(240,107,122,0.2)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--mist2)', marginBottom: 20 }}>
                (!) Make sure all promotions are complete before starting a new year. This cannot be undone.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <Btn variant='ghost' onClick={() => setNewYearModal(false)}>Cancel</Btn>
                <Btn onClick={() => setNewYearStep(2)}>Continue &rarr;</Btn>
              </div>
            </div>
          )}
          {newYearStep === 2 && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--mist2)', marginBottom: 16, lineHeight: 1.6 }}>Select the new academic year to open:</p>
              <Field label='New Academic Year' value={newYearTarget || ''} onChange={v => setNewYearTarget(v)}
                options={generateYears(currentYear).filter(y => parseInt(y) > parseInt(currentYear)).map(y => ({ value: y, label: y }))}/>
              <p style={{ fontSize: 12, color: 'var(--mist3)', marginBottom: 20 }}>All existing data will be saved under <strong style={{ color: 'var(--gold)' }}>{activeYear}</strong>.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <Btn variant='ghost' onClick={() => setNewYearStep(1)}>&larr; Back</Btn>
                <Btn disabled={!newYearTarget} onClick={() => setNewYearStep(3)}>Review &rarr;</Btn>
              </div>
            </div>
          )}
          {newYearStep === 3 && (
            <div>
              <div style={{ background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 20, marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--mist3)', marginBottom: 8 }}>Closing</div>
                <div className='d' style={{ fontSize: 28, fontWeight: 700, color: 'var(--rose)', marginBottom: 16 }}>{activeYear}</div>
                <div style={{ fontSize: 18, color: 'var(--mist3)', marginBottom: 8 }}>Opening</div>
                <div className='d' style={{ fontSize: 28, fontWeight: 700, color: 'var(--emerald)' }}>{newYearTarget}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <Btn variant='ghost' onClick={() => setNewYearStep(2)}>&larr; Back</Btn>
                <Btn variant='danger' onClick={confirmNewYear} disabled={newYearWorking}>
                  {newYearWorking ? <><Spinner/> Processing...</> : 'Confirm — Start New Year'}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}