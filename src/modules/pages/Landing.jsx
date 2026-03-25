import { useEffect, useRef } from 'react'

const FEATURES = [
  { icon: '📊', title: 'Grades & Reports', desc: 'Weighted components, automatic totals, class rankings, and printable report cards generated in seconds.' },
  { icon: '📋', title: 'Attendance', desc: 'Daily batch marking with public holiday detection, vacation blocking, and full exportable history.' },
  { icon: '💳', title: 'Fee Management', desc: 'Multi-currency invoicing, bulk assignment, payment recording, arrear carry-forward, and printed receipts.' },
  { icon: '👥', title: 'Parent Portal', desc: 'A dedicated portal where parents view grades, attendance, fees, and announcements on your schedule.' },
]

const DETAIL_ITEMS = [
  { title: 'Role-based access control', desc: 'Super Admin, Admin, Class Teacher, Subject Teacher, and Parent — each with exactly the right access.' },
  { title: 'Full audit trail', desc: '365 days of searchable logs. Every change recorded with who, what, and when.' },
  { title: 'Academic year wizard', desc: 'Close one year and open the next — arrears carry over automatically.' },
  { title: 'Light and dark mode', desc: 'Looks great in both. Preference saved across sessions.' },
]

const DETAIL_CARDS = [
  { icon: '🔒', title: 'Secure by default', desc: 'Row-level security on every table. Your data never mixes with another school.' },
  { icon: '📱', title: 'Mobile friendly', desc: 'Works on any screen. Mark attendance from your phone.' },
  { icon: '🖨', title: 'Print ready', desc: 'Report cards, broadsheets, and receipts format perfectly for A4.' },
  { icon: '⚡', title: 'Fast', desc: 'Built on Supabase. Queries in milliseconds, not seconds.' },
]

const TICKER_ITEMS = [
  'Grades & Assessments', 'Attendance Tracking', 'Fee Management',
  'Parent Portal', 'PDF Report Cards', 'Audit Logging',
  'Multi-Role Access', 'Academic Year Wizard', 'Behaviour Records',
  'Class Broadsheet', 'Subject Reports', 'Multi-School Support',
  'Grades & Assessments', 'Attendance Tracking', 'Fee Management',
  'Parent Portal', 'PDF Report Cards', 'Audit Logging',
  'Multi-Role Access', 'Academic Year Wizard', 'Behaviour Records',
  'Class Broadsheet', 'Subject Reports', 'Multi-School Support',
]

const MOCK_ROWS = [
  { init: 'KM', name: 'Kofi Mensah', score: 92, grade: 'A', avBg: 'rgba(232,184,75,0.15)', avC: '#e8b84b', gBg: 'rgba(45,212,160,0.12)', gC: '#2dd4a0' },
  { init: 'AA', name: 'Ama Asante',  score: 85, grade: 'B', avBg: 'rgba(91,168,245,0.15)',  avC: '#5ba8f5', gBg: 'rgba(91,168,245,0.12)',  gC: '#5ba8f5' },
  { init: 'EK', name: 'Esi Kyei',    score: 78, grade: 'B', avBg: 'rgba(45,212,160,0.15)',  avC: '#2dd4a0', gBg: 'rgba(91,168,245,0.12)',  gC: '#5ba8f5' },
]

const CSS = `
html, body, #root { border: none !important; outline: none !important; box-shadow: none !important; background: #0c0c15 !important; }
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

/* NAV */
.lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; transition: background 0.35s, border-color 0.35s; }
.lp-nav.scrolled { background: rgba(12,12,21,0.94); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.06); }
.lp-nav-inner { max-width: 1200px; margin: 0 auto; height: 64px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
.lp-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.lp-logo-mark { width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; background: linear-gradient(135deg, #c49a2e, #e8b84b); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px; color: #0c0c15; box-shadow: 0 4px 14px rgba(232,184,75,0.3); }
.lp-logo-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; color: #f0f0fa; letter-spacing: -0.01em; }
.lp-nav-links { display: flex; align-items: center; gap: 32px; }
.lp-nav-link { font-size: 13px; font-weight: 500; color: rgba(232,232,240,0.5); cursor: pointer; transition: color 0.2s; background: none; border: none; font-family: 'Plus Jakarta Sans', sans-serif; padding: 0; }
.lp-nav-link:hover { color: #e8e8f0; }
.lp-nav-actions { display: flex; align-items: center; gap: 10px; }
.lp-btn-ghost { padding: 8px 20px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(232,232,240,0.65); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-btn-ghost:hover { border-color: rgba(255,255,255,0.22); color: #e8e8f0; }
.lp-btn-gold { padding: 8px 22px; background: #e8b84b; border: none; border-radius: 8px; color: #0c0c15; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-btn-gold:hover { background: #f5c84e; box-shadow: 0 4px 20px rgba(232,184,75,0.35); }

/* HERO */
.lp-hero { min-height: 100vh; position: relative; display: flex; align-items: center; padding: 120px 32px 80px; overflow: hidden; }
.lp-hero-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 65% 55% at 75% 45%, rgba(232,184,75,0.05) 0%, transparent 65%), radial-gradient(ellipse 45% 45% at 15% 75%, rgba(91,168,245,0.04) 0%, transparent 60%); }
.lp-grid { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(232,184,75,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,184,75,0.03) 1px, transparent 1px); background-size: 72px 72px; mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 25%, transparent 80%); -webkit-mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 25%, transparent 80%); }
.lp-hero-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
.lp-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(232,184,75,0.07); border: 1px solid rgba(232,184,75,0.18); border-radius: 100px; padding: 6px 14px 6px 10px; margin-bottom: 28px; }
.lp-pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #e8b84b; flex-shrink: 0; box-shadow: 0 0 8px rgba(232,184,75,0.6); animation: lp-pulse 2.2s ease-in-out infinite; }
@keyframes lp-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }
.lp-pill-text { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600; color: #e8b84b; letter-spacing: 0.06em; text-transform: uppercase; }
.lp-h1 { font-family: 'Syne', sans-serif; font-size: 64px; font-weight: 800; line-height: 1.02; letter-spacing: -0.03em; color: #f0f0fa; margin-bottom: 24px; }
.lp-h1-gold { color: #e8b84b; }
.lp-h1-dim { color: rgba(240,240,250,0.3); font-weight: 300; }
.lp-sub { font-size: 16px; font-weight: 400; color: rgba(232,232,240,0.5); line-height: 1.75; max-width: 420px; margin-bottom: 36px; }
.lp-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.lp-btn-hero { padding: 13px 28px; background: #e8b84b; border: none; border-radius: 10px; color: #0c0c15; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.22s; font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-btn-hero:hover { background: #f5c84e; box-shadow: 0 8px 28px rgba(232,184,75,0.3); transform: translateY(-1px); }
.lp-btn-outline { padding: 13px 24px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; color: rgba(232,232,240,0.65); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-btn-outline:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.16); color: #e8e8f0; }
.lp-trust { display: flex; align-items: center; gap: 12px; margin-top: 32px; }
.lp-trust-avatars { display: flex; }
.lp-trust-av { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #0c0c15; margin-left: -8px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
.lp-trust-av:first-child { margin-left: 0; }
.lp-trust-text { font-size: 12px; color: rgba(232,232,240,0.4); }
.lp-trust-text strong { color: rgba(232,232,240,0.7); font-weight: 600; }

/* MOCKUP */
.lp-mockup-wrap { position: relative; }
.lp-mockup-glow { position: absolute; bottom: -50px; left: 50%; transform: translateX(-50%); width: 70%; height: 70px; background: radial-gradient(ellipse, rgba(232,184,75,0.18) 0%, transparent 70%); filter: blur(24px); pointer-events: none; z-index: 0; }
.lp-mockup { position: relative; z-index: 1; background: #11111c; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05); }
.lp-mock-bar { background: #0d0d18; height: 40px; padding: 0 14px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.055); }
.lp-mock-dots { display: flex; gap: 5px; }
.lp-mock-dot { width: 9px; height: 9px; border-radius: 50%; }
.lp-mock-url { flex: 1; height: 20px; background: rgba(255,255,255,0.04); border-radius: 5px; max-width: 180px; margin: 0 auto; }
.lp-mock-body { display: flex; }
.lp-mock-sidebar { width: 52px; background: #0d0d18; border-right: 1px solid rgba(255,255,255,0.055); padding: 14px 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.lp-mock-logo { width: 28px; height: 28px; border-radius: 7px; background: #e8b84b; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #0c0c15; font-family: 'Syne', sans-serif; margin-bottom: 12px; }
.lp-mock-si { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: rgba(232,232,240,0.28); position: relative; }
.lp-mock-si.act { background: rgba(232,184,75,0.09); color: #e8b84b; }
.lp-mock-si.act::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 2px; height: 14px; background: #e8b84b; border-radius: 2px; }
.lp-mock-content { flex: 1; padding: 16px; overflow: hidden; }
.lp-mock-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #f0f0fa; margin-bottom: 12px; }
.lp-mock-kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 12px; }
.lp-mock-kpi { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 10px 12px; }
.lp-mock-kval { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; line-height: 1; color: #f0f0fa; }
.lp-mock-kval.gold { color: #e8b84b; }
.lp-mock-kval.green { color: #2dd4a0; }
.lp-mock-klbl { font-size: 9px; color: rgba(232,232,240,0.3); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
.lp-mock-table { background: rgba(255,255,255,0.02); border-radius: 8px; overflow: hidden; }
.lp-mock-thead { display: grid; grid-template-columns: 22px 1fr 36px 28px; gap: 8px; padding: 7px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.lp-mock-th { font-size: 8px; color: rgba(232,232,240,0.22); text-transform: uppercase; letter-spacing: 0.1em; }
.lp-mock-tr { display: grid; grid-template-columns: 22px 1fr 36px 28px; gap: 8px; padding: 8px 12px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); }
.lp-mock-tr:last-child { border-bottom: none; }
.lp-mock-av { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; flex-shrink: 0; }
.lp-mock-name { font-size: 11px; font-weight: 500; color: rgba(232,232,240,0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lp-mock-score { font-size: 11px; font-weight: 700; color: #f0f0fa; text-align: right; }
.lp-mock-grade { font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 10px; text-align: center; }

/* TICKER */
.lp-ticker { border-top: 1px solid rgba(255,255,255,0.055); border-bottom: 1px solid rgba(255,255,255,0.055); background: rgba(232,184,75,0.02); padding: 13px 0; overflow: hidden; }
.lp-ticker-track { display: flex; animation: lp-ticker 32s linear infinite; width: max-content; }
@keyframes lp-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.lp-ticker-item { display: flex; align-items: center; gap: 14px; padding: 0 32px; border-right: 1px solid rgba(255,255,255,0.055); font-family: 'Space Mono', monospace; font-size: 10px; color: rgba(232,184,75,0.5); letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }

/* FEATURES */
.lp-features { padding: 80px 32px 60px; background: #0c0c15; }
.lp-features-inner { max-width: 1200px; margin: 0 auto; }
.lp-eyebrow { display: flex; align-items: center; gap: 12px; font-family: 'Space Mono', monospace; font-size: 10px; color: #e8b84b; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 16px; }
.lp-eyebrow::before { content: ''; width: 24px; height: 1px; background: #e8b84b; flex-shrink: 0; }
.lp-section-title { font-family: 'Syne', sans-serif; font-size: 38px; font-weight: 800; color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 12px; max-width: 500px; }
.lp-section-sub { font-size: 15px; color: rgba(232,232,240,0.45); margin-bottom: 52px; max-width: 460px; line-height: 1.7; }
.lp-feat-grid { display: grid; grid-template-columns: repeat(4,1fr); border-radius: 14px; overflow: hidden; outline: 1px solid rgba(255,255,255,0.06); }
.lp-feat { padding: 36px 28px; border-right: 1px solid rgba(255,255,255,0.06); background: #0a0a12; transition: background 0.25s; position: relative; overflow: hidden; }
.lp-feat:last-child { border-right: none; }
.lp-feat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: #e8b84b; transform: scaleX(0); transform-origin: left; transition: transform 0.3s; }
.lp-feat:hover { background: rgba(232,184,75,0.03); }
.lp-feat:hover::before { transform: scaleX(1); }
.lp-feat-icon { width: 40px; height: 40px; border-radius: 10px; margin-bottom: 18px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: rgba(255,255,255,0.04); }
.lp-feat-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #f0f0fa; margin-bottom: 10px; }
.lp-feat-desc { font-size: 13px; color: rgba(232,232,240,0.4); line-height: 1.7; }

/* STATS */
.lp-stats { border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); background: #0a0a14; }
.lp-stats-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4,1fr); }
.lp-stat { padding: 52px 40px; border-right: 1px solid rgba(255,255,255,0.05); }
.lp-stat:last-child { border-right: none; }
.lp-stat-num { font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800; color: #f0f0fa; line-height: 1; letter-spacing: -0.03em; }
.lp-stat-num sup { font-size: 0.45em; color: #e8b84b; vertical-align: super; }
.lp-stat-lbl { font-size: 13px; color: rgba(232,232,240,0.4); margin-top: 10px; line-height: 1.5; }

/* DETAIL */
.lp-detail { padding: 90px 32px; background: #0c0c15; }
.lp-detail-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.lp-detail-title { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 16px; }
.lp-detail-body { font-size: 15px; color: rgba(232,232,240,0.45); line-height: 1.8; margin-bottom: 32px; }
.lp-detail-list { display: flex; flex-direction: column; gap: 14px; }
.lp-detail-item { display: flex; align-items: flex-start; gap: 12px; }
.lp-detail-check { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; background: rgba(45,212,160,0.1); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #2dd4a0; margin-top: 2px; }
.lp-detail-text { font-size: 14px; color: rgba(232,232,240,0.6); line-height: 1.6; }
.lp-detail-text strong { color: #f0f0fa; font-weight: 600; }
.lp-detail-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lp-detail-card { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 24px; transition: background 0.25s; }
.lp-detail-card:hover { background: rgba(232,184,75,0.04); }
.lp-detail-card-icon { font-size: 22px; margin-bottom: 12px; display: block; }
.lp-detail-card-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #f0f0fa; margin-bottom: 6px; }
.lp-detail-card-desc { font-size: 12px; color: rgba(232,232,240,0.38); line-height: 1.65; }

/* CTA */
.lp-cta { padding: 120px 32px; background: #0a0a14; border-top: 1px solid rgba(255,255,255,0.055); position: relative; overflow: hidden; }
.lp-cta-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 55% 65% at 50% 50%, rgba(232,184,75,0.05) 0%, transparent 65%); }
.lp-cta-inner { max-width: 600px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
.lp-cta-title { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800; color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 18px; }
.lp-cta-sub { font-size: 16px; color: rgba(232,232,240,0.45); margin-bottom: 40px; line-height: 1.7; }
.lp-cta-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.lp-cta-btn { padding: 14px 38px; background: #e8b84b; border: none; border-radius: 10px; color: #0c0c15; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.22s; font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-cta-btn:hover { background: #f5c84e; box-shadow: 0 10px 36px rgba(232,184,75,0.3); transform: translateY(-1px); }
.lp-cta-sec { padding: 14px 30px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: rgba(232,232,240,0.55); font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-cta-sec:hover { border-color: rgba(255,255,255,0.2); color: #e8e8f0; }

/* FOOTER */
.lp-footer { border-top: 1px solid rgba(255,255,255,0.055); padding: 36px 32px; background: #09090f; }
.lp-footer-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.lp-footer-logo { display: flex; align-items: center; gap: 8px; }
.lp-footer-mark { width: 26px; height: 26px; border-radius: 7px; background: linear-gradient(135deg, #c49a2e, #e8b84b); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 12px; color: #0c0c15; }
.lp-footer-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: rgba(240,240,250,0.55); }
.lp-footer-copy { font-size: 12px; color: rgba(232,232,240,0.28); }
.lp-footer-links { display: flex; gap: 22px; }
.lp-footer-link { font-size: 12px; color: rgba(232,232,240,0.32); cursor: pointer; transition: color 0.2s; background: none; border: none; font-family: 'Plus Jakarta Sans', sans-serif; padding: 0; }
.lp-footer-link:hover { color: rgba(232,232,240,0.7); }

/* RESPONSIVE */
@media (max-width: 960px) {
  .lp-nav-links { display: none; }
  .lp-hero-inner { grid-template-columns: 1fr; gap: 40px; }
  .lp-h1 { font-size: 44px; }
  .lp-mockup-wrap { display: none; }
  .lp-feat-grid { grid-template-columns: 1fr 1fr; }
  .lp-feat { border-bottom: 1px solid rgba(255,255,255,0.06); }
  .lp-stats-inner { grid-template-columns: 1fr 1fr; }
  .lp-stat { border-bottom: 1px solid rgba(255,255,255,0.05); }
  .lp-detail-inner { grid-template-columns: 1fr; gap: 48px; }
  .lp-section-title { font-size: 30px; }
  .lp-cta-title { font-size: 32px; }
}
@media (max-width: 600px) {
  .lp-hero { padding: 100px 20px 60px; }
  .lp-h1 { font-size: 36px; }
  .lp-features, .lp-detail, .lp-cta { padding: 60px 20px; }
  .lp-feat-grid { grid-template-columns: 1fr; }
  .lp-detail-cards { grid-template-columns: 1fr; }
  .lp-stat { padding: 36px 24px; }
  .lp-stat-num { font-size: 38px; }
  .lp-footer-inner { flex-direction: column; align-items: flex-start; gap: 16px; }
}
`

export default function Landing({ onEnter, onShowPlans }) {  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) navRef.current.classList.toggle('scrolled', window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: '#0c0c15', color: '#e8e8f0', overflowX: 'hidden', lineHeight: '1.6' }}>
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="lp-nav" ref={navRef}>
        <div className="lp-nav-inner">
          <div className="lp-logo" onClick={onEnter}>
            <div className="lp-logo-mark">S</div>
            <span className="lp-logo-text">SRMS</span>
          </div>
          <div className="lp-nav-links">
            <button className="lp-nav-link">Features</button>
            <button className="lp-nav-link">Roles</button>
            <button className="lp-nav-link" onClick={onShowPlans}>Pricing</button>          </div>
          <div className="lp-nav-actions">
            <button className="lp-btn-ghost" onClick={onEnter}>Sign In</button>
            <button className="lp-btn-gold" onClick={onEnter}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-grid" />
        <div className="lp-hero-inner">

          <div>
            <div className="lp-pill">
              <div className="lp-pill-dot" />
              <span className="lp-pill-text">Built for Schools</span>
            </div>
            <h1 className="lp-h1">
              Every record,<br />
              <span className="lp-h1-gold">perfectly</span><br />
              <span className="lp-h1-dim">organised.</span>
            </h1>
            <p className="lp-sub">
              The complete school management platform. Grades, attendance, fees, reports, and a parent portal — all in one system.
            </p>
            <div className="lp-actions">
              <button className="lp-btn-hero" onClick={onEnter}>Get Started Free →</button>
              <button className="lp-btn-outline" onClick={onEnter}>Sign In</button>
            </div>
            <div className="lp-trust">
              <div className="lp-trust-avatars">
                <div className="lp-trust-av" style={{ background: 'rgba(232,184,75,0.15)', color: '#e8b84b' }}>KM</div>
                <div className="lp-trust-av" style={{ background: 'rgba(45,212,160,0.15)', color: '#2dd4a0' }}>AA</div>
                <div className="lp-trust-av" style={{ background: 'rgba(91,168,245,0.15)', color: '#5ba8f5' }}>EK</div>
              </div>
              <span className="lp-trust-text">Trusted by <strong>schools across Ghana</strong></span>
            </div>
          </div>

          <div className="lp-mockup-wrap">
            <div className="lp-mockup-glow" />
            <div className="lp-mockup">
              <div className="lp-mock-bar">
                <div className="lp-mock-dots">
                  <div className="lp-mock-dot" style={{ background: '#ff5f57' }} />
                  <div className="lp-mock-dot" style={{ background: '#febc2e' }} />
                  <div className="lp-mock-dot" style={{ background: '#28c840' }} />
                </div>
                <div className="lp-mock-url" />
              </div>
              <div className="lp-mock-body">
                <div className="lp-mock-sidebar">
                  <div className="lp-mock-logo">S</div>
                  <div className="lp-mock-si act">▦</div>
                  <div className="lp-mock-si">◈</div>
                  <div className="lp-mock-si">[=]</div>
                  <div className="lp-mock-si">◎</div>
                  <div className="lp-mock-si">◉</div>
                  <div className="lp-mock-si">◇</div>
                </div>
                <div className="lp-mock-content">
                  <div className="lp-mock-title">Dashboard</div>
                  <div className="lp-mock-kpis">
                    <div className="lp-mock-kpi">
                      <div className="lp-mock-kval">38</div>
                      <div className="lp-mock-klbl">Students</div>
                    </div>
                    <div className="lp-mock-kpi">
                      <div className="lp-mock-kval gold">₵48k</div>
                      <div className="lp-mock-klbl">Collected</div>
                    </div>
                    <div className="lp-mock-kpi">
                      <div className="lp-mock-kval green">94%</div>
                      <div className="lp-mock-klbl">Attendance</div>
                    </div>
                  </div>
                  <div className="lp-mock-table">
                    <div className="lp-mock-thead">
                      <div className="lp-mock-th" />
                      <div className="lp-mock-th">Student</div>
                      <div className="lp-mock-th">Score</div>
                      <div className="lp-mock-th">Grade</div>
                    </div>
                    {MOCK_ROWS.map((r, i) => (
                      <div className="lp-mock-tr" key={i}>
                        <div className="lp-mock-av" style={{ background: r.avBg, color: r.avC }}>{r.init}</div>
                        <div className="lp-mock-name">{r.name}</div>
                        <div className="lp-mock-score">{r.score}</div>
                        <div className="lp-mock-grade" style={{ background: r.gBg, color: r.gC }}>{r.grade}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* TICKER */}
      <div className="lp-ticker">
        <div className="lp-ticker-track">
          {TICKER_ITEMS.map((item, i) => (
            <div className="lp-ticker-item" key={i}>
              ◆ {item}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="lp-features">
        <div className="lp-features-inner">
          <div className="lp-eyebrow">What it does</div>
          <h2 className="lp-section-title">Everything a school needs, nothing it doesn't.</h2>
          <p className="lp-section-sub">Purpose-built for the full academic cycle — from first enrolment to end-of-year report cards.</p>
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <div className="lp-feat" key={i}>
                <div className="lp-feat-icon">{f.icon}</div>
                <div className="lp-feat-title">{f.title}</div>
                <div className="lp-feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="lp-stats">
        <div className="lp-stats-inner">
          <div className="lp-stat">
            <div className="lp-stat-num">5<sup>+</sup></div>
            <div className="lp-stat-lbl">User roles with scoped access</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">1<sup>click</sup></div>
            <div className="lp-stat-lbl">Report card generation</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">365<sup>d</sup></div>
            <div className="lp-stat-lbl">Audit history per school</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">0</div>
            <div className="lp-stat-lbl">Data shared between schools</div>
          </div>
        </div>
      </div>

      {/* DETAIL */}
      <section className="lp-detail">
        <div className="lp-detail-inner">
          <div>
            <div className="lp-eyebrow">Built right</div>
            <h2 className="lp-detail-title">Designed for the people who run schools.</h2>
            <p className="lp-detail-body">Not just a grade book. SRMS handles the full complexity of school administration — access control, audit trails, year transitions, and a separate portal for parents.</p>
            <div className="lp-detail-list">
              {DETAIL_ITEMS.map((item, i) => (
                <div className="lp-detail-item" key={i}>
                  <div className="lp-detail-check">✓</div>
                  <div className="lp-detail-text">
                    <strong>{item.title}</strong> — {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-detail-cards">
            {DETAIL_CARDS.map((card, i) => (
              <div className="lp-detail-card" key={i}>
                <span className="lp-detail-card-icon">{card.icon}</span>
                <div className="lp-detail-card-title">{card.title}</div>
                <div className="lp-detail-card-desc">{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta-bg" />
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to run a smarter school?</h2>
          <p className="lp-cta-sub">Set up in minutes. No training needed. Free to start.</p>
          <div className="lp-cta-actions">
            <button className="lp-cta-btn" onClick={onEnter}>Get Started Free</button>
            <button className="lp-cta-sec" onClick={onEnter}>Sign In →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-logo">
            <div className="lp-footer-mark">S</div>
            <span className="lp-footer-name">SRMS</span>
          </div>
          <span className="lp-footer-copy">© {new Date().getFullYear()} Zelva Studios. All rights reserved.</span>
          <div className="lp-footer-links">
            <button className="lp-footer-link">Privacy Policy</button>
            <button className="lp-footer-link">Terms</button>
            <button className="lp-footer-link">Contact</button>
          </div>
        </div>
      </footer>

    </div>
  )
}
