import { useEffect, useRef, useState } from 'react'
import LogoMark from '../components/LogoMark'

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
  { init: 'KM', name: 'Kofi Mensah', cls: 'Class 6A', score: 92, avBg: 'rgba(232,184,75,0.15)', avC: '#e8b84b', rankBg: 'rgba(232,184,75,0.18)', rankC: '#e8b84b' },
  { init: 'AA', name: 'Ama Asante',  cls: 'Class 6A', score: 88, avBg: 'rgba(255,255,255,0.08)', avC: 'rgba(232,232,240,0.7)', rankBg: 'rgba(255,255,255,0.08)', rankC: 'rgba(232,232,240,0.55)' },
  { init: 'EK', name: 'Esi Kyei',    cls: 'Class 6A', score: 85, avBg: 'rgba(251,159,58,0.15)', avC: '#fb9f3a', rankBg: 'rgba(251,159,58,0.15)', rankC: '#fb9f3a' },
]

const MOCK_KPIS = [
  { lbl: 'Total Students',  val: '342', color: '#e8b84b' },
  { lbl: 'Attendance Rate', val: '94%', color: '#2dd4a0' },
  { lbl: 'Average Score',   val: '78',  color: '#5ba8f5' },
  { lbl: 'Fee Collection',  val: '86%', color: '#fb9f3a' },
]

const STATS = [
  { to: 5,   suffix: '+',     lbl: 'User roles with scoped access' },
  { to: 1,   suffix: 'click', lbl: 'Report card generation' },
  { to: 365, suffix: 'd',     lbl: 'Audit history per school' },
  { to: 0,   suffix: '',      lbl: 'Data shared between schools' },
]

const CSS = `
html, body, #root { border: none !important; outline: none !important; box-shadow: none !important; background: #08080f !important; }
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

* { box-sizing: border-box; }

/* AURORA BACKGROUND */
.lp-aurora { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.lp-blob { position: absolute; border-radius: 50%; filter: blur(90px); will-change: transform; }
.lp-blob.a { width: 560px; height: 560px; top: -140px; left: -100px; background: radial-gradient(circle, rgba(232,184,75,0.30), transparent 70%); animation: lp-drift-a 24s ease-in-out infinite; }
.lp-blob.b { width: 620px; height: 620px; bottom: -180px; right: -120px; background: radial-gradient(circle, rgba(91,168,245,0.24), transparent 70%); animation: lp-drift-b 30s ease-in-out infinite; }
.lp-blob.c { width: 480px; height: 480px; top: 38%; left: 48%; background: radial-gradient(circle, rgba(167,139,250,0.20), transparent 70%); animation: lp-drift-c 20s ease-in-out infinite; }
@keyframes lp-drift-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(90px,60px) scale(1.15); } }
@keyframes lp-drift-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,-55px) scale(1.1); } }
@keyframes lp-drift-c { 0%,100% { transform: translate(-50%,0) scale(1); } 50% { transform: translate(-50%,50px) scale(0.88); } }
.lp-grid { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: linear-gradient(rgba(232,184,75,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(232,184,75,0.045) 1px, transparent 1px); background-size: 64px 64px; mask-image: radial-gradient(ellipse 85% 75% at 50% 20%, black 10%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse 85% 75% at 50% 20%, black 10%, transparent 75%); }
.lp-noise::after { content:''; position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.025; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 200px; }

/* REVEAL ON SCROLL */
.lp-reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.8s cubic-bezier(.16,1,.3,1), transform 0.8s cubic-bezier(.16,1,.3,1); }
.lp-reveal.visible { opacity: 1; transform: translateY(0); }
.lp-r1 { transition-delay: 0.06s; } .lp-r2 { transition-delay: 0.12s; } .lp-r3 { transition-delay: 0.18s; } .lp-r4 { transition-delay: 0.24s; }

/* GRADIENT / GLOW UTILITIES */
.lp-gradient-text { background: linear-gradient(90deg, #e8b84b, #f5d07a, #5ba8f5, #a78bfa, #e8b84b); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: lp-gradient-shift 7s ease infinite; }
@keyframes lp-gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.lp-glass { background: rgba(255,255,255,0.035); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
.lp-glow-border { position: relative; isolation: isolate; }
.lp-glow-border::before { content: ''; position: absolute; inset: -1px; border-radius: inherit; padding: 1px; background: linear-gradient(135deg, rgba(232,184,75,0.7), rgba(91,168,245,0.45), rgba(167,139,250,0.5)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0; transition: opacity 0.35s; pointer-events: none; z-index: 2; }
.lp-glow-border:hover::before { opacity: 1; }

/* NAV */
.lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; transition: background 0.35s, border-color 0.35s; }
.lp-nav.scrolled { background: rgba(8,8,15,0.82); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(232,184,75,0.12); }
.lp-nav-inner { max-width: 1200px; margin: 0 auto; height: 64px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
.lp-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.lp-logo-mark { width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; background: linear-gradient(135deg, #c49a2e, #e8b84b); display: flex; align-items: center; justify-content: center; font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 15px; color: #08080f; box-shadow: 0 4px 18px rgba(232,184,75,0.4); transition: box-shadow 0.3s, transform 0.3s; }
.lp-logo:hover .lp-logo-mark { box-shadow: 0 4px 26px rgba(232,184,75,0.6); transform: rotate(-6deg) scale(1.05); }
.lp-logo-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 17px; color: #f0f0fa; letter-spacing: -0.01em; }
.lp-nav-links { display: flex; align-items: center; gap: 32px; }
.lp-nav-link { position: relative; font-size: 13px; font-weight: 500; color: rgba(232,232,240,0.55); cursor: pointer; transition: color 0.2s; background: none; border: none; font-family: 'Inter', sans-serif; padding: 4px 0; }
.lp-nav-link::after { content: ''; position: absolute; left: 0; bottom: 0; width: 0; height: 1px; background: linear-gradient(90deg, #e8b84b, #5ba8f5); transition: width 0.25s; }
.lp-nav-link:hover { color: #e8e8f0; }
.lp-nav-link:hover::after { width: 100%; }
.lp-nav-actions { display: flex; align-items: center; gap: 10px; }
.lp-btn-ghost { padding: 8px 20px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(232,232,240,0.65); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
.lp-btn-ghost:hover { border-color: rgba(255,255,255,0.24); color: #e8e8f0; background: rgba(255,255,255,0.03); }
.lp-btn-gold { padding: 8px 22px; background: #e8b84b; border: none; border-radius: 8px; color: #08080f; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
.lp-btn-gold:hover { background: #f5c84e; box-shadow: 0 4px 22px rgba(232,184,75,0.4); transform: translateY(-1px); }

/* HERO */
.lp-hero { position: relative; min-height: 100vh; display: flex; align-items: center; padding: 120px 32px 80px; overflow: hidden; }
.lp-spotlight { position: absolute; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(560px circle at var(--mx,50%) var(--my,30%), rgba(232,184,75,0.10), transparent 42%); transition: opacity 0.3s; }
.lp-hero-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
.lp-pill { display: inline-flex; align-items: center; gap: 8px; border-radius: 100px; padding: 6px 14px 6px 10px; margin-bottom: 28px; font-family: 'Space Mono', monospace; }
.lp-pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #e8b84b; flex-shrink: 0; box-shadow: 0 0 10px rgba(232,184,75,0.7); animation: lp-pulse 2.2s ease-in-out infinite; }
@keyframes lp-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
.lp-pill-text { font-size: 10.5px; font-weight: 700; color: #e8b84b; letter-spacing: 0.1em; text-transform: uppercase; }
.lp-h1 { font-family: 'Space Grotesk', sans-serif; font-size: 64px; font-weight: 800; line-height: 1.02; letter-spacing: -0.03em; color: #f0f0fa; margin-bottom: 24px; }
.lp-h1-dim { color: rgba(240,240,250,0.28); font-weight: 300; }
.lp-sub { font-size: 16px; font-weight: 400; color: rgba(232,232,240,0.5); line-height: 1.75; max-width: 420px; margin-bottom: 36px; }
.lp-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.lp-btn-hero { padding: 13px 28px; background: #e8b84b; border: none; border-radius: 10px; color: #08080f; font-size: 14px; font-weight: 700; cursor: pointer; transition: background 0.22s, box-shadow 0.22s; }
.lp-btn-hero:hover { background: #f5c84e; box-shadow: 0 10px 34px rgba(232,184,75,0.35); }
.lp-magnet { transition: transform 0.15s ease-out; }
.lp-trust { display: flex; align-items: center; gap: 12px; margin-top: 32px; }
.lp-trust-avatars { display: flex; }
.lp-trust-av { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #08080f; margin-left: -8px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
.lp-trust-av:first-child { margin-left: 0; }
.lp-trust-text { font-size: 12px; color: rgba(232,232,240,0.4); }
.lp-trust-text strong { color: rgba(232,232,240,0.7); font-weight: 600; }

/* MOCKUP */
.lp-mockup-wrap { position: relative; perspective: 1200px; }
.lp-mockup-glow { position: absolute; bottom: -50px; left: 50%; transform: translateX(-50%); width: 70%; height: 70px; background: radial-gradient(ellipse, rgba(232,184,75,0.22) 0%, transparent 70%); filter: blur(24px); pointer-events: none; z-index: 0; }
.lp-mockup { position: relative; z-index: 1; background: #10101c; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; box-shadow: 0 40px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06); transition: transform 0.15s ease-out; transform-style: preserve-3d; }
.lp-mockup::after { content: ''; position: absolute; left: 0; right: 0; height: 90px; background: linear-gradient(180deg, rgba(232,184,75,0.08), transparent); pointer-events: none; animation: lp-scan 5s ease-in-out infinite; }
@keyframes lp-scan { 0% { top: -90px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
.lp-mock-bar { background: #0c0c16; height: 40px; padding: 0 14px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.lp-mock-dots { display: flex; gap: 5px; }
.lp-mock-dot { width: 9px; height: 9px; border-radius: 50%; }
.lp-mock-url { flex: 1; height: 20px; background: rgba(255,255,255,0.045); border-radius: 5px; max-width: 180px; margin: 0 auto; }
.lp-mock-body { display: flex; }
.lp-mock-sidebar { width: 52px; background: #0c0c16; border-right: 1px solid rgba(255,255,255,0.06); padding: 14px 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.lp-mock-logo { width: 28px; height: 28px; border-radius: 7px; background: #e8b84b; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #08080f; font-family: 'Space Grotesk', sans-serif; margin-bottom: 12px; }
.lp-mock-si { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: rgba(232,232,240,0.3); position: relative; }
.lp-mock-si.act { background: rgba(232,184,75,0.1); color: #e8b84b; }
.lp-mock-si.act::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 2px; height: 14px; background: #e8b84b; border-radius: 2px; box-shadow: 0 0 8px rgba(232,184,75,0.7); }
.lp-mock-content { flex: 1; padding: 16px; overflow: hidden; }
.lp-mock-title { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; color: #f0f0fa; }
.lp-mock-sub { font-size: 9.5px; color: rgba(232,232,240,0.32); margin: 3px 0 12px; }
.lp-mock-kpis { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; margin-bottom: 14px; }
.lp-mock-kpi { position: relative; background: rgba(255,255,255,0.035); border-radius: 8px; padding: 9px 10px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
.lp-mock-kpi::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--kc,#e8b84b), transparent); }
.lp-mock-klbl-row { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; }
.lp-mock-kdot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }
.lp-mock-klbl { font-size: 8px; color: rgba(232,232,240,0.35); text-transform: uppercase; letter-spacing: 0.07em; }
.lp-mock-kval { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 700; line-height: 1; }
.lp-mock-top-title { font-size: 8.5px; color: rgba(232,232,240,0.32); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 7px; }
.lp-mock-prow { display: flex; align-items: center; gap: 7px; padding: 6px 8px; background: rgba(255,255,255,0.02); border-radius: 6px; border-left: 2px solid var(--kc,#e8b84b); margin-bottom: 4px; }
.lp-mock-prow:last-child { margin-bottom: 0; }
.lp-mock-rank { width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; flex-shrink: 0; }
.lp-mock-av { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; flex-shrink: 0; }
.lp-mock-pname { font-size: 10.5px; font-weight: 600; color: rgba(232,232,240,0.85); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lp-mock-pcls { font-size: 8.5px; color: rgba(232,232,240,0.32); margin-top: 1px; }
.lp-mock-pscore { font-size: 12px; font-weight: 700; flex-shrink: 0; }

/* TICKER */
.lp-ticker { position: relative; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(232,184,75,0.025); padding: 13px 0; overflow: hidden; mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent); }
.lp-ticker-track { display: flex; animation: lp-ticker 32s linear infinite; width: max-content; }
@keyframes lp-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.lp-ticker-item { display: flex; align-items: center; gap: 14px; padding: 0 32px; border-right: 1px solid rgba(255,255,255,0.06); font-family: 'Space Mono', monospace; font-size: 10px; color: rgba(232,184,75,0.55); letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }

/* FEATURES */
.lp-features { position: relative; z-index: 1; padding: 80px 32px 60px; }
.lp-features-inner { max-width: 1200px; margin: 0 auto; }
.lp-eyebrow { display: flex; align-items: center; gap: 12px; font-family: 'Space Mono', monospace; font-size: 10px; color: #e8b84b; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 16px; }
.lp-eyebrow::before { content: ''; width: 24px; height: 1px; background: linear-gradient(90deg, #e8b84b, transparent); flex-shrink: 0; }
.lp-section-title { font-family: 'Space Grotesk', sans-serif; font-size: 38px; font-weight: 800; color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 12px; max-width: 500px; }
.lp-section-sub { font-size: 15px; color: rgba(232,232,240,0.45); margin-bottom: 52px; max-width: 460px; line-height: 1.7; }
.lp-feat-grid { display: grid; grid-template-columns: repeat(4,1fr); border-radius: 16px; overflow: hidden; gap: 1px; background: rgba(255,255,255,0.06); }
.lp-feat { padding: 36px 28px; background: #0a0a13; transition: background 0.3s, transform 0.3s; position: relative; overflow: hidden; }
.lp-feat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #e8b84b, #5ba8f5); transform: scaleX(0); transform-origin: left; transition: transform 0.35s; }
.lp-feat:hover { background: rgba(232,184,75,0.045); transform: translateY(-3px); }
.lp-feat:hover::before { transform: scaleX(1); }
.lp-feat-icon { width: 40px; height: 40px; border-radius: 10px; margin-bottom: 18px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: rgba(255,255,255,0.045); transition: transform 0.3s; }
.lp-feat:hover .lp-feat-icon { transform: scale(1.1) rotate(-4deg); }
.lp-feat-title { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #f0f0fa; margin-bottom: 10px; }
.lp-feat-desc { font-size: 13px; color: rgba(232,232,240,0.4); line-height: 1.7; }

/* STATS */
.lp-stats { position: relative; z-index: 1; border-top: 1px solid rgba(255,255,255,0.055); border-bottom: 1px solid rgba(255,255,255,0.055); background: rgba(10,10,20,0.5); backdrop-filter: blur(8px); }
.lp-stats-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4,1fr); }
.lp-stat { padding: 52px 40px; border-right: 1px solid rgba(255,255,255,0.055); transition: background 0.3s; }
.lp-stat:hover { background: rgba(232,184,75,0.03); }
.lp-stat:last-child { border-right: none; }
.lp-stat-num { font-family: 'Space Grotesk', sans-serif; font-size: 48px; font-weight: 800; color: #f0f0fa; line-height: 1; letter-spacing: -0.03em; }
.lp-stat-num sup { font-size: 0.42em; color: #e8b84b; vertical-align: super; margin-left: 2px; }
.lp-stat-lbl { font-size: 13px; color: rgba(232,232,240,0.4); margin-top: 10px; line-height: 1.5; }

/* DETAIL */
.lp-detail { position: relative; z-index: 1; padding: 90px 32px; }
.lp-detail-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.lp-detail-title { font-family: 'Space Grotesk', sans-serif; font-size: 36px; font-weight: 800; color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 16px; }
.lp-detail-body { font-size: 15px; color: rgba(232,232,240,0.45); line-height: 1.8; margin-bottom: 32px; }
.lp-detail-list { display: flex; flex-direction: column; gap: 14px; }
.lp-detail-item { display: flex; align-items: flex-start; gap: 12px; }
.lp-detail-check { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; background: rgba(45,212,160,0.12); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #2dd4a0; margin-top: 2px; box-shadow: 0 0 0 0 rgba(45,212,160,0.4); }
.lp-detail-text { font-size: 14px; color: rgba(232,232,240,0.6); line-height: 1.6; }
.lp-detail-text strong { color: #f0f0fa; font-weight: 600; }
.lp-detail-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lp-detail-card { border-radius: 14px; padding: 24px; transition: transform 0.3s, background 0.3s; }
.lp-detail-card:hover { transform: translateY(-4px); background: rgba(232,184,75,0.05); }
.lp-detail-card-icon { font-size: 22px; margin-bottom: 12px; display: block; }
.lp-detail-card-title { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; color: #f0f0fa; margin-bottom: 6px; }
.lp-detail-card-desc { font-size: 12px; color: rgba(232,232,240,0.38); line-height: 1.65; }

/* CTA */
.lp-cta { position: relative; z-index: 1; padding: 130px 32px; border-top: 1px solid rgba(255,255,255,0.055); overflow: hidden; }
.lp-cta-inner { max-width: 600px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
.lp-cta-title { font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 800; color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 18px; }
.lp-cta-sub { font-size: 16px; color: rgba(232,232,240,0.45); margin-bottom: 40px; line-height: 1.7; }
.lp-cta-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.lp-cta-btn { padding: 14px 38px; background: #e8b84b; border: none; border-radius: 10px; color: #08080f; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.22s, box-shadow 0.22s; }
.lp-cta-btn:hover { background: #f5c84e; box-shadow: 0 12px 40px rgba(232,184,75,0.4); }

/* FOOTER */
.lp-footer { position: relative; z-index: 1; border-top: 1px solid rgba(255,255,255,0.055); padding: 36px 32px; background: rgba(6,6,12,0.6); }
.lp-footer-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.lp-footer-logo { display: flex; align-items: center; gap: 8px; }
.lp-footer-mark { width: 26px; height: 26px; border-radius: 7px; background: linear-gradient(135deg, #c49a2e, #e8b84b); display: flex; align-items: center; justify-content: center; font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 12px; color: #08080f; }
.lp-footer-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: rgba(240,240,250,0.55); }
.lp-footer-copy { font-size: 12px; color: rgba(232,232,240,0.28); }
.lp-footer-links { display: flex; gap: 22px; }
.lp-footer-link { font-size: 12px; color: rgba(232,232,240,0.32); cursor: pointer; transition: color 0.2s; background: none; border: none; font-family: 'Inter', sans-serif; padding: 0; }
.lp-footer-link:hover { color: rgba(232,232,240,0.7); }

/* RESPONSIVE */
@media (max-width: 960px) {
  .lp-nav-links { display: none; }
  .lp-hero-inner { grid-template-columns: 1fr; gap: 40px; }
  .lp-h1 { font-size: 44px; }
  .lp-mockup-wrap { display: none; }
  .lp-feat-grid { grid-template-columns: 1fr 1fr; }
  .lp-stats-inner { grid-template-columns: 1fr 1fr; }
  .lp-stat { border-bottom: 1px solid rgba(255,255,255,0.05); }
  .lp-detail-inner { grid-template-columns: 1fr; gap: 48px; }
  .lp-section-title { font-size: 30px; }
  .lp-cta-title { font-size: 32px; }
  .lp-blob.c { display: none; }
}
@media (max-width: 600px) {
  .lp-hero { padding: 80px 20px 40px; min-height: 85vh; }
  .lp-h1 { font-size: 34px; }
  .lp-features, .lp-detail, .lp-cta { padding: 60px 20px; }
  .lp-feat-grid { grid-template-columns: 1fr; }
  .lp-detail-cards { grid-template-columns: 1fr; }
  .lp-stat { padding: 36px 24px; }
  .lp-stat-num { font-size: 38px; }
  .lp-footer-inner { flex-direction: column; align-items: flex-start; gap: 16px; }
  .lp-blob { filter: blur(60px); }
  .lp-blob.a, .lp-blob.b { width: 340px; height: 340px; }
}
.lp-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 10px; }
.lp-hamburger span { display: block; width: 18px; height: 1.5px; background: rgba(232,232,240,0.7); border-radius: 2px; }
.lp-mobile-menu { display: none; position: fixed; inset: 0; background: rgba(6,6,14,0.97); backdrop-filter: blur(10px); z-index: 300; flex-direction: column; align-items: center; justify-content: center; gap: 32px; }
.lp-mobile-menu.open { display: flex; }
.lp-mobile-menu-link { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: rgba(232,232,240,0.7); cursor: pointer; background: none; border: none; transition: color 0.2s; }
.lp-mobile-menu-link:hover { color: #e8b84b; }
.lp-mobile-menu-close { position: absolute; top: 24px; right: 24px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; width: 40px; height: 40px; color: rgba(232,232,240,0.6); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.lp-mobile-menu-actions { display: flex; flex-direction: column; gap: 12px; width: 200px; }
@media (max-width: 960px) {
  .lp-hamburger { display: flex; }
  .lp-nav-actions .lp-btn-ghost, .lp-nav-actions .lp-btn-gold { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lp-blob, .lp-pill-dot, .lp-ticker-track, .lp-gradient-text, .lp-mockup::after { animation: none !important; }
  .lp-reveal { transition: none !important; opacity: 1 !important; transform: none !important; }
  .lp-mockup { transition: none !important; }
}
`

function Counter({ to, suffix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      const start = performance.now()
      const duration = 1300
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(to * eased))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      obs.disconnect()
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{val}{suffix && <sup>{suffix}</sup>}</span>
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.15 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

export default function Landing({ onEnter, onShowPlans }) {
  const navRef    = useRef(null)
  const heroRef   = useRef(null)
  const mockupRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useReveal()

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) navRef.current.classList.toggle('scrolled', window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mouse-reactive spotlight in the hero — set as CSS custom properties
  // directly on the DOM node so we're not re-rendering on every mousemove.
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
      el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
    }
    el.addEventListener('mousemove', onMove, { passive: true })
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  // 3D tilt on the dashboard mockup, following the cursor
  const onMockupMove = (e) => {
    const el = mockupRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(1200px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 14).toFixed(2)}deg) scale(1.015)`
  }
  const onMockupLeave = () => {
    const el = mockupRef.current
    if (el) el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)'
  }

  // Magnetic buttons — nudge toward the cursor on hover
  const magnetize = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * 0.28
    const y = (e.clientY - rect.top - rect.height / 2) * 0.28
    el.style.transform = `translate(${x}px, ${y}px)`
  }
  const unmagnetize = (e) => { e.currentTarget.style.transform = 'translate(0,0)' }

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#08080f', color: '#e8e8f0', overflowX: 'hidden', lineHeight: '1.6' }} className="lp-noise">
      <style>{CSS}</style>

      {/* AURORA + GRID (fixed, behind everything) */}
      <div className="lp-aurora">
        <div className="lp-blob a" />
        <div className="lp-blob b" />
        <div className="lp-blob c" />
      </div>
      <div className="lp-grid" />

      {/* NAV */}
      <nav className="lp-nav" ref={navRef}>
        <div className="lp-nav-inner">
          <div className="lp-logo" onClick={onEnter}>
            <div className="lp-logo-mark"><LogoMark size={17}/></div>
            <span className="lp-logo-text">SRMS</span>
          </div>
          <div className="lp-nav-links">
            <button className="lp-nav-link" onClick={() => document.querySelector('.lp-features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
            <button className="lp-nav-link" onClick={() => document.querySelector('.lp-detail')?.scrollIntoView({ behavior: 'smooth' })}>Roles</button>
            <button className="lp-nav-link" onClick={onShowPlans}>Pricing</button>
          </div>
          <div className="lp-nav-actions">
            <button className="lp-btn-gold" onClick={onEnter}>Sign In</button>
            <button className="lp-hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <span/><span/><span/>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`lp-mobile-menu${menuOpen ? ' open' : ''}`}>
        <button className="lp-mobile-menu-close" onClick={() => setMenuOpen(false)}>×</button>
        <button className="lp-mobile-menu-link" onClick={() => { setMenuOpen(false); document.querySelector('.lp-features')?.scrollIntoView({ behavior: 'smooth' }) }}>Features</button>
        <button className="lp-mobile-menu-link" onClick={() => { setMenuOpen(false); document.querySelector('.lp-stats')?.scrollIntoView({ behavior: 'smooth' }) }}>How it works</button>
        <button className="lp-mobile-menu-link" onClick={() => { setMenuOpen(false); onShowPlans() }}>Pricing</button>
        <div className="lp-mobile-menu-actions">
          <button className="lp-btn-gold" style={{ width: '100%', textAlign: 'center', padding: '12px 22px' }} onClick={() => { setMenuOpen(false); onEnter() }}>Sign In</button>
        </div>
      </div>

      {/* HERO */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-spotlight" />
        <div className="lp-hero-inner">

          <div>
            <div className="lp-pill lp-glass lp-reveal">
              <div className="lp-pill-dot" />
              <span className="lp-pill-text">Built for Schools</span>
            </div>
            <h1 className="lp-h1 lp-reveal lp-r1">
              Every record,<br />
              <span className="lp-gradient-text">perfectly</span><br />
              <span className="lp-h1-dim">organised.</span>
            </h1>
            <p className="lp-sub lp-reveal lp-r2">
              The complete school management platform. Grades, attendance, fees, reports, and a parent portal — all in one system.
            </p>
            <div className="lp-actions lp-reveal lp-r3">
              <button className="lp-btn-hero lp-magnet" onMouseMove={magnetize} onMouseLeave={unmagnetize} onClick={onEnter}>Sign In →</button>
            </div>
            <div className="lp-trust lp-reveal lp-r4">
              <div className="lp-trust-avatars">
                <div className="lp-trust-av" style={{ background: 'rgba(232,184,75,0.15)', color: '#e8b84b' }}>KM</div>
                <div className="lp-trust-av" style={{ background: 'rgba(45,212,160,0.15)', color: '#2dd4a0' }}>AA</div>
                <div className="lp-trust-av" style={{ background: 'rgba(91,168,245,0.15)', color: '#5ba8f5' }}>EK</div>
              </div>
              <span className="lp-trust-text">Trusted by <strong>schools across Ghana</strong></span>
            </div>
          </div>

          <div className="lp-mockup-wrap lp-reveal lp-r2">
            <div className="lp-mockup-glow" />
            <div className="lp-mockup" ref={mockupRef} onMouseMove={onMockupMove} onMouseLeave={onMockupLeave}>
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
                  <div className="lp-mock-logo"><LogoMark size={14}/></div>
                  <div className="lp-mock-si act">▦</div>
                  <div className="lp-mock-si">◈</div>
                  <div className="lp-mock-si">[=]</div>
                  <div className="lp-mock-si">◎</div>
                  <div className="lp-mock-si">◉</div>
                  <div className="lp-mock-si">◇</div>
                </div>
                <div className="lp-mock-content">
                  <div className="lp-mock-title">Good morning, Ama.</div>
                  <div className="lp-mock-sub">Ideal Basic School · 2027/2028</div>
                  <div className="lp-mock-kpis">
                    {MOCK_KPIS.map((k, i) => (
                      <div className="lp-mock-kpi" key={i} style={{ '--kc': k.color }}>
                        <div className="lp-mock-klbl-row">
                          <span className="lp-mock-kdot" style={{ background: k.color }} />
                          <span className="lp-mock-klbl">{k.lbl}</span>
                        </div>
                        <div className="lp-mock-kval" style={{ color: k.color }}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="lp-mock-top-title">Top Performers · Semester 2</div>
                  {MOCK_ROWS.map((r, i) => (
                    <div className="lp-mock-prow" key={i} style={{ '--kc': r.rankC }}>
                      <div className="lp-mock-rank" style={{ background: r.rankBg, color: r.rankC }}>{i + 1}</div>
                      <div className="lp-mock-av" style={{ background: r.avBg, color: r.avC }}>{r.init}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lp-mock-pname">{r.name}</div>
                        <div className="lp-mock-pcls">{r.cls}</div>
                      </div>
                      <div className="lp-mock-pscore" style={{ color: r.rankC }}>{r.score}</div>
                    </div>
                  ))}
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
          <div className="lp-eyebrow lp-reveal">What it does</div>
          <h2 className="lp-section-title lp-reveal lp-r1">Everything a school needs, nothing it doesn't.</h2>
          <p className="lp-section-sub lp-reveal lp-r2">Purpose-built for the full academic cycle — from first enrolment to end-of-year report cards.</p>
          <div className="lp-feat-grid lp-reveal lp-r3">
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
          {STATS.map((s, i) => (
            <div className="lp-stat lp-reveal" key={i} style={{ transitionDelay: `${i * 0.06}s` }}>
              <div className="lp-stat-num"><Counter to={s.to} suffix={s.suffix} /></div>
              <div className="lp-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL */}
      <section className="lp-detail">
        <div className="lp-detail-inner">
          <div className="lp-reveal">
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
          <div className="lp-detail-cards lp-reveal lp-r2">
            {DETAIL_CARDS.map((card, i) => (
              <div className="lp-detail-card lp-glass lp-glow-border" key={i}>
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
        <div className="lp-cta-inner lp-reveal">
          <h2 className="lp-cta-title">Ready to run a <span className="lp-gradient-text">smarter</span> school?</h2>
          <p className="lp-cta-sub">Set up in minutes. No training needed. Free to start.</p>
          <div className="lp-cta-actions">
            <button className="lp-cta-btn lp-magnet" onMouseMove={magnetize} onMouseLeave={unmagnetize} onClick={onEnter}>Sign In →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-logo">
            <div className="lp-footer-mark"><LogoMark size={14}/></div>
            <span className="lp-footer-name">SRMS</span>
          </div>
          <span className="lp-footer-copy">© {new Date().getFullYear()} Prime Logic Softwares. All rights reserved.</span>
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
