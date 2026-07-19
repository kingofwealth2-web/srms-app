import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile, useReducedMotion } from '../lib/hooks'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import LogoMark from '../components/LogoMark'

// ── Panel swap choreography ─────────────────────────────────────
// The two halves trade places when the user moves between the
// sign-in and create-account flows. Both are absolutely positioned
// at left:0/width:50%, so at the midpoint they overlap exactly —
// the form panel carries the higher z-index and a travelling shadow
// so it reads as passing *over* the info panel rather than clipping
// through it. Content inside both panels dims across the crossing and
// is swapped at SWAP_MID, so the copy is never seen rewriting itself
// mid-flight.
const SWAP_MS    = 480
const SWAP_MID   = 165
const FADE_OUT   = 130
const FADE_IN    = 210
// Content dims rather than disappearing. Both panel backgrounds are
// near-black (#0c0c15 / #11111c), so fading all the way to 0 left a
// uniform dark rectangle on screen and the whole page read as blacking
// out mid-swap. Holding a floor keeps the layout legible throughout —
// the panels are moving fast enough at SWAP_MID to mask the change.
const FADE_FLOOR = 0.3
const EASE       = 'cubic-bezier(.16,1,.3,1)'

export default function Login({ onLogin, lockedError, onClearLockedError, onBack }) {
  const [email,setEmail]           = useState('')
  const [password,setPassword]     = useState('')
  const [error,setError]           = useState('')
  const [loading,setLoading]       = useState(false)
  const [view,setView]             = useState('login') // 'login' | 'signup' | 'signup-sent' | 'forgot' | 'forgot-sent'
  const [resetEmail,setResetEmail] = useState('')
  const [resetLoading,setResetLoading] = useState(false)
  const [resetError,setResetError]     = useState('')
  const [showPassword,setShowPassword] = useState(false)
  const [showSignupPass,setShowSignupPass] = useState(false)
  const [signupName,setSignupName]     = useState('')
  const [signupEmail,setSignupEmail]   = useState('')
  const [signupPass,setSignupPass]     = useState('')
  const [signupLoading,setSignupLoading] = useState(false)
  const [signupError,setSignupError]   = useState('')
  const schoolName = 'SRMS'
  const isMobile     = useIsMobile()
  const reduceMotion = useReducedMotion()

  // Ghanaian school year runs Sept–Aug, so Jan–Aug still belongs to
  // the year that started the previous September.
  const now       = new Date()
  const yearStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  const acadYear  = `${yearStart}/${yearStart + 1}`

  const swapped = view.startsWith('signup')

  // `contentView` lags `view` by SWAP_MID so the panels are already
  // in motion (and faded out) before their contents change.
  const [contentView,setContentView] = useState(view)
  const [moving,setMoving]           = useState(false)
  const prevSwapped   = useRef(swapped)
  const formPanelRef  = useRef(null)
  const infoPanelRef  = useRef(null)
  const loginEmailRef = useRef(null)
  const signupNameRef = useRef(null)

  useEffect(() => {
    const swapChanged = swapped !== prevSwapped.current
    prevSwapped.current = swapped
    // Non-swap moves (login → forgot) and anything on mobile or with
    // reduced motion just cut straight to the new content.
    if (!swapChanged || isMobile || reduceMotion) { setContentView(view); setMoving(false); return }

    setMoving(true)
    const tMid = setTimeout(() => {
      setContentView(view)
      // A panel scrolled part-way down would otherwise reappear
      // mid-content with the new copy already past the top.
      if (formPanelRef.current) formPanelRef.current.scrollTop = 0
      if (infoPanelRef.current) infoPanelRef.current.scrollTop = 0
    }, SWAP_MID)
    const tEnd = setTimeout(() => {
      setMoving(false)
      // Focus lands only after the panel has settled — focusing a
      // moving element makes the browser fight the transition.
      const target = view === 'signup' ? signupNameRef.current : loginEmailRef.current
      target?.focus()
    }, SWAP_MS)
    // Clearing both on re-run is what makes rapid toggling safe: a
    // stale timer would otherwise swap in the copy for a view the
    // user has already navigated away from.
    return () => { clearTimeout(tMid); clearTimeout(tEnd) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isMobile, reduceMotion])

  const attempt = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    if (onClearLockedError) onClearLockedError()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (profile?.locked) {
      await supabase.auth.signOut()
      setError('Your account has been locked. Please contact your administrator.')
      setLoading(false)
      return
    }
    onLogin({ ...data.user, ...profile })
    setLoading(false)
  }

  const sendReset = async () => {
    if (!resetEmail) { setResetError('Please enter your email address.'); return }
    setResetLoading(true); setResetError('')
    const redirectTo = window.location.origin + window.location.pathname
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo })
    setResetLoading(false)
    if (err) { setResetError(err.message); return }
    setView('forgot-sent')
  }

  const signUp = async () => {
    if (!signupName.trim()) { setSignupError('Please enter your full name.'); return }
    if (!signupEmail)       { setSignupError('Please enter your email address.'); return }
    if (signupPass.length < 8) { setSignupError('Password must be at least 8 characters.'); return }
    setSignupLoading(true); setSignupError('')
    const { data, error: err } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPass,
      options: { data: { full_name: signupName.trim() } }
    })
    if (err) { setSignupError(err.message); setSignupLoading(false); return }
    if (!data?.user?.id) { setSignupError('Account created but could not get user ID. Please sign in.'); setSignupLoading(false); return }
    setSignupLoading(false)
    // The handle_new_user() DB trigger already created a profile row (role
    // defaults to 'teacher', school_id null) when signUp() ran above — a
    // client-side self-upsert to role:'superadmin' here would always be
    // rejected by RLS (a fresh account can't grant itself elevated access).
    // The setup_school() RPC in the SchoolSetup wizard is what actually
    // promotes this account to superadmin once they pick a school name.
    //
    // With email confirmation ON, signUp() returns a user but no session,
    // so onAuthStateChange never fires and nothing at all would happen on
    // screen. Show the confirm-your-email state in that case; when a
    // session does come back, onAuthStateChange in App.jsx takes over and
    // loadAll fetches the profile the trigger just created.
    if (!data.session) setView('signup-sent')
  }

  const features = [
    { icon: '🎓', title: 'Grades & Assessments', desc: 'Flexible components, weighted scoring, term reports' },
    { icon: '📋', title: 'Attendance Tracking',  desc: 'Daily batch entry with real-time class summaries' },
    { icon: '💳', title: 'Fees Management',      desc: 'Multi-currency invoicing and payment tracking' },
    { icon: '📊', title: 'Reports & Analytics',  desc: 'PDF & Excel exports, per-student report cards' },
  ]

  const setupSteps = [
    { icon: '1', title: 'Create your account',   desc: 'Your name, email and a password' },
    { icon: '2', title: 'Name your school',      desc: 'Set your terms, grading scale and currency' },
    { icon: '3', title: 'Add your classes',      desc: 'Students, teachers and subject assignments' },
    { icon: '4', title: 'Start recording',       desc: 'Grades, attendance and fees from day one' },
  ]

  // ── Shared bits ───────────────────────────────────────────────
  const revealBtn = (shown, toggle) => (
    <button
      type='button'
      onClick={() => toggle(v => !v)}
      aria-pressed={shown}
      aria-label={shown ? 'Hide password' : 'Show password'}
      style={{ background: 'none', border: 'none', color: 'var(--mist3)', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0, letterSpacing: '0.04em', transition: 'color var(--t-fast)' }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--mist3)'}
    >{shown ? 'Hide' : 'Show'}</button>
  )

  const linkBtn = (label, onClick, accent = false) => (
    <button
      type='button' onClick={onClick}
      style={{ background: 'none', border: 'none', color: accent ? 'var(--gold)' : 'var(--mist3)', fontSize: 12, cursor: 'pointer', fontWeight: accent ? 600 : 400, padding: 0, textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.textDecorationColor = 'var(--gold)' }}
      onMouseLeave={e => { e.currentTarget.style.color = accent ? 'var(--gold)' : 'var(--mist3)'; e.currentTarget.style.textDecorationColor = 'transparent' }}
    >{label}</button>
  )

  const errBox = msg => (
    <div className='fi' style={{ background: 'var(--rose-subtle)', border: '1px solid var(--rose-line)', borderRadius: 'var(--r-sm)', padding: '11px 14px', fontSize: 13, color: 'var(--rose)', marginBottom: 16 }} role='alert'>{msg}</div>
  )

  const heading = {
    login:         { h: <>Welcome<br/>back.</>,     p: <>Sign in to access your dashboard<br/>and manage student records.</> },
    signup:        { h: <>Create<br/>account.</>,   p: 'Set up your school in under a minute.' },
    'signup-sent': { h: 'Confirm your email.',      p: 'One more step before you can sign in.' },
    forgot:        { h: <>Reset<br/>password.</>,   p: "Enter your email and we'll send a reset link." },
    'forgot-sent': { h: 'Link sent.',               p: 'Check your email for the reset link.' },
  }[contentView]

  // ── Form panel ────────────────────────────────────────────────
  const formContent = (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
        <div onClick={onBack} style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(232,184,75,0.4)', cursor: onBack ? 'pointer' : 'default', flexShrink: 0 }}>
          <LogoMark size={22}/>
        </div>
        <div>
          <div className='d' style={{ fontSize: 20, fontWeight: 700 }}>SRMS</div>
          <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 1 }}>Student Record Management System</div>
        </div>
      </div>

      {lockedError && (
        <div className='fi' style={{ background: 'var(--rose-subtle)', border: '1px solid var(--rose-line)', borderRadius: 'var(--r-sm)', padding: '13px 16px', fontSize: 13, color: 'var(--rose)', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }} role='alert'>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
          <span>Your account has been locked. Please contact your administrator to regain access.</span>
        </div>
      )}

      <h1 className='d' style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12 }}>{heading.h}</h1>
      <p style={{ color: 'var(--mist2)', fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>{heading.p}</p>

      {contentView === 'login' && (
        <form onSubmit={e => { e.preventDefault(); attempt() }} noValidate>
          <Field label='Email Address' value={email} onChange={setEmail} type='email'
            name='email' autoComplete='email' inputRef={loginEmailRef}
            placeholder='you@school.edu' required/>
          <Field label='Password' value={password} onChange={setPassword}
            type={showPassword ? 'text' : 'password'}
            name='password' autoComplete='current-password'
            placeholder='••••••••' required
            adornment={revealBtn(showPassword, setShowPassword)} adornmentWidth={38}
            style={{ marginBottom: 16 }}/>
          {error && errBox(error)}
          <Btn type='submit' disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14, boxShadow: loading ? 'none' : '0 4px 20px rgba(232,184,75,0.25)' }}>
            {loading ? <><Spinner/> Signing in...</> : 'Sign In →'}
          </Btn>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            {linkBtn('Forgot your password?', () => { setView('forgot'); setResetEmail(email); setResetError('') })}
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--mist3)' }}>New school? </span>
            {linkBtn('Create an account →', () => { setView('signup'); setSignupError('') }, true)}
          </div>
        </form>
      )}

      {contentView === 'signup' && (
        <form onSubmit={e => { e.preventDefault(); signUp() }} noValidate>
          <Field label='Full Name' value={signupName} onChange={setSignupName}
            name='name' autoComplete='name' inputRef={signupNameRef}
            placeholder='Your full name' required/>
          <Field label='Email Address' value={signupEmail} onChange={setSignupEmail} type='email'
            name='email' autoComplete='email'
            placeholder='you@school.edu' required/>
          <Field label='Password' value={signupPass} onChange={setSignupPass}
            type={showSignupPass ? 'text' : 'password'}
            name='new-password' autoComplete='new-password'
            placeholder='Min. 8 characters' required
            adornment={revealBtn(showSignupPass, setShowSignupPass)} adornmentWidth={38}
            style={{ marginBottom: 16 }}/>
          {signupError && errBox(signupError)}
          <Btn type='submit' disabled={signupLoading} style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14, boxShadow: signupLoading ? 'none' : '0 4px 20px rgba(232,184,75,0.25)' }}>
            {signupLoading ? <><Spinner/> Creating account...</> : 'Create Account →'}
          </Btn>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            {linkBtn('← Back to sign in', () => { setView('login'); setSignupError('') })}
          </div>
        </form>
      )}

      {contentView === 'signup-sent' && (
        <div style={{ padding: '4px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--emerald-subtle)', border: '1px solid var(--emerald-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, color: 'var(--emerald)' }}>✓</div>
          <p style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.7, marginBottom: 24 }}>
            We've sent a confirmation link to <strong style={{ color: 'var(--gold)' }}>{signupEmail}</strong>.
            Click it to activate your account, then come back here to sign in and set up your school.
          </p>
          <p style={{ fontSize: 11, color: 'var(--mist3)', marginBottom: 24, lineHeight: 1.6 }}>
            Didn't receive it? Check your spam folder — confirmation emails can take a couple of minutes to arrive.
          </p>
          {linkBtn('← Back to sign in', () => { setView('login'); setSignupError('') })}
        </div>
      )}

      {contentView === 'forgot' && (
        <form onSubmit={e => { e.preventDefault(); sendReset() }} noValidate>
          <Field label='Email Address' value={resetEmail} onChange={setResetEmail} type='email'
            name='email' autoComplete='email' autoFocus={!isMobile}
            placeholder='you@school.edu' required
            style={{ marginBottom: 20 }}/>
          {resetError && errBox(resetError)}
          <Btn type='submit' disabled={resetLoading} style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14 }}>
            {resetLoading ? <><Spinner/> Sending...</> : 'Send Reset Link →'}
          </Btn>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {linkBtn('← Back to sign in', () => { setView('login'); setResetError('') })}
          </div>
        </form>
      )}

      {contentView === 'forgot-sent' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--emerald-subtle)', border: '1px solid var(--emerald-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px', color: 'var(--emerald)' }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--white)', marginBottom: 10 }}>Check your inbox</div>
          <p style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.7, marginBottom: 24 }}>
            A password reset link has been sent to<br/>
            <strong style={{ color: 'var(--gold)' }}>{resetEmail}</strong>.<br/>
            Click the link in the email to set a new password.
          </p>
          <p style={{ fontSize: 11, color: 'var(--mist3)', marginBottom: 24, lineHeight: 1.6 }}>
            Didn't receive it? Check your spam folder or{' '}
            <button type='button' onClick={() => setView('forgot')} style={{ background: 'none', border: 'none', color: 'var(--mist2)', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>try again</button>.
          </p>
          {linkBtn('← Back to sign in', () => { setView('login'); setResetEmail(''); setResetError('') })}
        </div>
      )}
    </div>
  )

  // ── Info panel ────────────────────────────────────────────────
  // Keyed off contentView, not view: `swapped` flips the instant the
  // button is clicked and drives the *transform*, but the copy has to
  // wait for the crossfade or it rewrites itself in plain sight.
  const contentSwapped = contentView.startsWith('signup')
  const rows = contentSwapped ? setupSteps : features
  const infoContent = (
    <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(232,184,75,0.06)', border: '1.5px solid rgba(232,184,75,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 5px rgba(232,184,75,0.05), 0 0 24px rgba(232,184,75,0.35)' }}>
          <svg width={52} height={52} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M32 10L4 24L32 38L60 24L32 10Z" fill="rgba(232,184,75,0.9)" stroke="rgba(232,184,75,1)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M16 31V46C16 46 22 52 32 52C42 52 48 46 48 46V31" stroke="rgba(232,184,75,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M60 24V38" stroke="rgba(232,184,75,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="60" cy="40" r="3" fill="rgba(232,184,75,0.7)"/>
          </svg>
        </div>
      </div>
      <div className='d' style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>{schoolName}</div>
      <h2 className='d' style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
        {contentSwapped ? <>Setting up<br/>your school</> : <>Student Record<br/>Management System</>}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--mist3)', marginBottom: 44, lineHeight: 1.6 }}>
        {contentSwapped
          ? <>Four steps from here to your first<br/>term report. Nothing to install.</>
          : <>Empowering education through<br/>smart, secure record keeping.</>}
      </p>
      <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg,transparent,var(--line),transparent)', marginBottom: 36 }}/>
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        {rows.map(({ icon, title, desc }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: contentSwapped ? 14 : 17, fontWeight: contentSwapped ? 700 : 400, color: contentSwapped ? 'var(--gold)' : undefined, flexShrink: 0, marginTop: 1 }}>{icon}</div>
            <div>
              <div className='d' style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--mist2)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 36, fontSize: 11, color: 'var(--mist3)', letterSpacing: '0.05em' }}>v1.0.0 · Academic Year {acadYear}</div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--mist3)', letterSpacing: '0.06em' }}>Built by <span style={{ color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.12em' }}>PRIME LOGIC SOFTWARES</span></div>
    </div>
  )

  const gridBg = size => ({
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)',
    backgroundSize: `${size}px ${size}px`,
  })

  // ── Mobile: single column, no info panel, no swap ─────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--ink)', padding: '40px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ ...gridBg(40), opacity: 0.3, maskImage: 'radial-gradient(ellipse at center,black 40%,transparent 80%)' }}/>
        <div className='fu' style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>{formContent}</div>
      </div>
    )
  }

  // ── Desktop: two equal halves that trade places ───────────────
  const panelBase = {
    position: 'absolute', top: 0, left: 0, width: '50%', height: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflowY: 'auto', overflowX: 'hidden',
    transition: reduceMotion ? 'none' : `transform ${SWAP_MS}ms ${EASE}, box-shadow ${SWAP_MS}ms ease`,
  }
  // The crossfade lives on a child of the .fu element, never on it.
  // .fu runs `animation: fadeUp ... both`, and an animation holding a
  // filled value outranks an inline style in the cascade — putting
  // opacity on the same node means it silently never applies.
  const fuWrap      = { position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }
  const contentWrap = {
    width: '100%', display: 'flex', justifyContent: 'center',
    opacity: moving ? FADE_FLOOR : 1,
    transition: reduceMotion ? 'none' : `opacity ${moving ? FADE_OUT : FADE_IN}ms ease`,
  }

  return (
    <div style={{ height: '100vh', background: 'var(--ink)', position: 'relative', overflow: 'hidden' }}>
      {/* Form panel — higher z-index so it passes over during the swap */}
      <div
        ref={formPanelRef}
        style={{
          ...panelBase, zIndex: 2, background: 'var(--ink)', padding: '60px 56px',
          transform: `translateX(${swapped ? 100 : 0}%)`,
          // Tight enough to read as a lifted edge, not a glow that
          // darkens the whole viewport for the length of the swap.
          boxShadow: moving ? '0 0 24px rgba(0,0,0,0.45)' : 'none',
        }}
      >
        <div style={{ ...gridBg(40), opacity: 0.3, maskImage: 'radial-gradient(ellipse at center,black 40%,transparent 80%)' }}/>
        <div className='fu' style={fuWrap}><div style={contentWrap}>{formContent}</div></div>
      </div>

      {/* Info panel — divider sits on whichever edge faces the form */}
      <div
        ref={infoPanelRef}
        style={{
          ...panelBase, zIndex: 1, background: 'var(--ink2)', padding: '60px 64px',
          borderLeft:  swapped ? 'none' : '1px solid var(--line)',
          borderRight: swapped ? '1px solid var(--line)' : 'none',
          transform: `translateX(${swapped ? 0 : 100}%)`,
        }}
      >
        <div style={{ ...gridBg(60), opacity: 0.35 }}/>
        <div className='fu fu2' style={fuWrap}><div style={contentWrap}>{infoContent}</div></div>
      </div>
    </div>
  )
}
