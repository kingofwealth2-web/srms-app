import { useRef, useEffect } from 'react'
import { PLANS } from '../lib/constants'
import LogoMark from '../components/LogoMark'

const G = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

.pl-wrap { min-height: 100vh; background: #08080f; color: #f0f0fa; font-family: 'Inter', sans-serif; position: relative; overflow-x: hidden; }

/* ── AURORA BACKGROUND ── */
.pl-aurora { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.pl-blob { position: absolute; border-radius: 50%; filter: blur(90px); will-change: transform; }
.pl-blob.a { width: 560px; height: 560px; top: -140px; left: -100px; background: radial-gradient(circle, rgba(232,184,75,0.28), transparent 70%); animation: pl-drift-a 24s ease-in-out infinite; }
.pl-blob.b { width: 620px; height: 620px; bottom: -180px; right: -120px; background: radial-gradient(circle, rgba(91,168,245,0.22), transparent 70%); animation: pl-drift-b 30s ease-in-out infinite; }
.pl-blob.c { width: 480px; height: 480px; top: 45%; left: 50%; background: radial-gradient(circle, rgba(167,139,250,0.18), transparent 70%); animation: pl-drift-c 20s ease-in-out infinite; }
@keyframes pl-drift-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(90px,60px) scale(1.15); } }
@keyframes pl-drift-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,-55px) scale(1.1); } }
@keyframes pl-drift-c { 0%,100% { transform: translate(-50%,0) scale(1); } 50% { transform: translate(-50%,50px) scale(0.88); } }
.pl-grid { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: linear-gradient(rgba(232,184,75,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(232,184,75,0.045) 1px, transparent 1px); background-size: 64px 64px; mask-image: radial-gradient(ellipse 85% 65% at 50% 15%, black 10%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse 85% 65% at 50% 15%, black 10%, transparent 75%); }

/* ── REVEAL ON SCROLL ── */
.pl-reveal { opacity: 0; transform: translateY(26px); transition: opacity 0.8s cubic-bezier(.16,1,.3,1), transform 0.8s cubic-bezier(.16,1,.3,1); }
.pl-reveal.visible { opacity: 1; transform: translateY(0); }

/* ── NAV ── */
.pl-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; transition: background 0.35s, border-color 0.35s; }
.pl-nav.scrolled { background: rgba(8,8,15,0.82); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(232,184,75,0.12); }
.pl-nav-inner { max-width: 1200px; margin: 0 auto; height: 64px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
.pl-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.pl-logo-mark { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #c49a2e, #e8b84b); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(232,184,75,0.4); transition: box-shadow 0.3s, transform 0.3s; }
.pl-logo:hover .pl-logo-mark { box-shadow: 0 4px 26px rgba(232,184,75,0.6); transform: rotate(-6deg) scale(1.05); }
.pl-logo-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 17px; color: #f0f0fa; }
.pl-nav-actions { display: flex; align-items: center; gap: 10px; }
.pl-btn-ghost { padding: 8px 20px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(232,232,240,0.65); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
.pl-btn-ghost:hover { border-color: rgba(255,255,255,0.24); color: #e8e8f0; background: rgba(255,255,255,0.03); }
.pl-btn-gold { padding: 8px 22px; background: #e8b84b; border: none; border-radius: 8px; color: #08080f; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
.pl-btn-gold:hover { background: #f5c84e; box-shadow: 0 4px 22px rgba(232,184,75,0.4); transform: translateY(-1px); }

/* ── HERO ── */
.pl-hero { position: relative; z-index: 1; padding: 140px 32px 64px; text-align: center; }
.pl-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; color: #e8b84b; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px; }
.pl-eyebrow::before,.pl-eyebrow::after { content: ''; display: block; width: 32px; height: 1px; background: rgba(232,184,75,0.35); }
.pl-hero-title { font-family: 'Space Grotesk', sans-serif; font-size: 52px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 16px; }
.pl-hero-title span { background: linear-gradient(90deg, #e8b84b, #f5d07a, #5ba8f5, #a78bfa, #e8b84b); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: pl-gradient-shift 7s ease infinite; }
@keyframes pl-gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.pl-hero-sub { font-size: 16px; color: rgba(232,232,240,0.45); max-width: 480px; margin: 0 auto 40px; line-height: 1.7; }

/* ── TOGGLE ── */
.pl-toggle-wrap { display: flex; align-items: center; justify-content: center; gap: 0; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 4px; width: fit-content; margin: 0 auto 64px; }
.pl-toggle-btn { padding: 8px 24px; border-radius: 7px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; background: transparent; color: rgba(232,232,240,0.45); }
.pl-toggle-btn.active { background: #e8b84b; color: #08080f; }
.pl-save-badge { font-size: 10px; font-weight: 700; background: rgba(45,212,160,0.12); color: #2dd4a0; border-radius: 20px; padding: 2px 8px; margin-left: 6px; letter-spacing: 0.03em; }

/* ── TRIAL BANNER ── */
.pl-trial-banner { max-width: 680px; margin: 0 auto 48px; background: rgba(232,184,75,0.06); border: 1px solid rgba(232,184,75,0.15); border-radius: 12px; padding: 14px 24px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: rgba(232,232,240,0.7); }
.pl-trial-icon { font-size: 16px; flex-shrink: 0; }

/* ── CARDS ── */
.pl-cards { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 0 32px 100px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.pl-card.lifetime { border-color: rgba(251,159,58,0.3); background: rgba(251,159,58,0.03); }
.pl-tbd { font-family: 'Space Grotesk', sans-serif; font-size: 36px; font-weight: 800; color: rgba(232,232,240,0.25); letter-spacing: 0.04em; line-height: 1; }
.pl-tbd-note { font-size: 11px; color: rgba(232,232,240,0.3); margin-bottom: 28px; min-height: 16px; font-style: italic; }
.pl-card { background: rgba(255,255,255,0.035); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px 28px; display: flex; flex-direction: column; gap: 0; position: relative; transition: border-color 0.3s, transform 0.3s; }
.pl-card:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-3px); }
.pl-card.featured { border-color: rgba(232,184,75,0.4); background: rgba(232,184,75,0.05); }
.pl-popular { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #e8b84b; color: #08080f; font-size: 10px; font-weight: 700; padding: 4px 14px; border-radius: 20px; white-space: nowrap; font-family: 'Space Mono', monospace; letter-spacing: 0.06em; }
.pl-plan-name { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; color: #f0f0fa; margin-bottom: 6px; }
.pl-plan-desc { font-size: 12px; color: rgba(232,232,240,0.35); margin-bottom: 28px; line-height: 1.5; }
.pl-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
.pl-currency { font-size: 18px; font-weight: 700; color: #e8b84b; font-family: 'Space Grotesk', sans-serif; }
.pl-amount { font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 800; color: #f0f0fa; line-height: 1; }
.pl-period { font-size: 13px; color: rgba(232,232,240,0.35); }
.pl-annual-note { font-size: 11px; color: #2dd4a0; margin-bottom: 28px; min-height: 16px; }
.pl-divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0 0 24px; }
.pl-section-label { font-family: 'Space Mono', monospace; font-size: 9px; color: rgba(232,232,240,0.25); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 14px; }
.pl-feat-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 13px; }
.pl-feat-ic { font-size: 12px; margin-top: 1px; min-width: 14px; }
.pl-feat-ic.yes { color: #2dd4a0; }
.pl-feat-ic.no { color: rgba(255,255,255,0.12); }
.pl-feat-ic.partial { color: #e8b84b; }
.pl-feat-text { color: rgba(232,232,240,0.65); }
.pl-feat-text.dim { color: rgba(232,232,240,0.2); text-decoration: line-through; text-decoration-color: rgba(255,255,255,0.08); }
.pl-limits { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.pl-limit-pill { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px 12px; font-size: 12px; color: rgba(232,232,240,0.55); }
.pl-limit-val { font-weight: 700; color: #f0f0fa; font-family: 'Space Grotesk', sans-serif; font-size: 13px; }
.pl-cta-btn { margin-top: auto; padding: 13px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.22s; font-family: 'Inter', sans-serif; width: 100%; border: none; }
.pl-cta-btn.gold { background: #e8b84b; color: #08080f; }
.pl-cta-btn.gold:hover { background: #f5c84e; box-shadow: 0 8px 28px rgba(232,184,75,0.3); transform: translateY(-1px); }
.pl-cta-btn.outline { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(232,232,240,0.65); }
.pl-cta-btn.outline:hover { border-color: rgba(255,255,255,0.22); color: #e8e8f0; }
.pl-spacer { flex: 1; }

/* ── TRIAL STRIP ── */
.pl-trial-strip { position: relative; z-index: 1; background: rgba(232,184,75,0.05); border-top: 1px solid rgba(232,184,75,0.1); padding: 64px 32px; text-align: center; }
.pl-trial-title { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; color: #f0f0fa; margin-bottom: 10px; }
.pl-trial-sub { font-size: 14px; color: rgba(232,232,240,0.4); margin-bottom: 28px; }
.pl-trial-btn { display: inline-block; padding: 13px 40px; background: #e8b84b; border: none; border-radius: 10px; color: #08080f; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.22s; font-family: 'Inter', sans-serif; }
.pl-trial-btn:hover { background: #f5c84e; box-shadow: 0 10px 34px rgba(232,184,75,0.35); }

@media(max-width:1100px){
  .pl-cards { grid-template-columns: repeat(2, 1fr); max-width: 720px; }
}
@media(max-width:900px){
  .pl-cards { grid-template-columns: 1fr; max-width: 440px; }
  .pl-hero-title { font-size: 36px; }
  .pl-card.featured { order: -1; }
  .pl-blob.c { display: none; }
}
@media(max-width:480px){
  .pl-hero { padding: 120px 20px 48px; }
  .pl-cards { padding: 0 20px 80px; }
  .pl-nav-inner { padding: 0 20px; }
  .pl-blob { filter: blur(60px); }
  .pl-blob.a, .pl-blob.b { width: 340px; height: 340px; }
}

@media (prefers-reduced-motion: reduce) {
  .pl-blob, .pl-hero-title span { animation: none !important; }
  .pl-reveal { transition: none !important; opacity: 1 !important; transform: none !important; }
}
`

const FEATURE_ROWS = [
  { key: 'students',      label: 'Students, Classes, Grades, Attendance', all: true },
  { key: 'fees',          label: 'Fee management',                         all: true },
  { key: 'feeReceipts',   label: 'Fee receipt generation',                 feat: true },
  { key: 'behaviour',     label: 'Behaviour tracking',                     feat: true },
  { key: 'announcements', label: 'Announcements',                          feat: true },
  { key: 'reportsPDF',    label: 'Reports & report cards (PDF)',            feat: true },
  { key: 'reportsExcel',  label: 'Reports Excel export',                   feat: true },
  { key: 'parentPortal',  label: 'Parent Portal',                          feat: true },
  { key: 'auditLog',      label: 'Audit Log',                              feat: true },
  { key: 'yearSwitcher',  label: 'Year switcher (history access)',          feat: true },
]

const LIFETIME_PLAN = {
  key:          'lifetime',
  label:        'Lifetime',
  studentLimit: null,
  userLimit:    null,
  features: {
    yearSwitcher: true, feeReceipts: true, behaviour: true,
    announcements: true, reportsPDF: true, reportsExcel: true,
    parentPortal: true, auditLog: true,
  },
}

function planHasFeature(plan, key) {
  if (key === 'students' || key === 'fees') return true
  return plan.features[key] === true
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.pl-reveal')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

export default function Plans({ onEnter, onBack }) {
  const navRef = useRef(null)
  useReveal()

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) navRef.current.classList.toggle('scrolled', window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const planList = Object.values(PLANS)

  return (
    <>
      <style>{G}</style>
      <div className="pl-wrap">

        {/* AURORA + GRID */}
        <div className="pl-aurora">
          <div className="pl-blob a" />
          <div className="pl-blob b" />
          <div className="pl-blob c" />
        </div>
        <div className="pl-grid" />

        {/* NAV */}
        <nav className="pl-nav" ref={navRef}>
          <div className="pl-nav-inner">
            <div className="pl-logo" onClick={onBack}>
              <div className="pl-logo-mark"><LogoMark size={17}/></div>
              <span className="pl-logo-text">SRMS</span>
            </div>
            <div className="pl-nav-actions">
              <button className="pl-btn-ghost" onClick={onEnter}>Sign In</button>
              <button className="pl-btn-gold" onClick={onEnter}>Start Free Trial</button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <div className="pl-hero">
          <div className="pl-eyebrow pl-reveal">Pricing</div>
          <h1 className="pl-hero-title pl-reveal" style={{transitionDelay:'0.06s'}}>Simple plans for<br /><span>every school</span></h1>
          <p className="pl-hero-sub pl-reveal" style={{transitionDelay:'0.12s'}}>14-day full Pro trial on every new school — no payment required. Pricing is being finalised — contact us for a quote.</p>
        </div>

        {/* CARDS */}
        <div className="pl-cards">
          {[...planList, LIFETIME_PLAN].map((plan, i) => {
            const isBasic    = plan.key === 'basic'
            const isLifetime = plan.key === 'lifetime'

            return (
              <div key={plan.key} className={`pl-card pl-reveal${isBasic ? ' featured' : ''}${isLifetime ? ' lifetime' : ''}`} style={{transitionDelay:`${i*0.06}s`}}>
                {isBasic && <div className="pl-popular">MOST POPULAR</div>}

                <p className="pl-plan-name">{plan.label}</p>
                <p className="pl-plan-desc">
                  {plan.key === 'starter'  && 'For small schools getting started'}
                  {plan.key === 'basic'    && 'For established schools, full operations'}
                  {plan.key === 'pro'      && 'For large schools needing full power'}
                  {plan.key === 'lifetime' && 'Pay once. Use forever. All Pro features included.'}
                </p>

                {/* TBD price */}
                <div className="pl-price-row">
                  <span className="pl-tbd">TBD</span>
                </div>
                <p className="pl-tbd-note">
                  {isLifetime ? 'One-time payment — no renewals' : 'Monthly & annual billing available'}
                </p>

                {/* limits */}
                <div className="pl-limits">
                  <div className="pl-limit-pill">
                    <span>Students</span>
                    <span className="pl-limit-val" style={{marginLeft:'auto'}}>
                      {plan.studentLimit ? `Up to ${plan.studentLimit}` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="pl-limit-pill">
                    <span>Staff users</span>
                    <span className="pl-limit-val" style={{marginLeft:'auto'}}>
                      {plan.userLimit ? `Up to ${plan.userLimit}` : 'Unlimited'}
                    </span>
                  </div>
                </div>

                <hr className="pl-divider" />
                <p className="pl-section-label">Features</p>

                {FEATURE_ROWS.map(row => {
                  const has = planHasFeature(plan, row.key)
                  return (
                    <div className="pl-feat-row" key={row.key}>
                      <span className={`pl-feat-ic ${has ? 'yes' : 'no'}`}>
                        {has ? '✓' : '✗'}
                      </span>
                      <span className={`pl-feat-text${has ? '' : ' dim'}`}>{row.label}</span>
                    </div>
                  )
                })}

                <div className="pl-spacer" style={{minHeight:24}} />

                <div style={{ marginTop: 'auto' }}>
                  <div style={{
                    background: isLifetime ? 'rgba(251,159,58,0.06)' : 'rgba(232,184,75,0.06)',
                    border: `1px solid ${isLifetime ? 'rgba(251,159,58,0.2)' : 'rgba(232,184,75,0.15)'}`,
                    borderRadius: 10, padding: '14px 16px', textAlign: 'left',
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700,
                      color: isLifetime ? '#fb9f3a' : '#e8b84b',
                      letterSpacing: '0.1em', marginBottom: 10,
                    }}>
                      {isLifetime ? 'GET A QUOTE' : 'CONTACT US TO SUBSCRIBE'}
                    </div>
                    <a href="tel:+233536759120" style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12, color: 'rgba(232,232,240,0.75)', textDecoration: 'none', marginBottom: 8,
                    }}>
                      <span>📞</span><span>0536 759 120</span>
                    </a>
                    <a href="mailto:kofi.william2311@gmail.com" style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12, color: 'rgba(232,232,240,0.75)', textDecoration: 'none',
                    }}>
                      <span>✉️</span><span>kofi.william2311@gmail.com</span>
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* BOTTOM TRIAL STRIP */}
        <div className="pl-trial-strip pl-reveal">
          <h2 className="pl-trial-title">Not sure which plan? Start with the trial.</h2>
          <p className="pl-trial-sub">Every new school gets 14 days of full Pro access — no card required. Pick your plan after.</p>
          <button className="pl-trial-btn" onClick={onEnter}>Start Free Trial →</button>
          <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(232,232,240,0.35)' }}>
            Ready to subscribe to a paid plan? Call or email us —{' '}
            <a href="tel:+233536759120" style={{ color: '#e8b84b', textDecoration: 'none' }}>0536 759 120</a>
            {' '}or{' '}
            <a href="mailto:kofi.william2311@gmail.com" style={{ color: '#e8b84b', textDecoration: 'none' }}>kofi.william2311@gmail.com</a>
          </p>
        </div>

      </div>
    </>
  )
}
