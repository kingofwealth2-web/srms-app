import { useState } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Spinner from '../components/Spinner'

export default function Login({ onLogin }) {
  const [email,setEmail]           = useState('')
  const [password,setPassword]     = useState('')
  const [error,setError]           = useState('')
  const [loading,setLoading]       = useState(false)
  const [view,setView]             = useState('login') // 'login' | 'signup' | 'forgot' | 'forgot-sent'
  const [resetEmail,setResetEmail] = useState('')
  const [resetLoading,setResetLoading] = useState(false)
  const [resetError,setResetError]     = useState('')
  const [showPassword,setShowPassword] = useState(false)
  const [signupName,setSignupName]     = useState('')
  const [signupEmail,setSignupEmail]   = useState('')
  const [signupPass,setSignupPass]     = useState('')
  const [signupLoading,setSignupLoading] = useState(false)
  const [signupError,setSignupError]   = useState('')
  const schoolName = 'SRMS'
  const [schoolLogo,setSchoolLogo] = useState(null)
  const now = new Date()
  const acadYear = `${now.getFullYear()}/${now.getFullYear() + 1}`
  const isMobile = useIsMobile()



  const attempt = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
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
    if (signupPass.length < 6) { setSignupError('Password must be at least 6 characters.'); return }
    setSignupLoading(true); setSignupError('')
    const { data, error: err } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPass,
      options: { data: { full_name: signupName.trim() } }
    })
    if (err) { setSignupError(err.message); setSignupLoading(false); return }
    if (!data?.user?.id) { setSignupError('Account created but could not get user ID. Please sign in.'); setSignupLoading(false); return }
    // Upsert profile BEFORE onAuthStateChange triggers App.jsx loadAll
    const { error: profErr } = await supabase.from('profiles').upsert({
      id:        data.user.id,
      full_name: signupName.trim(),
      email:     signupEmail.trim(),
      role:      'superadmin',
      locked:    false,
      // school_id intentionally null — SchoolSetup wizard will set it
    })
    if (profErr) { setSignupError('Account created but profile setup failed: ' + profErr.message); setSignupLoading(false); return }
    // Don't call onLogin — onAuthStateChange in App.jsx fires automatically
    // and loadAll will fetch the profile we just created above
    setSignupLoading(false)
  }

  const features = [
    { icon: '🎓', title: 'Grades & Assessments', desc: 'Flexible components, weighted scoring, term reports' },
    { icon: '📋', title: 'Attendance Tracking',  desc: 'Daily batch entry with real-time class summaries' },
    { icon: '💳', title: 'Fees Management',      desc: 'Multi-currency invoicing and payment tracking' },
    { icon: '📊', title: 'Reports & Analytics',  desc: 'PDF & Excel exports, per-student report cards' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--ink)', position: 'relative', overflow: 'hidden' }}>
      {/* Left — login form */}
      <div
        style={{ flex: isMobile ? '1' : '0 0 520px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? '40px 28px' : '60px', position: 'relative', zIndex: 1, minHeight: '100vh' }}
        onKeyDown={e => { if (e.key !== 'Enter') return; if (view === 'login') attempt(); else if (view === 'signup') signUp(); else if (view === 'forgot') sendReset() }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3, maskImage: 'radial-gradient(ellipse at center,black 40%,transparent 80%)' }}/>
        <div className='fu' style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(232,184,75,0.4)' }}>
              <span className='d' style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>S</span>
            </div>
            <div>
              <div className='d' style={{ fontSize: 20, fontWeight: 700 }}>SRMS</div>
              <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 1 }}>Student Record Management System</div>
            </div>
          </div>

          <h1 className='d' style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12 }}>
            {view === 'login' ? <>Welcome<br/>back.</> : view === 'signup' ? <>Create<br/>account.</> : view === 'forgot-sent' ? 'Link sent.' : <>Reset<br/>password.</>}
          </h1>
          <p style={{ color: 'var(--mist2)', fontSize: 14, marginBottom: 40, lineHeight: 1.6 }}>
            {view === 'login'
              ? <>Sign in to access your dashboard<br/>and manage student records.</>
              : view === 'signup'
                ? 'Set up your school in under a minute.'
                : view === 'forgot'
                  ? "Enter your email and we'll send a reset link."
                  : 'Check your email for the reset link.'}
          </p>

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <>
              <Field label='Email Address' value={email} onChange={setEmail} type='email' placeholder='you@school.edu' required/>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Clash Display',sans-serif" }}>
                  Password <span style={{ color: 'var(--rose)' }}>*</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder='••••••••'
                    style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 40px 10px 14px', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)' }}
                    onBlur={e  => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--mist3)', cursor: 'pointer', fontSize: 14, padding: 0, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--mist)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--mist3)'}
                  >{showPassword ? '🙈' : '👁'}</button>
                </div>
              </div>
              {error && <div className='fi' style={{ background: 'rgba(240,107,122,0.08)', border: '1px solid rgba(240,107,122,0.25)', borderRadius: 'var(--r-sm)', padding: '11px 14px', fontSize: 13, color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}
              <Btn onClick={attempt} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14, boxShadow: loading ? 'none' : '0 4px 20px rgba(232,184,75,0.25)' }}>
                {loading ? <><Spinner/> Signing in...</> : 'Sign In →'}
              </Btn>
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button onClick={() => { setView('forgot'); setResetEmail(email); setResetError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--mist3)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'all 0.15s', padding: 0 }}
                  onMouseEnter={e => { e.target.style.color = 'var(--gold)'; e.target.style.textDecorationColor = 'var(--gold)' }}
                  onMouseLeave={e => { e.target.style.color = 'var(--mist3)'; e.target.style.textDecorationColor = 'transparent' }}
                >Forgot your password?</button>
              </div>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--mist3)' }}>New school? </span>
                <button onClick={() => { setView('signup'); setSignupError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontWeight: 600, padding: 0, textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.target.style.textDecorationColor = 'var(--gold)'}
                  onMouseLeave={e => e.target.style.textDecorationColor = 'transparent'}
                >Create an account →</button>
              </div>
            </>
          )}

          {/* SIGNUP VIEW */}
          {view === 'signup' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Clash Display',sans-serif" }}>Full Name <span style={{ color: 'var(--rose)' }}>*</span></div>
                <input
                  value={signupName} onChange={e => setSignupName(e.target.value)}
                  placeholder='Your full name' autoFocus
                  style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)' }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Clash Display',sans-serif" }}>Email Address <span style={{ color: 'var(--rose)' }}>*</span></div>
                <input
                  value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                  type='email' placeholder='you@school.edu'
                  style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)' }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Clash Display',sans-serif" }}>Password <span style={{ color: 'var(--rose)' }}>*</span></div>
                <input
                  value={signupPass} onChange={e => setSignupPass(e.target.value)}
                  type='password' placeholder='Min. 6 characters'
                  onKeyDown={e => e.key === 'Enter' && signUp()}
                  style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)' }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              {signupError && <div style={{ background: 'rgba(240,107,122,0.08)', border: '1px solid rgba(240,107,122,0.25)', borderRadius: 'var(--r-sm)', padding: '11px 14px', fontSize: 13, color: 'var(--rose)', marginBottom: 16 }}>{signupError}</div>}
              <Btn onClick={signUp} disabled={signupLoading} style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14, boxShadow: signupLoading ? 'none' : '0 4px 20px rgba(232,184,75,0.25)' }}>
                {signupLoading ? <><Spinner/> Creating account...</> : 'Create Account →'}
              </Btn>
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button onClick={() => { setView('login'); setSignupError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--mist3)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => e.target.style.color = 'var(--mist)'}
                  onMouseLeave={e => e.target.style.color = 'var(--mist3)'}
                >← Back to sign in</button>
              </div>
            </>
          )}

          {/* FORGOT VIEW */}
          {view === 'forgot' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email Address</div>
                <input
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReset()}
                  type='email' placeholder='you@school.edu' autoFocus
                  style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)' }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              {resetError && <div style={{ background: 'rgba(240,107,122,0.08)', border: '1px solid rgba(240,107,122,0.25)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--rose)', marginBottom: 16 }}>{resetError}</div>}
              <Btn onClick={sendReset} disabled={resetLoading} style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14 }}>
                {resetLoading ? <><Spinner/> Sending...</> : 'Send Reset Link →'}
              </Btn>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button onClick={() => { setView('login'); setResetError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--mist3)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => e.target.style.color = 'var(--mist)'}
                  onMouseLeave={e => e.target.style.color = 'var(--mist3)'}
                >← Back to sign in</button>
              </div>
            </>
          )}

          {/* FORGOT SENT VIEW */}
          {view === 'forgot-sent' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>✓</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--white)', marginBottom: 10 }}>Check your inbox</div>
              <p style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.7, marginBottom: 24 }}>
                A password reset link has been sent to<br/>
                <strong style={{ color: 'var(--gold)' }}>{resetEmail}</strong>.<br/>
                Click the link in the email to set a new password.
              </p>
              <p style={{ fontSize: 11, color: 'var(--mist3)', marginBottom: 24, lineHeight: 1.6 }}>
                Didn't receive it? Check your spam folder or{' '}
                <button onClick={() => setView('forgot')} style={{ background: 'none', border: 'none', color: 'var(--mist2)', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>try again</button>.
              </p>
              <button onClick={() => { setView('login'); setResetEmail(''); setResetError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--mist3)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.target.style.color = 'var(--mist)'}
                onMouseLeave={e => e.target.style.color = 'var(--mist3)'}
              >← Back to sign in</button>
            </div>
          )}
        </div>
      </div>

      {/* Right — branding panel (desktop only) */}
      {!isMobile && (
        <div style={{ flex: 1, background: 'var(--ink2)', borderLeft: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 80px', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize: '60px 60px', opacity: 0.35 }}/>
          <div className='fu fu2' style={{ position: 'relative', textAlign: 'center', maxWidth: 400, width: '100%' }}>
            {schoolLogo && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(232,184,75,0.4)', boxShadow: '0 0 32px rgba(232,184,75,0.2)', overflow: 'hidden', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={schoolLogo} alt='School logo' style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: schoolLogo ? 20 : 32 }}>
              <div style={{ width: schoolLogo ? 72 : 96, height: schoolLogo ? 72 : 96, borderRadius: '50%', background: 'rgba(232,184,75,0.06)', border: '1.5px solid rgba(232,184,75,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 5px rgba(232,184,75,0.05), 0 0 24px rgba(232,184,75,0.35)', transition: 'all 0.3s' }}>
                <svg width={schoolLogo ? 38 : 52} height={schoolLogo ? 38 : 52} viewBox="0 0 64 64" fill="none">
                  <path d="M32 10L4 24L32 38L60 24L32 10Z" fill="rgba(232,184,75,0.9)" stroke="rgba(232,184,75,1)" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M16 31V46C16 46 22 52 32 52C42 52 48 46 48 46V31" stroke="rgba(232,184,75,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M60 24V38" stroke="rgba(232,184,75,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="60" cy="40" r="3" fill="rgba(232,184,75,0.7)"/>
                </svg>
              </div>
            </div>
            <div className='d' style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>{schoolName}</div>
            <h2 className='d' style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>Student Record<br/>Management System</h2>
            <p style={{ fontSize: 13, color: 'var(--mist3)', marginBottom: 44, lineHeight: 1.6 }}>Empowering education through<br/>smart, secure record keeping.</p>
            <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg,transparent,var(--line),transparent)', marginBottom: 36 }}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, textAlign: 'left' }}>
              {features.map(({ icon, title, desc }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: i < features.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                  <div>
                    <div className='d' style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--mist2)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 36, fontSize: 11, color: 'var(--mist3)', letterSpacing: '0.05em' }}>v1.0.0 · Academic Year {acadYear}</div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--mist3)', letterSpacing: '0.06em' }}>Built by <span style={{ color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.12em' }}>ZELVA STUDIOS</span></div>
          </div>
        </div>
      )}
    </div>
  )
}