import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import Btn from '../components/Btn'
import Spinner from '../components/Spinner'

export default function ResetPassword({ onDone }) {
  const [newPass,setNewPass] = useState('')
  const [confirm,setConfirm] = useState('')
  const [saving,setSaving]   = useState(false)
  const [error,setError]     = useState('')
  const [success,setSuccess] = useState(false)
  const isMobile = useIsMobile()

  const [schoolName,setSchoolName] = useState('Kandit Standard School')
  const [schoolLogo,setSchoolLogo] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    supabase.from('settings').select('school_name,school_logo').limit(1).single()
      .then(({ data }) => {
        if (data?.school_name) setSchoolName(data.school_name)
        if (data?.school_logo) setSchoolLogo(data.school_logo)
      })
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const submit = async () => {
    setError('')
    if (!newPass || !confirm) { setError('Please fill in both fields.'); return }
    if (newPass.length < 8)   { setError('Password must be at least 8 characters.'); return }
    if (newPass !== confirm)  { setError('Passwords do not match.'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPass })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    window.history.replaceState(null, '', window.location.pathname)
    timerRef.current = setTimeout(() => {
      supabase.auth.signOut().then(() => onDone())
    }, 2200)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--ink)', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{ flex: isMobile ? '1' : '0 0 520px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? '40px 28px' : '60px', position: 'relative', zIndex: 1, minHeight: '100vh' }}
        onKeyDown={e => { if (e.key === 'Enter' && !success) submit() }}
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

          {!success ? (
            <>
              <h1 className='d' style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12 }}>Set new<br/>password.</h1>
              <p style={{ color: 'var(--mist2)', fontSize: 14, marginBottom: 40, lineHeight: 1.6 }}>Choose a strong password — at least 8 characters.</p>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Clash Display',sans-serif" }}>New Password</div>
                <input value={newPass} onChange={e => setNewPass(e.target.value)} type='password' placeholder='Min. 8 characters'
                  style={{ width: '100%', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)' }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none' }}/>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mist2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Clash Display',sans-serif" }}>Confirm Password</div>
                <input value={confirm} onChange={e => setConfirm(e.target.value)} type='password' placeholder='Repeat your new password'
                  style={{ width: '100%', background: 'var(--ink3)', border: `1px solid ${confirm && confirm !== newPass ? 'var(--rose)' : 'var(--line)'}`, borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = confirm && confirm !== newPass ? 'var(--rose)' : 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)' }}
                  onBlur={e  => { e.target.style.borderColor = confirm && confirm !== newPass ? 'var(--rose)' : 'var(--line)'; e.target.style.boxShadow = 'none' }}/>
                {confirm && confirm !== newPass && <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 5 }}>Passwords do not match</div>}
              </div>

              {newPass && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                    {[1,2,3,4].map(i => {
                      const strength = newPass.length >= 12 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /[^A-Za-z0-9]/.test(newPass) ? 4
                        : newPass.length >= 10 && (/[A-Z]/.test(newPass) || /[0-9]/.test(newPass)) ? 3
                        : newPass.length >= 8 ? 2 : 1
                      const c = strength >= 4 ? 'var(--emerald)' : strength >= 3 ? 'var(--sky)' : strength >= 2 ? 'var(--amber)' : 'var(--rose)'
                      return <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? c : 'var(--ink4)', transition: 'background 0.2s' }}/>
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mist3)' }}>
                    {newPass.length < 8 ? 'Too short'
                      : newPass.length >= 12 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /[^A-Za-z0-9]/.test(newPass) ? 'Strong password 💪'
                      : newPass.length >= 10 ? 'Good — try adding numbers or symbols'
                      : 'Acceptable'}
                  </div>
                </div>
              )}

              {error && <div style={{ background: 'rgba(240,107,122,0.08)', border: '1px solid rgba(240,107,122,0.25)', borderRadius: 'var(--r-sm)', padding: '11px 14px', fontSize: 13, color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}

              <Btn onClick={submit} disabled={saving || !newPass || newPass !== confirm} style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14, boxShadow: saving ? 'none' : '0 4px 20px rgba(232,184,75,0.25)' }}>
                {saving ? <><Spinner/> Saving...</> : 'Set New Password →'}
              </Btn>
            </>
          ) : (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px', boxShadow: '0 0 32px rgba(45,212,160,0.15)' }}>✓</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--white)', marginBottom: 10 }}>Password updated!</div>
              <p style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.7 }}>You will be redirected to the sign-in page in a moment…</p>
            </div>
          )}
        </div>
      </div>

      {!isMobile && (
        <div style={{ flex: 1, background: 'var(--ink2)', borderLeft: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 80px', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)', backgroundSize: '60px 60px', opacity: 0.35 }}/>
          <div className='fu fu2' style={{ position: 'relative', textAlign: 'center', maxWidth: 360 }}>
            {schoolLogo && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(232,184,75,0.4)', overflow: 'hidden', background: 'var(--ink)' }}>
                  <img src={schoolLogo} alt='Logo' style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                </div>
              </div>
            )}
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(232,184,75,0.06)', border: '1.5px solid rgba(232,184,75,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 0 5px rgba(232,184,75,0.05),0 0 24px rgba(232,184,75,0.35)' }}>
              <svg width='38' height='38' viewBox='0 0 64 64' fill='none'>
                <path d='M32 10L4 24L32 38L60 24L32 10Z' fill='rgba(232,184,75,0.9)' stroke='rgba(232,184,75,1)' strokeWidth='1.5' strokeLinejoin='round'/>
                <path d='M16 31V46C16 46 22 52 32 52C42 52 48 46 48 46V31' stroke='rgba(232,184,75,0.8)' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'/>
              </svg>
            </div>
            <div className='d' style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>{schoolName}</div>
            <h2 className='d' style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>Secure account<br/>recovery</h2>
            <p style={{ fontSize: 13, color: 'var(--mist3)', lineHeight: 1.7 }}>Choose a strong password you haven't used before. You'll be signed in automatically after saving.</p>
          </div>
        </div>
      )}
    </div>
  )
}
