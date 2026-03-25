import { useState, useRef, useEffect } from 'react'
import { PLANS } from '../lib/constants'

const G = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

.pl-wrap { min-height: 100vh; background: #0a0a14; color: #f0f0fa; font-family: 'Plus Jakarta Sans', sans-serif; }

/* ── NAV ── */
.pl-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; transition: background 0.35s, border-color 0.35s; }
.pl-nav.scrolled { background: rgba(12,12,21,0.94); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.06); }
.pl-nav-inner { max-width: 1200px; margin: 0 auto; height: 64px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
.pl-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.pl-logo-mark { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #c49a2e, #e8b84b); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px; color: #0c0c15; }
.pl-logo-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; color: #f0f0fa; }
.pl-nav-actions { display: flex; align-items: center; gap: 10px; }
.pl-btn-ghost { padding: 8px 20px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(232,232,240,0.65); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.pl-btn-ghost:hover { border-color: rgba(255,255,255,0.22); color: #e8e8f0; }
.pl-btn-gold { padding: 8px 22px; background: #e8b84b; border: none; border-radius: 8px; color: #0c0c15; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.pl-btn-gold:hover { background: #f5c84e; box-shadow: 0 4px 20px rgba(232,184,75,0.35); }

/* ── HERO ── */
.pl-hero { padding: 140px 32px 64px; text-align: center; }
.pl-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; color: #e8b84b; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px; }
.pl-eyebrow::before,.pl-eyebrow::after { content: ''; display: block; width: 32px; height: 1px; background: rgba(232,184,75,0.35); }
.pl-hero-title { font-family: 'Syne', sans-serif; font-size: 52px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 16px; }
.pl-hero-title span { color: #e8b84b; }
.pl-hero-sub { font-size: 16px; color: rgba(232,232,240,0.45); max-width: 480px; margin: 0 auto 40px; line-height: 1.7; }

/* ── TOGGLE ── */
.pl-toggle-wrap { display: flex; align-items: center; justify-content: center; gap: 0; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 4px; width: fit-content; margin: 0 auto 64px; }
.pl-toggle-btn { padding: 8px 24px; border-radius: 7px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; background: transparent; color: rgba(232,232,240,0.45); }
.pl-toggle-btn.active { background: #e8b84b; color: #0c0c15; }
.pl-save-badge { font-size: 10px; font-weight: 700; background: rgba(45,212,160,0.12); color: #2dd4a0; border-radius: 20px; padding: 2px 8px; margin-left: 6px; letter-spacing: 0.03em; }

/* ── TRIAL BANNER ── */
.pl-trial-banner { max-width: 680px; margin: 0 auto 48px; background: rgba(232,184,75,0.06); border: 1px solid rgba(232,184,75,0.15); border-radius: 12px; padding: 14px 24px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: rgba(232,232,240,0.7); }
.pl-trial-icon { font-size: 16px; flex-shrink: 0; }

/* ── CARDS ── */
.pl-cards { max-width: 1080px; margin: 0 auto; padding: 0 32px 100px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.pl-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 32px 28px; display: flex; flex-direction: column; gap: 0; position: relative; transition: border-color 0.2s; }
.pl-card:hover { border-color: rgba(255,255,255,0.13); }
.pl-card.featured { border-color: rgba(232,184,75,0.35); background: rgba(232,184,75,0.04); }
.pl-popular { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #e8b84b; color: #0c0c15; font-size: 10px; font-weight: 700; padding: 4px 14px; border-radius: 20px; white-space: nowrap; font-family: 'Space Mono', monospace; letter-spacing: 0.06em; }
.pl-plan-name { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #f0f0fa; margin-bottom: 6px; }
.pl-plan-desc { font-size: 12px; color: rgba(232,232,240,0.35); margin-bottom: 28px; line-height: 1.5; }
.pl-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
.pl-currency { font-size: 18px; font-weight: 700; color: #e8b84b; font-family: 'Syne', sans-serif; }
.pl-amount { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800; color: #f0f0fa; line-height: 1; }
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
.pl-limit-val { font-weight: 700; color: #f0f0fa; font-family: 'Syne', sans-serif; font-size: 13px; }
.pl-cta-btn { margin-top: auto; padding: 13px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.22s; font-family: 'Plus Jakarta Sans', sans-serif; width: 100%; border: none; }
.pl-cta-btn.gold { background: #e8b84b; color: #0c0c15; }
.pl-cta-btn.gold:hover { background: #f5c84e; box-shadow: 0 8px 28px rgba(232,184,75,0.3); transform: translateY(-1px); }
.pl-cta-btn.outline { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(232,232,240,0.65); }
.pl-cta-btn.outline:hover { border-color: rgba(255,255,255,0.22); color: #e8e8f0; }
.pl-spacer { flex: 1; }

/* ── TRIAL STRIP ── */
.pl-trial-strip { background: rgba(232,184,75,0.05); border-top: 1px solid rgba(232,184,75,0.1); padding: 48px 32px; text-align: center; }
.pl-trial-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; color: #f0f0fa; margin-bottom: 10px; }
.pl-trial-sub { font-size: 14px; color: rgba(232,232,240,0.4); margin-bottom: 28px; }
.pl-trial-btn { display: inline-block; padding: 13px 40px; background: #e8b84b; border: none; border-radius: 10px; color: #0c0c15; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.22s; font-family: 'Plus Jakarta Sans', sans-serif; }
.pl-trial-btn:hover { background: #f5c84e; box-shadow: 0 8px 28px rgba(232,184,75,0.3); transform: translateY(-1px); }

@media(max-width:900px){
  .pl-cards { grid-template-columns: 1fr; max-width: 440px; }
  .pl-hero-title { font-size: 36px; }
  .pl-card.featured { order: -1; }
}
@media(max-width:480px){
  .pl-hero { padding: 120px 20px 48px; }
  .pl-cards { padding: 0 20px 80px; }
  .pl-nav-inner { padding: 0 20px; }
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

function planHasFeature(plan, key) {
  if (key === 'students' || key === 'fees') return true
  return plan.features[key] === true
}

export default function Plans({ onEnter, onBack }) {
  const [cycle, setCycle] = useState('monthly')
  const navRef = useRef(null)

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

        {/* NAV */}
        <nav className="pl-nav" ref={navRef}>
          <div className="pl-nav-inner">
            <div className="pl-logo" onClick={onBack}>
              <div className="pl-logo-mark">S</div>
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
          <div className="pl-eyebrow">Pricing</div>
          <h1 className="pl-hero-title">Simple plans for<br /><span>every school</span></h1>
          <p className="pl-hero-sub">14-day full Pro trial on every new school — no payment required.</p>

          {/* billing toggle */}
          <div className="pl-toggle-wrap">
            <button
              className={`pl-toggle-btn${cycle === 'monthly' ? ' active' : ''}`}
              onClick={() => setCycle('monthly')}
            >Monthly</button>
            <button
              className={`pl-toggle-btn${cycle === 'annual' ? ' active' : ''}`}
              onClick={() => setCycle('annual')}
            >
              Annual <span className="pl-save-badge">Save up to 25%</span>
            </button>
          </div>
        </div>

        {/* CARDS */}
        <div className="pl-cards">
          {planList.map((plan, i) => {
            const isBasic    = plan.key === 'basic'
            const price      = cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const monthlyEq  = cycle === 'annual' ? Math.round(plan.annualPrice / 12) : null
            const saving     = cycle === 'annual'
              ? `₵${(plan.monthlyPrice * 12 - plan.annualPrice).toLocaleString()} saved — billed annually`
              : ''

            return (
              <div key={plan.key} className={`pl-card${isBasic ? ' featured' : ''}`}>
                {isBasic && <div className="pl-popular">MOST POPULAR</div>}

                <p className="pl-plan-name">{plan.label}</p>
                <p className="pl-plan-desc">
                  {plan.key === 'starter' && 'For small schools getting started'}
                  {plan.key === 'basic'   && 'For established schools, full operations'}
                  {plan.key === 'pro'     && 'For large schools needing full power'}
                </p>

                <div className="pl-price-row">
                  <span className="pl-currency">₵</span>
                  <span className="pl-amount">{price.toLocaleString()}</span>
                  <span className="pl-period">/{cycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <p className="pl-annual-note">
                  {cycle === 'annual' ? `₵${monthlyEq}/mo · ${saving}` : '\u00a0'}
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

                <button
                  className={`pl-cta-btn ${isBasic ? 'gold' : 'outline'}`}
                  onClick={onEnter}
                >
                  Start 14-day free trial
                </button>
              </div>
            )
          })}
        </div>

        {/* BOTTOM TRIAL STRIP */}
        <div className="pl-trial-strip">
          <h2 className="pl-trial-title">Not sure which plan? Start with the trial.</h2>
          <p className="pl-trial-sub">Every new school gets 14 days of full Pro access — no card required. Pick your plan after.</p>
          <button className="pl-trial-btn" onClick={onEnter}>Start Free Trial →</button>
        </div>

      </div>
    </>
  )
}