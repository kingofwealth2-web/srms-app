import { useEffect, useRef } from 'react'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

.lp-root {
  font-family: 'Instrument Sans', sans-serif;
  background: #09090f;
  color: #f0efea;
  overflow-x: hidden;
  line-height: 1.6;
  min-height: 100vh;
}
.lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.lp-root h1,.lp-root h2,.lp-root h3 { font-family: 'Syne', sans-serif; letter-spacing: -0.02em; }

/* noise */
body { background: #09090f !important; }

.lp-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 1000; opacity: 0.35;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
}

/* kente grid */
.lp-kente {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, rgba(232,184,75,0.03) 0px, rgba(232,184,75,0.03) 1px, transparent 1px, transparent 80px),
    repeating-linear-gradient(0deg, rgba(232,184,75,0.03) 0px, rgba(232,184,75,0.03) 1px, transparent 1px, transparent 80px),
    repeating-linear-gradient(45deg, rgba(232,184,75,0.015) 0px, rgba(232,184,75,0.015) 1px, transparent 1px, transparent 40px);
}

/* nav */
.lp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 0 28px;
  transition: background 0.4s, border-color 0.4s;
}
.lp-nav.scrolled {
  background: rgba(9,9,15,0.88);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.lp-nav-inner {
  max-width: 1160px; margin: 0 auto; height: 68px;
  display: flex; align-items: center; justify-content: space-between;
}
.lp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.lp-logo-mark {
  width: 36px; height: 36px; background: #e8b84b; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; color: #09090f;
  box-shadow: 0 0 20px rgba(232,184,75,0.4); flex-shrink: 0;
}
.lp-logo-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: #f0efea; letter-spacing: -0.01em; }
.lp-logo-sub { font-size: 10px; color: #8887a4; font-weight: 400; display: block; letter-spacing: 0.04em; }
.lp-btn-ghost {
  padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
  background: transparent; color: #8887a4; font-family: 'Instrument Sans', sans-serif;
  font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; transition: all 0.2s;
}
.lp-btn-ghost:hover { color: #f0efea; background: #1c1c2e; }
.lp-btn-gold {
  padding: 8px 20px; border-radius: 8px; border: none; background: #e8b84b;
  color: #09090f; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; box-shadow: 0 0 20px rgba(232,184,75,0.3);
}
.lp-btn-gold:hover { background: #f5d07a; box-shadow: 0 0 30px rgba(232,184,75,0.5); transform: translateY(-1px); }

/* hero */
.lp-hero {
  position: relative; min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 100px 28px 60px; overflow: hidden;
}
.lp-hero-glow {
  position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
  width: 800px; height: 800px;
  background: radial-gradient(ellipse at center, rgba(232,184,75,0.12) 0%, transparent 65%);
  pointer-events: none;
  animation: lp-pulse 4s ease-in-out infinite;
}
@keyframes lp-pulse {
  0%,100% { opacity:0.6; transform: translateX(-50%) scale(1); }
  50% { opacity:1; transform: translateX(-50%) scale(1.08); }
}
.lp-badge {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 14px; border: 1px solid rgba(232,184,75,0.3); border-radius: 99px;
  background: rgba(232,184,75,0.07); font-size: 11px; font-weight: 600; color: #e8b84b;
  letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 28px;
  animation: lp-fadeup 0.6s ease both;
}
.lp-badge::before {
  content:''; width:6px; height:6px; border-radius:50%; background:#e8b84b;
  animation: lp-blink 2s ease infinite;
}
@keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.lp-title {
  font-size: clamp(36px, 5.5vw, 68px); font-weight: 800; line-height: 1.0;
  letter-spacing: -0.04em; margin-bottom: 24px;
  animation: lp-fadeup 0.6s 0.1s ease both;
}
.lp-title .gold-line {
  display: block;
  background: linear-gradient(135deg, #e8b84b 0%, #f5d07a 40%, #c8940a 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.lp-sub {
  max-width: 500px; font-size: 17px; color: #8887a4; line-height: 1.7; margin-bottom: 40px;
  animation: lp-fadeup 0.6s 0.2s ease both;
}
.lp-sub strong { color: #f0efea; font-weight: 500; }
.lp-actions {
  display: flex; align-items: center; gap: 14px; margin-bottom: 64px;
  animation: lp-fadeup 0.6s 0.3s ease both;
}
.lp-btn-hero {
  padding: 14px 32px; border-radius: 10px; border: none; background: #e8b84b;
  color: #09090f; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
  cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 8px;
  box-shadow: 0 0 40px rgba(232,184,75,0.35), 0 4px 16px rgba(0,0,0,0.4);
}
.lp-btn-hero:hover { background:#f5d07a; box-shadow:0 0 60px rgba(232,184,75,0.55); transform:translateY(-2px); }
.lp-btn-hero-ghost {
  padding: 14px 28px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
  background: transparent; color: #8887a4; font-family: 'Instrument Sans', sans-serif;
  font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s;
}
.lp-btn-hero-ghost:hover { color: #f0efea; background: #1c1c2e; }
.lp-stats {
  display: flex; align-items: center; gap: 36px;
  animation: lp-fadeup 0.6s 0.4s ease both;
}
.lp-stat-n {
  font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #e8b84b;
  display: block; letter-spacing: -0.03em;
}
.lp-stat-l { font-size: 11px; color: #8887a4; letter-spacing: 0.06em; text-transform: uppercase; }
.lp-stat-div { width: 1px; height: 32px; background: rgba(255,255,255,0.12); }
@keyframes lp-fadeup {
  from { opacity:0; transform: translateY(20px); }
  to   { opacity:1; transform: translateY(0); }
}

/* marquee */
.lp-marquee { padding: 18px 0; background: #0f0f1a; border-top: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); overflow: hidden; }
.lp-marquee-track { display: flex; animation: lp-marquee 28s linear infinite; width: max-content; }
.lp-marquee-item {
  display: flex; align-items: center; gap: 10px; padding: 0 28px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: #8887a4; white-space: nowrap;
}
.lp-marquee-dot { color: #e8b84b; font-size: 14px; }
@keyframes lp-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* container */
.lp-container { max-width: 1160px; margin: 0 auto; padding: 0 28px; }

/* section label */
.lp-section-label {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
  color: #e8b84b; margin-bottom: 16px;
}
.lp-section-label::before { content:''; width:20px; height:1px; background:#e8b84b; }
.lp-section-title {
  font-size: clamp(26px, 3.2vw, 42px); font-weight: 800; line-height: 1.1;
  letter-spacing: -0.03em; margin-bottom: 14px;
}
.lp-section-sub { font-size: 16px; color: #8887a4; line-height: 1.7; max-width: 500px; }

/* features */
.lp-features { padding: 100px 0; background: #09090f; position: relative; }
.lp-feat-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 1px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; margin-top: 56px;
}
.lp-feat-card {
  background: #0f0f1a; padding: 34px 30px; position: relative; overflow: hidden;
  transition: background 0.3s; cursor: default;
}
.lp-feat-card::before {
  content:''; position:absolute; inset:0;
  background: linear-gradient(135deg, rgba(232,184,75,0.1) 0%, transparent 60%);
  opacity:0; transition: opacity 0.4s;
}
.lp-feat-card:hover { background: #141421; }
.lp-feat-card:hover::before { opacity:1; }
.lp-feat-icon {
  width: 46px; height: 46px; border-radius: 12px;
  background: rgba(232,184,75,0.1); border: 1px solid rgba(232,184,75,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; margin-bottom: 18px; transition: all 0.3s;
}
.lp-feat-card:hover .lp-feat-icon { background: rgba(232,184,75,0.18); box-shadow: 0 0 20px rgba(232,184,75,0.15); transform: scale(1.05); }
.lp-feat-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 9px; letter-spacing: -0.01em; }
.lp-feat-desc { font-size: 13px; color: #8887a4; line-height: 1.7; }
.lp-feat-tag {
  display: inline-block; margin-top: 14px; padding: 3px 10px; border-radius: 99px;
  background: rgba(232,184,75,0.1); border: 1px solid rgba(232,184,75,0.15);
  font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #e8b84b;
}

/* roles */
.lp-roles { padding: 100px 0; background: #0f0f1a; position: relative; overflow: hidden; }
.lp-roles-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 56px; }
.lp-role-card {
  background: #141421; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px;
  padding: 26px 22px; transition: all 0.3s;
}
.lp-role-card:hover {
  border-color: rgba(232,184,75,0.3); transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(232,184,75,0.07);
}
.lp-role-avatar { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 14px; }
.lp-role-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 7px; }
.lp-role-desc { font-size: 13px; color: #8887a4; line-height: 1.6; margin-bottom: 14px; }
.lp-role-perms { display: flex; flex-direction: column; gap: 5px; }
.lp-perm { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #8887a4; }
.lp-perm-dot { width: 5px; height: 5px; border-radius: 50%; background: #e8b84b; flex-shrink: 0; }

/* trust */
.lp-trust { padding: 64px 0; background: #09090f; border-top: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); }
.lp-trust-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 1px; background: #0c0c14;
  border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden;
}
.lp-trust-item { background: #0f0f1a; padding: 30px 26px; text-align: center; }
.lp-trust-n { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: #e8b84b; letter-spacing: -0.04em; display: block; margin-bottom: 6px; }
.lp-trust-l { font-size: 12px; color: #8887a4; line-height: 1.5; }

/* multi-school */
.lp-multi { padding: 100px 0; background: #0f0f1a; position: relative; overflow: hidden; }
.lp-multi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.lp-ms-visual { position: relative; height: 300px; display: flex; align-items: center; justify-content: center; }
.lp-ms-center {
  position: absolute; width: 76px; height: 76px; border-radius: 50%; background: #e8b84b;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 12px; color: #09090f;
  box-shadow: 0 0 50px rgba(232,184,75,0.5); z-index: 2;
}
.lp-ms-ring {
  position: absolute; border-radius: 50%; border: 1px solid rgba(232,184,75,0.15);
  animation: lp-spin linear infinite;
}
.lp-ms-ring-1 { width:170px; height:170px; animation-duration:20s; }
.lp-ms-ring-2 { width:280px; height:280px; animation-duration:35s; animation-direction:reverse; border-style:dashed; }
.lp-ms-ring-3 { width:400px; height:400px; animation-duration:50s; }
@keyframes lp-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.lp-ms-school {
  position: absolute; background: #1c1c2e; border: 1px solid rgba(255,255,255,0.12);
  border-radius: 9px; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #f0efea;
  white-space: nowrap; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.lp-ms-school::before {
  content:''; display:inline-block; width:6px; height:6px; border-radius:50%;
  background:#e8b84b; margin-right:7px; vertical-align:middle;
}
.lp-ms-s1 { top:20px; left:50%; transform:translateX(-50%); }
.lp-ms-s2 { top:50%; right:20px; transform:translateY(-50%); }
.lp-ms-s3 { bottom:20px; left:50%; transform:translateX(-50%); }
.lp-ms-s4 { top:50%; left:20px; transform:translateY(-50%); }
.lp-multi-perm { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #f0efea; margin-bottom: 10px; }

/* cta */
.lp-cta { padding: 120px 0; background: #09090f; text-align: center; position: relative; overflow: hidden; }
.lp-cta-glow {
  position: absolute; bottom: -200px; left: 50%; transform: translateX(-50%);
  width: 600px; height: 600px;
  background: radial-gradient(ellipse, rgba(232,184,75,0.1) 0%, transparent 65%);
  pointer-events: none;
}
.lp-cta-title { font-size: clamp(28px, 4vw, 52px); font-weight: 800; letter-spacing: -0.04em; margin-bottom: 18px; line-height: 1.1; }
.lp-cta-sub { font-size: 17px; color: #8887a4; margin-bottom: 40px; }
.lp-cta-actions { display: flex; align-items: center; justify-content: center; gap: 14px; }

/* footer */
.lp-footer { background: #0f0f1a; border-top: 1px solid rgba(255,255,255,0.07); padding: 32px 0; }
.lp-footer-inner { display: flex; align-items: center; justify-content: space-between; }
.lp-footer-copy { font-size: 13px; color: #3a3a52; }
.lp-footer-copy span { color: #8887a4; }
.lp-footer-badge {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #3a3a52;
  padding: 4px 12px; border: 1px solid rgba(255,255,255,0.07); border-radius: 6px;
}

/* reveal */
.lp-reveal { opacity:0; transform:translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
.lp-reveal.lp-visible { opacity:1; transform:translateY(0); }
.lp-d1 { transition-delay: 0.1s; }
.lp-d2 { transition-delay: 0.2s; }
.lp-d3 { transition-delay: 0.3s; }
.lp-d4 { transition-delay: 0.4s; }

/* responsive */
@media (max-width: 900px) {
  .lp-feat-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-roles-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-trust-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-multi-grid { grid-template-columns: 1fr; gap: 40px; }
  .lp-ms-visual { height: 240px; }
  .lp-ms-ring-3 { width: 320px; height: 320px; }
  .lp-ms-s2, .lp-ms-s4 { display: none; }
}
@media (max-width: 600px) {
  .lp-feat-grid { grid-template-columns: 1fr; }
  .lp-roles-grid { grid-template-columns: 1fr; }
  .lp-trust-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-stats { gap: 18px; }
  .lp-actions { flex-direction: column; width: 100%; }
  .lp-btn-hero, .lp-btn-hero-ghost { width: 100%; justify-content: center; }
  .lp-footer-inner { flex-direction: column; gap: 10px; text-align: center; }
}
`

const FEATURES = [
  { icon: '🎓', title: 'Student Records', desc: 'Complete student profiles with guardian contacts, admission history, medical notes, and full academic journey from entry to graduation.', tag: 'Archive & Readmit' },
  { icon: '📊', title: 'Grades & Reports', desc: 'Flexible grade components with custom weights. Auto-ranked academic broadsheets, individual report cards, and PDF export with school branding.', tag: 'PDF & Excel Export' },
  { icon: '💰', title: 'Fees & Payments', desc: 'Create fee structures, track outstanding balances, record payments with receipts, and carry over arrears across academic years automatically.', tag: 'Printable Receipts' },
  { icon: '📅', title: 'Attendance', desc: 'Daily attendance marking per class with Present, Absent, Late, and Excused statuses. Historical logs and attendance rate dashboards.', tag: 'Rate Analytics' },
  { icon: '🔐', title: 'Role-Based Access', desc: 'Four distinct roles — Superadmin, Admin, Class Teacher, Subject Teacher — each with precisely scoped permissions enforced at the database level.', tag: 'Enterprise Security' },
  { icon: '🏫', title: 'Multi-School', desc: 'Run multiple schools from one platform. Complete data isolation ensures each school only ever sees its own students, staff, and records.', tag: 'Zero Data Leakage' },
]

const ROLES = [
  { icon: '👑', bg: 'rgba(232,184,75,0.1)', name: 'Superadmin', desc: 'Full control over the school. Sets up classes, subjects, staff accounts, academic calendar, and system settings.', perms: ['Manage all staff & roles', 'Configure grading system', 'Full audit log access', 'Academic year management'] },
  { icon: '🗂️', bg: 'rgba(91,168,245,0.1)', name: 'Admin', desc: 'Day-to-day operations — managing students, recording fees, payments, attendance, and announcements.', perms: ['Student enrolment & records', 'Fee & payment recording', 'Attendance management', 'Announcements'] },
  { icon: '📋', bg: 'rgba(45,212,160,0.1)', name: 'Class Teacher', desc: 'Manages their class — marks attendance, enters grades, records behaviour notes, and stays informed via announcements.', perms: ['Attendance marking', 'Grade entry & editing', 'Behaviour notes', 'No access to fees'] },
  { icon: '✏️', bg: 'rgba(167,139,250,0.1)', name: 'Subject Teacher', desc: 'Scoped to their subject — enters and manages grades for their assigned subject only.', perms: ['Grade entry (own subject)', 'Student list access', 'Announcements', 'No fees or settings'] },
]

const MARQUEE_ITEMS = ['Student Records', 'Grade Reports', 'Fee Management', 'Attendance Tracking', 'Role-Based Access', 'Multi-School Support', 'Academic Reports', 'Behaviour Tracking', 'Audit Logging', 'PDF & Excel Export']

export default function Landing({ onEnter }) {
  const navRef = useRef(null)

  useEffect(() => {
    // Sticky nav
    const onScroll = () => navRef.current?.classList.toggle('scrolled', window.scrollY > 40)
    window.addEventListener('scroll', onScroll)

    // Scroll reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lp-visible'); observer.unobserve(e.target) } })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el))

    // Counter animation
    const animateCounter = (el) => {
      const target = parseInt(el.dataset.count)
      if (!target) return
      const start = performance.now()
      const update = (now) => {
        const p = Math.min((now - start) / 1500, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        el.textContent = Math.floor(eased * target)
        if (p < 1) requestAnimationFrame(update)
        else el.textContent = target
      }
      requestAnimationFrame(update)
    }
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); counterObs.unobserve(e.target) } })
    }, { threshold: 0.5 })
    document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el))

    return () => { window.removeEventListener('scroll', onScroll); observer.disconnect(); counterObs.disconnect() }
  }, [])

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <div className="lp-root">
      <style>{CSS}</style>
      <div className="lp-noise" />

      {/* NAV */}
      <nav className="lp-nav" ref={navRef}>
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <div className="lp-logo-mark">S</div>
            <div>
              <div className="lp-logo-text">SRMS</div>
              <span className="lp-logo-sub">Student Record Management</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="lp-btn-ghost" onClick={() => scrollTo('lp-features')}>Features</button>
            <button className="lp-btn-gold" onClick={onEnter}>Sign In →</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-kente" />
        <div className="lp-hero-glow" />
        <div className="lp-badge">Built for Ghanaian Schools</div>
        <h1 className="lp-title">
          Every Student.<br />
          <span className="gold-line">Every Record.</span><br />
          One System.
        </h1>
        <p className="lp-sub">
          A complete <strong>school management platform</strong> built for Ghana —
          managing students, grades, attendance, fees, and staff with enterprise-grade security.
        </p>
        <div className="lp-actions">
          <button className="lp-btn-hero" onClick={onEnter}>
            Get Started
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
          <button className="lp-btn-hero-ghost" onClick={() => scrollTo('lp-features')}>See Features</button>
        </div>
        <div className="lp-stats">
          <div style={{ textAlign: 'center' }}>
            <span className="lp-stat-n" data-count="4">0</span>
            <span className="lp-stat-l">User Roles</span>
          </div>
          <div className="lp-stat-div" />
          <div style={{ textAlign: 'center' }}>
            <span className="lp-stat-n" data-count="6">0</span>
            <span className="lp-stat-l">Core Modules</span>
          </div>
          <div className="lp-stat-div" />
          <div style={{ textAlign: 'center' }}>
            <span className="lp-stat-n">Multi</span>
            <span className="lp-stat-l">School Support</span>
          </div>
          <div className="lp-stat-div" />
          <div style={{ textAlign: 'center' }}>
            <span className="lp-stat-n">Real-time</span>
            <span className="lp-stat-l">Data & Reports</span>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="lp-marquee">
        <div className="lp-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div className="lp-marquee-item" key={i}>
              <span className="lp-marquee-dot">◆</span> {item}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="lp-features" id="lp-features">
        <div className="lp-container">
          <div className="lp-reveal">
            <div className="lp-section-label">Core Modules</div>
            <h2 className="lp-section-title">Everything a school needs.<br />Nothing it doesn't.</h2>
            <p className="lp-section-sub">Six tightly integrated modules that cover the full academic and administrative lifecycle of any school.</p>
          </div>
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <div className={`lp-feat-card lp-reveal lp-d${(i % 3) + 1}`} key={i}>
                <div className="lp-feat-icon">{f.icon}</div>
                <div className="lp-feat-title">{f.title}</div>
                <p className="lp-feat-desc">{f.desc}</p>
                <span className="lp-feat-tag">{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="lp-roles">
        <div className="lp-kente" />
        <div className="lp-container" style={{ position: 'relative' }}>
          <div className="lp-reveal">
            <div className="lp-section-label">User Roles</div>
            <h2 className="lp-section-title">The right access for<br />the right person.</h2>
            <p className="lp-section-sub">Every staff member sees exactly what they need — and nothing more. Permissions enforced at the database level.</p>
          </div>
          <div className="lp-roles-grid">
            {ROLES.map((r, i) => (
              <div className={`lp-role-card lp-reveal lp-d${i + 1}`} key={i}>
                <div className="lp-role-avatar" style={{ background: r.bg }}>{r.icon}</div>
                <div className="lp-role-name">{r.name}</div>
                <p className="lp-role-desc">{r.desc}</p>
                <div className="lp-role-perms">
                  {r.perms.map((p, j) => (
                    <div className="lp-perm" key={j}>
                      <span className="lp-perm-dot" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="lp-trust">
        <div className="lp-container">
          <div className="lp-trust-grid">
            {[
              { n: '4', count: 4, l: 'Distinct permission roles\nenforced at database level' },
              { n: '6', count: 6, l: 'Integrated modules covering\nevery school operation' },
              { n: '100%', l: 'School data isolation —\nzero cross-school leakage' },
              { n: '∞', l: 'Schools supported on\na single platform' },
            ].map((t, i) => (
              <div className={`lp-trust-item lp-reveal lp-d${i + 1}`} key={i}>
                <span className="lp-trust-n" {...(t.count ? { 'data-count': t.count } : {})}>{t.n}</span>
                <div className="lp-trust-l">{t.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MULTI-SCHOOL */}
      <section className="lp-multi">
        <div className="lp-kente" />
        <div className="lp-container" style={{ position: 'relative' }}>
          <div className="lp-multi-grid">
            <div className="lp-reveal">
              <div className="lp-section-label">Multi-Tenant Platform</div>
              <h2 className="lp-section-title">One platform.<br />Many schools.</h2>
              <p className="lp-section-sub" style={{ marginBottom: 24 }}>
                SRMS serves school networks and education managers running multiple schools.
                Each school operates in a completely isolated environment.
              </p>
              {['Separate settings, grading scales, and calendars per school', 'Each superadmin sees only their own school', 'Shared infrastructure, zero shared data', 'Complete isolation between all schools'].map((p, i) => (
                <div className="lp-multi-perm" key={i}>
                  <span className="lp-perm-dot" />
                  {p}
                </div>
              ))}
            </div>
            <div className="lp-ms-visual lp-reveal lp-d2">
              <div className="lp-ms-ring lp-ms-ring-1" />
              <div className="lp-ms-ring lp-ms-ring-2" />
              <div className="lp-ms-ring lp-ms-ring-3" />
              <div className="lp-ms-center">SRMS</div>
              <div className="lp-ms-school lp-ms-s1">Secondary School</div>
              <div className="lp-ms-school lp-ms-s2">Basic School</div>
              <div className="lp-ms-school lp-ms-s3">High School</div>
              <div className="lp-ms-school lp-ms-s4">Junior High</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta-glow" />
        <div className="lp-container" style={{ position: 'relative' }}>
          <div className="lp-reveal">
            <h2 className="lp-cta-title">Ready to bring your<br />school records online?</h2>
            <p className="lp-cta-sub">Set up your school in minutes. No spreadsheets. No paper trails.</p>
            <div className="lp-cta-actions">
              <button className="lp-btn-hero" onClick={onEnter}>
                Get Started
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-copy">
              © 2026 SRMS · Built by <span>Zelva Studios</span> · Ghana
            </div>
            <div className="lp-footer-badge">SRMS · v2.0</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
