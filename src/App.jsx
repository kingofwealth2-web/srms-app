import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'

import G, { initScrollReveal } from './modules/styles/global'
import { useIsMobile, usePlan } from './modules/lib/hooks'
import PlanGate from './modules/components/PlanGate'
import { ROLE_META, NAV_ITEMS } from './modules/lib/constants'
import { currentYearFromSettings, generateYears } from './modules/lib/helpers'

import Sidebar, { YearSwitcher } from './modules/layout/Sidebar'

import Spinner  from './modules/components/Spinner'
import Btn      from './modules/components/Btn'
import Toast    from './modules/components/Toast'
import Modal    from './modules/components/Modal'
import Field    from './modules/components/Field'
import Avatar   from './modules/components/Avatar'
import LoadingScreen from './modules/components/LoadingScreen'

import Landing        from './modules/pages/Landing'
import Plans          from './modules/pages/Plans'
import ParentPortal   from './modules/pages/ParentPortal'
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
import FeedbackButton from './modules/components/FeedbackButton'

// ── Theme Toggle ────────────────────────────────────────────────
function ThemeToggle({ isDark, onToggle, size = 'md' }) {
  const w = size === 'sm' ? 44 : 52
  const h = size === 'sm' ? 24 : 28
  const d = h - 6
  return (
    <button onClick={onToggle} title={isDark ? 'Light mode' : 'Dark mode'} style={{
      width: w, height: h, borderRadius: h/2,
      background: isDark ? 'var(--ink5)' : 'rgba(232,184,75,0.15)',
      border: `1px solid ${isDark ? 'var(--line2)' : 'rgba(232,184,75,0.35)'}`,
      cursor: 'pointer', position: 'relative',
      transition: 'background var(--t), border-color var(--t)',
      flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 3px',
    }}>
      <span style={{ position: 'absolute', left: 7, fontSize: size==='sm'?10:11, opacity: isDark?0.35:1, transition: 'opacity 0.2s', lineHeight:1 }}>☀</span>
      <span style={{ position: 'absolute', right: 7, fontSize: size==='sm'?9:10, opacity: isDark?1:0.3, transition: 'opacity 0.2s', lineHeight:1 }}>🌙</span>
      <div style={{ width: d, height: d, borderRadius: '50%', background: isDark ? 'var(--mist2)' : 'var(--gold)', boxShadow: isDark ? 'none' : '0 2px 8px rgba(232,184,75,0.4)', transition: 'transform var(--t), background var(--t)', transform: isDark ? `translateX(${w - d - 6}px)` : 'translateX(0)' }}/>
    </button>
  )
}

// ── FORCE PASSWORD CHANGE ──────────────────────────────────────
function ForceChangePassword({ profile, onDone, onSignOut }) {
  const [newPass,setNewPass]   = useState('')
  const [confirm,setConfirm]   = useState('')
  const [saving,setSaving]     = useState(false)
  const [error,setError]       = useState('')
  const [showNew,setShowNew]   = useState(false)
  const [showCon,setShowCon]   = useState(false)
  const isMobile = useIsMobile()

  const submit = async () => {
    setError('')
    if (!newPass || !confirm)  { setError('Please fill in both fields.'); return }
    if (newPass.length < 8)    { setError('Password must be at least 8 characters.'); return }
    if (newPass !== confirm)   { setError('Passwords do not match.'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPass })
    setSaving(false)
    if (err) { setError(err.message); return }
    onDone()
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--ink)', padding:20 }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize:'40px 40px', opacity:0.25, maskImage:'radial-gradient(ellipse at center,black 40%,transparent 80%)' }}/>
      <div style={{ position:'relative', width:'100%', maxWidth:440 }} onKeyDown={e => { if (e.key === 'Enter') submit() }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:40 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 24px rgba(232,184,75,0.4)' }}>
            <span className="d" style={{ fontSize:20, fontWeight:700, color:'var(--ink)' }}>S</span>
          </div>
          <div>
            <div className="d" style={{ fontSize:18, fontWeight:700 }}>SRMS</div>
            <div style={{ fontSize:11, color:'var(--mist3)', marginTop:1 }}>Student Record Management System</div>
          </div>
        </div>

        <h1 className="d" style={{ fontSize:32, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:10 }}>Set your<br/>password.</h1>
        <p style={{ color:'var(--mist2)', fontSize:13, marginBottom:32, lineHeight:1.6 }}>
          Welcome, {profile?.full_name?.split(' ') || 'there'}. Your account was created by an administrator. Please choose your own password to continue.
        </p>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--mist2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontFamily:"'Clash Display',sans-serif" }}>New Password</div>
          <div style={{ position:'relative' }}>
            <input value={newPass} onChange={e => setNewPass(e.target.value)} type={showNew ? 'text' : 'password'} placeholder="Min. 8 characters"
              style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--line)', borderRadius:'var(--r-sm)', padding:'10px 42px 10px 14px', color:'var(--white)', fontSize:13, boxSizing:'border-box', outline:'none' }}
              onFocus={e => { e.target.style.borderColor='var(--gold)'; e.target.style.boxShadow='0 0 0 3px rgba(232,184,75,0.08)' }}
              onBlur={e  => { e.target.style.borderColor='var(--line)'; e.target.style.boxShadow='none' }}/>
            <button onClick={()=>setShowNew(v=>!v)} type="button" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--mist3)', fontSize:16, padding:0, lineHeight:1 }}>{showNew ? '🙈' : '👁'}</button>
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--mist2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontFamily:"'Clash Display',sans-serif" }}>Confirm Password</div>
          <div style={{ position:'relative' }}>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} type={showCon ? 'text' : 'password'} placeholder="Repeat your new password"
              style={{ width:'100%', background:'var(--ink3)', border:`1px solid ${confirm && confirm !== newPass ? 'var(--rose)' : 'var(--line)'}`, borderRadius:'var(--r-sm)', padding:'10px 42px 10px 14px', color:'var(--white)', fontSize:13, boxSizing:'border-box', outline:'none' }}
              onFocus={e => { e.target.style.borderColor=confirm && confirm !== newPass ? 'var(--rose)' : 'var(--gold)'; e.target.style.boxShadow='0 0 0 3px rgba(232,184,75,0.08)' }}
              onBlur={e  => { e.target.style.borderColor=confirm && confirm !== newPass ? 'var(--rose)' : 'var(--line)'; e.target.style.boxShadow='none' }}/>
            <button onClick={()=>setShowCon(v=>!v)} type="button" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--mist3)', fontSize:16, padding:0, lineHeight:1 }}>{showCon ? '🙈' : '👁'}</button>
          </div>
          {confirm && confirm !== newPass && <div style={{ fontSize:11, color:'var(--rose)', marginTop:5 }}>Passwords do not match</div>}
        </div>

        {newPass && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', gap:4, marginBottom:5 }}>
              {Array(4).fill().map((_, i) => {
                const s = newPass.length >= 12 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /[^A-Za-z0-9]/.test(newPass) ? 4
                  : newPass.length >= 10 && (/[A-Z]/.test(newPass) || /[0-9]/.test(newPass)) ? 3
                  : newPass.length >= 8 ? 2 : 1
                const col = s >= 4 ? 'var(--emerald)' : s >= 3 ? 'var(--sky)' : s >= 2 ? 'var(--amber)' : 'var(--rose)'
                return <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i < s ? col : 'var(--ink4)', transition:'background 0.2s' }}/>
              })}
            </div>
            <div style={{ fontSize:11, color:'var(--mist3)' }}>
              {newPass.length < 8 ? 'Too short' : newPass.length >= 12 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /[^A-Za-z0-9]/.test(newPass) ? 'Strong password 💪' : newPass.length >= 10 ? 'Good — try adding numbers or symbols' : 'Acceptable'}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background:'rgba(240,107,122,0.08)', border:'1px solid rgba(240,107,122,0.25)', borderRadius:'var(--r-sm)', padding:'11px 14px', fontSize:13, color:'var(--rose)', marginBottom:16 }}>{error}</div>
        )}

        <Btn onClick={submit} disabled={saving || !newPass || newPass !== confirm}
          style={{ width:'100%', justifyContent:'center', padding:13, fontSize:14, boxShadow: saving ? 'none' : '0 4px 20px rgba(232,184,75,0.25)' }}>
          {saving ? <><Spinner/> Saving...</> : 'Set Password & Continue →'}
        </Btn>

        <div style={{ marginTop:16, textAlign:'center' }}>
          <button onClick={onSignOut}
            style={{ background:'none', border:'none', color:'var(--mist3)', fontSize:12, cursor:'pointer', fontFamily:"'Cabinet Grotesk',sans-serif" }}>
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session,setSession]       = useState(null)
  const [showLanding,setShowLanding] = useState(true)
  const [showPlans,setShowPlans]     = useState(false)
  const [mustChangePw,setMustChangePw] = useState(false)
  const [lockedError,setLockedError]   = useState(false)
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
  const initialLoadDone = useRef(false)
  const planHook = usePlan(settings)
  const reloadSettings = useCallback(async () => {
    if (!profile?.school_id) return
    const { data } = await supabase.from('settings').select('*').eq('school_id', profile.school_id).single()
    if (data) setSettings(data)
  }, [profile?.school_id])

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
  const scrollObserverRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => {
      if (scrollObserverRef.current) scrollObserverRef.current.disconnect()
      scrollObserverRef.current = initScrollReveal()
    }, 80)
    return () => clearTimeout(t)
  }, [page])

  const loadData = useCallback(async (yr, prof, settingsRow) => {
    const year = yr || currentYearFromSettings(settingsRow)
    const [
      { data: students }, { data: classes }, { data: subjects },
      { data: enrolments }, { data: users },
    ] = await Promise.all([
      supabase.from('students').select('*').eq('school_id', prof?.school_id).order('student_id'),
      supabase.from('classes').select('*').eq('school_id', prof?.school_id).order('name'),
      supabase.from('subjects').select('*').eq('school_id', prof?.school_id).order('name'),
      supabase.from('student_year_enrolment').select('*').eq('school_id', prof?.school_id).eq('academic_year', year),
      supabase.from('profiles').select('*').eq('school_id', prof?.school_id),
    ])
    setData({
      students:      students  || [],
      classes:       classes   || [],
      subjects:      subjects  || [],
      grades:        [],
      attendance:    [],
      fees:          [],
      payments:      [],
      behaviour:     [],
      announcements: [],
      enrolments:    enrolments || [],
      users:         users     || [],
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
      if (resolvedProf?.locked) {
        await supabase.auth.signOut()
        setProfile(null); setSession(null); setLoading(false)
        setLockedError(true)
        return
      }
      if (resolvedProf?.must_change_password) setMustChangePw(true)

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
      initialLoadDone.current = true
      setLoading(false)
    }
    loadAll()
  }, [session])

  useEffect(() => {
    if (!session || !settings || !profile) return
    if (!initialLoadDone.current) return
    loadData(selectedYear, profile, settings)
  }, [selectedYear, loadData, profile, settings])

  const logout = async () => {
    await supabase.auth.signOut()
    setProfile(null); setSession(null); setPage('dashboard'); setShowLanding(false)
  }

  const confirmNewYear = async () => {
    if (!newYearTarget) return
    setNewYearWorking(true)
    const { error } = await supabase.functions.invoke('start-new-year', {
      body: {
        school_id: profile.school_id,
        old_year:  activeYear,
        new_year:  newYearTarget,
      }
    })
    setNewYearWorking(false)
    if (error) {
      showToast('Year transition failed: ' + error.message, 'error')
      return
    }
    setSettings(p => ({ ...p, academic_year: newYearTarget }))
    setSelectedYear(null)
    setNewYearModal(false)
    setNewYearStep(1)
    setNewYearTarget('')
    showToast('Academic year ' + newYearTarget + ' started successfully.')
  }

  // ── Early returns ──────────────────────────────────────────────
  if (isRecovery) return <><style>{G}</style><ResetPassword onDone={() => { setIsRecovery(false); setSession(null) }}/></>
  if (mustChangePw && session) return (
    <><style>{G}</style>
    <ForceChangePassword
      profile={profile}
      onDone={async () => {
        await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
        setProfile(p => ({ ...p, must_change_password: false }))
        setMustChangePw(false)
      }}
      onSignOut={async () => {
        await supabase.auth.signOut()
        setProfile(null); setSession(null); setMustChangePw(false); setShowLanding(false)
      }}
    />
    </>
  )

  if (loading)    return <><style>{G}</style><LoadingScreen msg={session ? 'Loading your workspace...' : 'Initialising...'}/></>
  if (showPlans)               return <><style>{G}</style><Plans   onEnter={() => { setShowPlans(false); setShowLanding(false) }} onBack={() => setShowPlans(false)} /></>
  if (showLanding && !session) return <Landing onEnter={() => setShowLanding(false)} onShowPlans={() => setShowPlans(true)}/>
  if (!session || !profile) return <><style>{G}</style><Login onLogin={p => setProfile(p)} lockedError={lockedError} onClearLockedError={() => setLockedError(false)} onBack={() => setShowLanding(true)}/></>
  if (!profile.school_id)   return <><style>{G}</style><style>{"@keyframes srms-load{to{width:100%}}"}</style><SchoolSetup profile={profile} onComplete={async (schoolId) => { setLoading(true); const { data: prof } = await supabase.from('profiles').select('*').eq('id', profile.id).single(); const { data: settingsRow } = await supabase.from('settings').select('*').eq('school_id', schoolId).single(); setProfile(prof); setSettings(settingsRow); await loadData(null, prof, settingsRow); setLoading(false) }} onCancel={async () => { await supabase.auth.signOut(); setProfile(null); setSession(null); setShowLanding(false) }}/></>

  if (!settings) return <><style>{G}</style><LoadingScreen msg="Loading settings..."/></>

  const currentYear   = currentYearFromSettings(settings)
  const activeYear    = selectedYear || currentYear
  const isViewingPast = !!(selectedYear && selectedYear !== currentYear)
    || planHook.status === 'cancelled_grace'
    || planHook.status === 'expiry_grace'

  // ── PARENT PORTAL GATING ─────────────────────────────────────────
  if (profile?.role === 'parent') {
    if (planHook.isExpired) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', padding: 20 }}>
          <style>{G}</style>
          <div style={{ position: 'absolute', top: 20, right: 28 }}>
            <Btn variant='ghost' size='sm' onClick={logout}>Sign out</Btn>
          </div>
          <PlanGate planHook={planHook} feature='parentPortal' mode='block'><></></PlanGate>
        </div>
      )
    }
    return <><style>{G}</style><ParentPortal profile={profile} settings={settings} onSignOut={logout}/></>  }
  // ─────────────────────────────────────────────────────────────────

  // ── EXPIRED / TRIAL ENDED SCREEN ─────────────────────────────────
  if (planHook.status === 'trial_expired' || planHook.status === 'expired' || planHook.status === 'cancelled_archived') {
    const isTrialExpired = planHook.status === 'trial_expired'
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', padding: 24, position: 'relative' }}>
        <style>{G}</style>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize: '40px 40px', opacity: 0.2 }}/>
        <div style={{ position: 'absolute', top: 20, right: 28, display: 'flex', gap: 10 }}>
          <Btn variant='ghost' size='sm' onClick={logout}>Sign out</Btn>
        </div>
        <div style={{ position: 'relative', maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px' }}>
            {planHook.status === 'cancelled_archived' ? '📦' : '⏰'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            {planHook.status === 'cancelled_archived' ? 'Account Archived' : isTrialExpired ? 'Trial Ended' : 'Plan Expired'}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12, color: 'var(--white)' }}>
            {planHook.status === 'cancelled_archived'
              ? 'Your data has been archived'
              : isTrialExpired
                ? 'Your 14-day trial has ended'
                : 'Your plan has expired'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--mist2)', lineHeight: 1.7, marginBottom: 32 }}>
            {planHook.status === 'cancelled_archived'
              ? 'Your subscription was cancelled and your data is now in read-only archive mode. Contact us to reactivate your account.'
              : isTrialExpired
                ? 'Thank you for trying SRMS. To continue managing your school\'s records, please get in touch to activate a paid plan.'
                : 'Your subscription has lapsed. Contact us to renew and restore full access to your school\'s data.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <a href='mailto:kofi.william2311@gmail.com' style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: 'var(--gold)', color: '#0b0b12', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'background 0.15s' }}>
              ✉ Email Us to Activate →
            </a>
            <a href='tel:+233536759120' style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'var(--ink4)', border: '1px solid var(--line2)', color: 'var(--white)', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s' }}>
              📞 0536 759 120
            </a>
            <div style={{ fontSize: 12, color: 'var(--mist3)', marginTop: 4 }}>
              {settings?.school_name && <span>{settings.school_name} · </span>}
              <span>{profile?.email}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  // ─────────────────────────────────────────────────────────────────

  const props = { profile, data, setData, toast: showToast, settings, activeYear, isViewingPast, reloadData: () => loadData(activeYear, profile, settings), onShowPlans: () => setShowPlans(true), reloadSettings }

  const renderPage = () => {
    const allowedPages = NAV_ITEMS[profile?.role] || []
    const personalPages = ['myprofile']
    const safePage = allowedPages.includes(page) || personalPages.includes(page) ? page : 'dashboard'
    switch (safePage) {
      case 'dashboard':     return <Dashboard    {...props} onNav={setPage} onNavFees={filter => { setFeeFilter(filter); setPage('fees') }}/>
      case 'students':      return <Students     {...props} planHook={planHook}/>
      case 'classes':       return <Classes      {...props} onPromotionComplete={() => { setNewYearStep(2); setNewYearModal(true) }}/>
      case 'grades':        return <Grades       {...props}/>
      case 'attendance':    return <Attendance   {...props}/>
      case 'fees':          return <Fees         {...props} planHook={planHook} initialFeeFilter={feeFilter} onFilterConsumed={() => setFeeFilter('')}/>
      case 'behaviour':     return <Behaviour    {...props} planHook={planHook}/>
      case 'reports':       return <Reports      {...props} planHook={planHook}/>
      case 'announcements': return <Announcements {...props} planHook={planHook}/>
      case 'users':         return <Users        {...props} planHook={planHook}/>
      case 'settings':      return <Settings     profile={profile} settings={settings} setSettings={setSettings} toast={showToast} activeYear={activeYear} onStartNewYear={() => setNewYearModal(true)}/>
      case 'myprofile':     return <MyProfile    profile={profile} setProfile={setProfile} toast={showToast}/>
      case 'auditlog':      return <AuditLog     {...props} planHook={planHook}/>
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
          planHook={planHook}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--ink)' }}>

          {/* ── Topbar ── */}
          {isMobile ? (
            <div className='srms-topbar' style={{ flexShrink: 0, background: 'var(--ink2)', borderBottom: '1px solid var(--line)' }}>
              <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', gap: 12 }}>
                <button onClick={() => setDrawerOpen(true)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ink4)', border: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0, transition: 'background var(--t-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ink5)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--ink4)'}
                >
                  {Array(3).fill().map((_, i) => <div key={i} style={{ width: 16, height: 1.5, background: 'var(--mist2)', borderRadius: 1 }}/>)}
                </button>
                <span className='d' style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', flex: 1, textAlign: 'center' }}>{pageTitles[page] || 'SRMS'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThemeToggle isDark={isDark} onToggle={() => setIsDark(d => !d)} size='sm'/>
                  <button onClick={() => setPage('myprofile')} style={{ background: 'none', borderRadius: '50%', cursor: 'pointer', lineHeight: 0 }}>
                    <Avatar name={profile?.full_name} size={32} color={ROLE_META[profile?.role]?.bg}/>
                  </button>
                </div>
              </div>
              <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderTop: '1px solid var(--line)', background: isViewingPast ? 'rgba(251,159,58,0.05)' : 'transparent' }}>
                <span style={{ fontSize: 10, color: 'var(--mist3)' }}>{settings?.school_name || 'SRMS'}</span>
                <span style={{ color: 'var(--line2)', fontSize: 10 }}>·</span>
                {profile?.role === 'superadmin'
                  ? planHook.can('yearSwitcher')
                    ? <YearSwitcher activeYear={activeYear} currentYear={currentYear} selectedYear={selectedYear} setSelectedYear={setSelectedYear} isMobile={true}/>
                    : <span onClick={() => setShowPlans(true)} style={{ fontSize: 10, color: 'var(--mist3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} title='Upgrade to use Year Switcher'>{activeYear} 🔒</span>
                  : <span style={{ fontSize: 10, color: 'var(--mist3)' }}>{activeYear}</span>}
                {isViewingPast && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', background: 'rgba(251,159,58,0.1)', border: '1px solid rgba(251,159,58,0.25)', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em' }}>READ ONLY</span>}
                {(
                  <>
                    <span style={{ color: 'var(--line2)', fontSize: 10 }}>·</span>
                    {(() => {
                      const planColors = { trial:'var(--sky)', starter:'var(--emerald)', basic:'var(--gold)', pro:'var(--amber)', lifetime:'var(--amber)' }
                      const rawPlan = planHook.rawPlan || 'trial'
                      const badgeKey = planHook.isLifetime ? 'lifetime' : rawPlan
                      const color = planColors[badgeKey] || 'var(--mist3)'
                      const mobileLabel = planHook.isLifetime ? 'Lifetime' : planHook.isTrialing ? `Trial · ${planHook.daysLeft}d` : rawPlan
                      return <span style={{ fontSize: 9, fontWeight: 700, color, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        {mobileLabel}
                      </span>
                    })()}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className='srms-topbar' style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: '1px solid var(--line)', background: 'var(--ink2)', flexShrink: 0, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--mist3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{settings?.school_name || 'SRMS'}</span>
                <span style={{ color: 'var(--line2)', fontSize: 10 }}>·</span>
                {profile?.role === 'superadmin'
                  ? planHook.can('yearSwitcher')
                    ? <YearSwitcher activeYear={activeYear} currentYear={currentYear} selectedYear={selectedYear} setSelectedYear={setSelectedYear} isMobile={false}/>
                    : <span onClick={() => setShowPlans(true)} style={{ fontSize: 12, color: 'var(--mist3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} title='Upgrade to use Year Switcher'>{activeYear} 🔒</span>
                  : <span style={{ fontSize: 12, color: 'var(--mist3)' }}>{activeYear}</span>}
                {isViewingPast && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'rgba(251,159,58,0.1)', border: '1px solid rgba(251,159,58,0.25)', borderRadius: 5, padding: '2px 8px', letterSpacing: '0.06em' }}>READ ONLY</span>
                )}
                {(() => {
                  const planColors = { trial: 'var(--sky)', starter: 'var(--emerald)', basic: 'var(--gold)', pro: 'var(--amber)', lifetime: 'var(--amber)' }
                  const planBg = { trial: 'rgba(91,168,245,0.1)', starter: 'rgba(45,212,160,0.1)', basic: 'rgba(232,184,75,0.1)', pro: 'rgba(251,159,58,0.1)', lifetime: 'rgba(251,159,58,0.1)' }
                  const planBorder = { trial: 'rgba(91,168,245,0.25)', starter: 'rgba(45,212,160,0.25)', basic: 'rgba(232,184,75,0.25)', pro: 'rgba(251,159,58,0.25)', lifetime: 'rgba(251,159,58,0.25)' }
                  const rawPlan = planHook.rawPlan || 'trial'
                  const badgeKey = planHook.isLifetime ? 'lifetime' : rawPlan
                  const color = planColors[badgeKey] || 'var(--mist3)'
                  const bg = planBg[badgeKey] || 'rgba(255,255,255,0.05)'
                  const border = planBorder[badgeKey] || 'rgba(255,255,255,0.1)'
                  const badgeLabel = planHook.isLifetime ? 'Lifetime' : planHook.isTrialing ? 'Trial' : rawPlan
                  return (
                    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {badgeLabel}
                      </span>
                      {planHook.isTrialing && <span style={{ fontSize: 11, color: 'var(--white)' }}>{planHook.daysLeft} days left</span>}
                    </div>
                  )
                })()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ThemeToggle isDark={isDark} onToggle={() => setIsDark(d => !d)}/>
                <div style={{ width: 1, height: 20, background: 'var(--line2)' }}/>
                <button onClick={() => setPage('myprofile')}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', borderRadius: 10, padding: '4px 10px 4px 6px', transition: 'background var(--t-fast)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ink4)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar name={profile?.full_name} size={28} color={ROLE_META[profile?.role]?.bg}/>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)', border: '1.5px solid var(--ink2)' }}/>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--white)', lineHeight: 1.2 }}>{profile?.full_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--mist3)' }}>{ROLE_META[profile?.role]?.label}</div>
                  </div>
                </button>
                <Btn variant='ghost' size='sm' onClick={logout}>Sign out</Btn>
              </div>
            </div>
          )}

          {/* ── Trial warning banner (≤5 days left) ── */}
          {planHook.isTrialing && planHook.daysLeft <= 5 && (
            <div style={{ flexShrink: 0, background: 'rgba(232,184,75,0.07)', borderBottom: '1px solid rgba(232,184,75,0.2)', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>
                    {planHook.daysLeft === 0 ? 'Your trial expires today' : `Your trial expires in ${planHook.daysLeft} day${planHook.daysLeft === 1 ? '' : 's'}`}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--mist2)', marginLeft: 8 }}>— contact us to activate a paid plan and keep your data.</span>
                </div>
              </div>
              <a href='mailto:kofi.william2311@gmail.com' style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.25)', borderRadius: 7, padding: '5px 14px', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Activate Plan →
              </a>
            </div>
          )}

          {/* ── Overage banner ── */}
          {planHook.status === 'overage_grace' && (
            <div style={{ flexShrink: 0, background: 'rgba(240,107,122,0.07)', borderBottom: '1px solid rgba(240,107,122,0.2)', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rose)' }}>You're over your plan limits</span>
                  <span style={{ fontSize: 13, color: 'var(--mist2)', marginLeft: 8 }}>— adding new students or users is paused. Upgrade or remove records within the grace period to avoid restrictions.</span>
                </div>
              </div>
              <button onClick={() => setShowPlans(true)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)', background: 'rgba(240,107,122,0.1)', border: '1px solid rgba(240,107,122,0.25)', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Upgrade Plan →
              </button>
            </div>
          )}

          {/* ── Cancelled grace banner ── */}
          {planHook.status === 'cancelled_grace' && (
            <div style={{ flexShrink: 0, background: 'rgba(251,159,58,0.07)', borderBottom: '1px solid rgba(251,159,58,0.2)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <span style={{ fontSize: 13, color: 'var(--mist2)' }}>
                <strong style={{ color: 'var(--amber)' }}>Your subscription has been cancelled.</strong> You have read-only access until the grace period ends. Contact us to reactivate.
              </span>
            </div>
          )}

          {/* ── Expiry grace banner ── */}
          {planHook.status === 'expiry_grace' && (
            <div style={{ flexShrink: 0, background: 'rgba(240,107,122,0.07)', borderBottom: '1px solid rgba(240,107,122,0.2)', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>⏰</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rose)' }}>
                    {planHook.daysLeft === 0 ? 'Your access ends today' : `${planHook.daysLeft} day${planHook.daysLeft === 1 ? '' : 's'} of access remaining`}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--mist2)', marginLeft: 8 }}>
                    — your {planHook.rawPlan === 'trial' ? 'trial' : 'plan'} has expired. Contact us to continue.
                  </span>
                </div>
              </div>
              <a href='mailto:kofi.william2311@gmail.com' style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)', background: 'rgba(240,107,122,0.1)', border: '1px solid rgba(240,107,122,0.25)', borderRadius: 7, padding: '5px 14px', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Renew Now →
              </a>
            </div>
          )}

          {/* ── Page content ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 36px' }}>
            <div key={page} className='page'>{renderPage()}</div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} isMobile={isMobile}/>}

      <FeedbackButton profile={profile} settings={settings} currentPage={pageTitles[page] || page}/>

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