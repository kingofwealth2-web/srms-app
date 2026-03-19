import { useEffect, useRef } from 'react'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

.lp * { box-sizing: border-box; margin: 0; padding: 0; }
.lp {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: #0c0c15;
  color: #e8e8f0;
  overflow-x: hidden;
  line-height: 1.6;
}

/* ── NAV ─────────────────────────────────────────────── */
.lp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  transition: background 0.35s, border-color 0.35s;
}
.lp-nav.scrolled {
  background: rgba(12,12,21,0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.lp-nav-inner {
  max-width: 1200px; margin: 0 auto;
  height: 64px; padding: 0 32px;
  display: flex; align-items: center; justify-content: space-between;
}
.lp-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.lp-logo-mark {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(135deg, #c49a2e 0%, #e8b84b 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 15px; color: #0c0c15;
  box-shadow: 0 4px 14px rgba(232,184,75,0.3);
}
.lp-logo-text {
  font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px;
  color: #f0f0fa; letter-spacing: -0.01em;
}
.lp-nav-links {
  display: flex; align-items: center; gap: 32px;
}
.lp-nav-link {
  font-size: 13px; font-weight: 500; color: rgba(232,232,240,0.5);
  cursor: pointer; transition: color 0.2s; text-decoration: none; background: none; border: none;
}
.lp-nav-link:hover { color: #e8e8f0; }
.lp-nav-actions { display: flex; align-items: center; gap: 10px; }
.lp-btn-ghost {
  padding: 8px 20px; background: transparent;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  color: rgba(232,232,240,0.65); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif;
}
.lp-btn-ghost:hover { border-color: rgba(255,255,255,0.2); color: #e8e8f0; }
.lp-btn-gold {
  padding: 8px 22px; background: #e8b84b; border: none; border-radius: 8px;
  color: #0c0c15; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif;
  letter-spacing: 0.01em;
}
.lp-btn-gold:hover {
  background: #f5c84e;
  box-shadow: 0 4px 20px rgba(232,184,75,0.35);
  transform: translateY(-1px);
}

/* ── HERO ────────────────────────────────────────────── */
.lp-hero {
  min-height: 100vh; position: relative; overflow: hidden;
  display: flex; align-items: center;
  padding: 120px 32px 80px;
}
.lp-hero-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 65% 55% at 75% 45%, rgba(232,184,75,0.05) 0%, transparent 65%),
    radial-gradient(ellipse 45% 45% at 15% 75%, rgba(91,168,245,0.04) 0%, transparent 60%);
}
.lp-grid {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(232,184,75,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232,184,75,0.03) 1px, transparent 1px);
  background-size: 72px 72px;
  -webkit-mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 25%, transparent 80%);
  mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 25%, transparent 80%);
}
.lp-hero-inner {
  position: relative; z-index: 1;
  max-width: 1200px; margin: 0 auto; width: 100%;
  display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
}
.lp-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(232,184,75,0.07); border: 1px solid rgba(232,184,75,0.18);
  border-radius: 100px; padding: 6px 14px 6px 10px; margin-bottom: 28px;
}
.lp-pill-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #e8b84b; flex-shrink: 0;
  box-shadow: 0 0 8px rgba(232,184,75,0.6);
  animation: lp-pulse 2.2s ease-in-out infinite;
}
@keyframes lp-pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50% { opacity:0.5; transform:scale(0.8); }
}
.lp-pill-text {
  font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600;
  color: #e8b84b; letter-spacing: 0.06em; text-transform: uppercase;
}
.lp-h1 {
  font-family: 'Syne', sans-serif;
  font-size: 64px;
  font-weight: 800;
  line-height: 1.0;
  letter-spacing: -0.03em;
  color: #f0f0fa;
  margin-bottom: 24px;
}
.lp-h1 .lp-gold { color: #e8b84b; }
.lp-h1 .lp-dim { color: rgba(240,240,250,0.3); font-weight: 300; }
.lp-sub {
  font-size: 16px; font-weight: 400;
  color: rgba(232,232,240,0.5); line-height: 1.75;
  max-width: 440px; margin-bottom: 36px;
}
.lp-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.lp-btn-hero {
  padding: 13px 30px; background: #e8b84b; border: none; border-radius: 10px;
  color: #0c0c15; font-size: 14px; font-weight: 700; letter-spacing: 0.01em;
  cursor: pointer; transition: all 0.22s; font-family: 'Plus Jakarta Sans', sans-serif;
  display: flex; align-items: center; gap: 8px;
}
.lp-btn-hero:hover {
  background: #f5c84e;
  box-shadow: 0 8px 28px rgba(232,184,75,0.3);
  transform: translateY(-1px);
}
.lp-btn-outline {
  padding: 13px 26px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09); border-radius: 10px;
  color: rgba(232,232,240,0.65); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif;
}
.lp-btn-outline:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.15);
  color: #e8e8f0;
}
.lp-trust {
  display: flex; align-items: center; gap: 12px; margin-top: 36px;
}
.lp-trust-avatars { display: flex; }
.lp-trust-av {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid #0c0c15; margin-left: -8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700;
}
.lp-trust-av:first-child { margin-left: 0; }
.lp-trust-text {
  font-size: 12px; color: rgba(232,232,240,0.4); font-weight: 400;
}
.lp-trust-text strong { color: rgba(232,232,240,0.7); font-weight: 600; }

/* ── MOCKUP ──────────────────────────────────────────── */
.lp-mockup-wrap { position: relative; }
.lp-mockup-glow {
  position: absolute; bottom: -60px; left: 50%; transform: translateX(-50%);
  width: 75%; height: 80px;
  background: radial-gradient(ellipse, rgba(232,184,75,0.18) 0%, transparent 70%);
  filter: blur(24px); pointer-events: none;
}
.lp-mockup {
  background: #11111c;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; overflow: hidden;
  box-shadow:
    0 40px 80px rgba(0,0,0,0.65),
    0 0 0 1px rgba(255,255,255,0.04),
    inset 0 1px 0 rgba(255,255,255,0.06);
}
.lp-mock-titlebar {
  background: #0d0d18; height: 40px; padding: 0 14px;
  display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.lp-mock-dots { display: flex; gap: 5px; }
.lp-mock-dot { width: 9px; height: 9px; border-radius: 50%; }
.lp-mock-url {
  flex: 1; height: 20px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 5px;
  max-width: 200px; margin: 0 auto;
}
.lp-mock-body { display: flex; }
.lp-mock-sidebar {
  width: 52px; background: #0d0d18;
  border-right: 1px solid rgba(255,255,255,0.055);
  padding: 14px 0;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.lp-mock-logo {
  width: 28px; height: 28px; border-radius: 7px;
  background: #e8b84b; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #0c0c15;
  font-family: 'Syne', sans-serif; margin-bottom: 12px;
}
.lp-mock-si {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: rgba(232,232,240,0.3);
  transition: all 0.15s; position: relative;
}
.lp-mock-si.act {
  background: rgba(232,184,75,0.09); color: #e8b84b;
}
.lp-mock-si.act::before {
  content: ''; position: absolute; left: 0; top: 50%;
  transform: translateY(-50%); width: 2.5px; height: 14px;
  background: #e8b84b; border-radius: 2px;
}
.lp-mock-content { flex: 1; padding: 18px; min-height: 0; overflow: hidden; }
.lp-mock-pagetitle {
  font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
  color: #f0f0fa; margin-bottom: 14px; letter-spacing: -0.01em;
}
.lp-mock-kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 14px; }
.lp-mock-kpi {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px; padding: 11px 12px;
}
.lp-mock-kpi-val {
  font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700;
  line-height: 1; color: #f0f0fa;
}
.lp-mock-kpi-val.gold { color: #e8b84b; }
.lp-mock-kpi-val.green { color: #2dd4a0; }
.lp-mock-kpi-lbl {
  font-size: 9px; color: rgba(232,232,240,0.3);
  text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;
}
.lp-mock-table {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055);
  border-radius: 8px; overflow: hidden;
}
.lp-mock-thead {
  display: grid; grid-template-columns: 22px 1fr 40px 30px;
  gap: 8px; padding: 7px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.lp-mock-th {
  font-size: 8px; color: rgba(232,232,240,0.22);
  text-transform: uppercase; letter-spacing: 0.1em;
}
.lp-mock-tr {
  display: grid; grid-template-columns: 22px 1fr 40px 30px;
  gap: 8px; padding: 8px 12px; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.lp-mock-tr:last-child { border-bottom: none; }
.lp-mock-av {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 700; flex-shrink: 0;
}
.lp-mock-name {
  font-size: 11px; font-weight: 500; color: rgba(232,232,240,0.8);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lp-mock-score { font-size: 11px; font-weight: 700; color: #f0f0fa; text-align: right; }
.lp-mock-grade {
  font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 12px;
  text-align: center;
}

/* Float cards */
.lp-float {
  position: absolute;
  background: rgba(17,17,28,0.95); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 14px 18px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
  backdrop-filter: blur(16px); pointer-events: none;
}
.lp-float-1 { top: 16px; right: -20px; }
.lp-float-2 { bottom: 50px; left: -28px; }
.lp-float-val {
  font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
  line-height: 1; white-space: nowrap;
}
.lp-float-lbl {
  font-size: 10px; color: rgba(232,232,240,0.4); margin-top: 5px; white-space: nowrap;
}

/* ── TICKER ──────────────────────────────────────────── */
.lp-ticker {
  border-top: 1px solid rgba(255,255,255,0.055);
  border-bottom: 1px solid rgba(255,255,255,0.055);
  background: rgba(232,184,75,0.025);
  padding: 14px 0; overflow: hidden;
}
.lp-ticker-track {
  display: flex; gap: 0;
  animation: lp-ticker 30s linear infinite;
  width: max-content;
}
.lp-ticker-item {
  display: flex; align-items: center; gap: 16px;
  padding: 0 36px;
  border-right: 1px solid rgba(255,255,255,0.055);
  font-family: 'Space Mono', monospace; font-size: 10px;
  color: rgba(232,184,75,0.5); letter-spacing: 0.12em;
  text-transform: uppercase; white-space: nowrap;
}
.lp-ticker-diamond { font-size: 6px; color: rgba(232,184,75,0.35); }
@keyframes lp-ticker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* ── FEATURES ────────────────────────────────────────── */
.lp-features-section {
  padding: 100px 32px;
  background: #0c0c15;
}
.lp-features-inner { max-width: 1200px; margin: 0 auto; }
.lp-section-label {
  font-family: 'Space Mono', monospace; font-size: 10px;
  color: #e8b84b; letter-spacing: 0.25em; text-transform: uppercase;
  margin-bottom: 16px; display: flex; align-items: center; gap: 12px;
}
.lp-section-label::before {
  content: ''; width: 24px; height: 1px; background: #e8b84b; flex-shrink: 0;
}
.lp-section-title {
  font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 800;
  color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.1;
  margin-bottom: 12px; max-width: 520px;
}
.lp-section-sub {
  font-size: 15px; color: rgba(232,232,240,0.45);
  margin-bottom: 60px; max-width: 480px; line-height: 1.7; font-weight: 400;
}
.lp-feat-grid {
  display: grid; grid-template-columns: repeat(4,1fr);
  border: 1px solid rgba(255,255,255,0.055); border-radius: 14px; overflow: hidden;
}
.lp-feat {
  padding: 36px 28px;
  border-right: 1px solid rgba(255,255,255,0.055);
  background: #0c0c15; transition: background 0.25s;
  position: relative; overflow: hidden;
}
.lp-feat:last-child { border-right: none; }
.lp-feat::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: #e8b84b; transform: scaleX(0); transform-origin: left; transition: transform 0.3s;
}
.lp-feat:hover { background: rgba(232,184,75,0.03); }
.lp-feat:hover::before { transform: scaleX(1); }
.lp-feat-icon {
  width: 40px; height: 40px; border-radius: 10px; margin-bottom: 18px;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
}
.lp-feat-title {
  font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
  color: #f0f0fa; margin-bottom: 10px; letter-spacing: -0.01em;
}
.lp-feat-desc {
  font-size: 13px; color: rgba(232,232,240,0.4);
  line-height: 1.7; font-weight: 400;
}

/* ── STATS STRIP ─────────────────────────────────────── */
.lp-stats-section {
  border-top: 1px solid rgba(255,255,255,0.055);
  border-bottom: 1px solid rgba(255,255,255,0.055);
  background: #0a0a14;
}
.lp-stats-inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(4,1fr);
}
.lp-stat {
  padding: 52px 40px;
  border-right: 1px solid rgba(255,255,255,0.055);
}
.lp-stat:last-child { border-right: none; }
.lp-stat-num {
  font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800;
  color: #f0f0fa; line-height: 1; letter-spacing: -0.03em;
}
.lp-stat-num span { color: #e8b84b; font-size: 0.55em; vertical-align: baseline; }
.lp-stat-lbl {
  font-size: 13px; color: rgba(232,232,240,0.4);
  margin-top: 10px; font-weight: 400; line-height: 1.5;
}

/* ── SECOND FEATURE ROW ──────────────────────────────── */
.lp-detail-section {
  padding: 100px 32px;
  background: #0c0c15;
}
.lp-detail-inner {
  max-width: 1200px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;
}
.lp-detail-left {}
.lp-detail-right {}
.lp-detail-title {
  font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800;
  color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.15;
  margin-bottom: 16px;
}
.lp-detail-body {
  font-size: 15px; color: rgba(232,232,240,0.45); line-height: 1.8;
  margin-bottom: 32px; font-weight: 400;
}
.lp-detail-list { display: flex; flex-direction: column; gap: 14px; }
.lp-detail-item { display: flex; align-items: flex-start; gap: 12px; }
.lp-detail-check {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  background: rgba(45,212,160,0.1); border: 1px solid rgba(45,212,160,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: #2dd4a0; margin-top: 2px;
}
.lp-detail-item-text { font-size: 14px; color: rgba(232,232,240,0.65); line-height: 1.6; }
.lp-detail-item-text strong { color: #f0f0fa; font-weight: 600; }
.lp-detail-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lp-detail-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 24px; transition: border-color 0.25s, background 0.25s;
}
.lp-detail-card:hover {
  background: rgba(232,184,75,0.03); border-color: rgba(232,184,75,0.15);
}
.lp-detail-card-icon { font-size: 22px; margin-bottom: 12px; display: block; }
.lp-detail-card-title {
  font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
  color: #f0f0fa; margin-bottom: 6px;
}
.lp-detail-card-desc {
  font-size: 12px; color: rgba(232,232,240,0.38); line-height: 1.65;
}

/* ── CTA ─────────────────────────────────────────────── */
.lp-cta-section {
  padding: 120px 32px;
  background: #0a0a14;
  border-top: 1px solid rgba(255,255,255,0.055);
  position: relative; overflow: hidden;
}
.lp-cta-bg {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 70% at 50% 50%, rgba(232,184,75,0.05) 0%, transparent 65%);
}
.lp-cta-inner {
  max-width: 680px; margin: 0 auto; text-align: center; position: relative; z-index: 1;
}
.lp-cta-title {
  font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800;
  color: #f0f0fa; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 20px;
}
.lp-cta-sub {
  font-size: 16px; color: rgba(232,232,240,0.45);
  margin-bottom: 40px; line-height: 1.7; font-weight: 400;
}
.lp-cta-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.lp-cta-btn {
  padding: 15px 40px; background: #e8b84b; border: none; border-radius: 10px;
  color: #0c0c15; font-size: 15px; font-weight: 700; cursor: pointer;
  transition: all 0.22s; font-family: 'Plus Jakarta Sans', sans-serif;
  letter-spacing: 0.01em;
}
.lp-cta-btn:hover {
  background: #f5c84e;
  box-shadow: 0 10px 36px rgba(232,184,75,0.3);
  transform: translateY(-1px);
}
.lp-cta-sec {
  padding: 15px 32px; background: transparent;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
  color: rgba(232,232,240,0.55); font-size: 15px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif;
}
.lp-cta-sec:hover {
  border-color: rgba(255,255,255,0.2); color: #e8e8f0;
}

/* ── FOOTER ──────────────────────────────────────────── */
.lp-footer {
  border-top: 1px solid rgba(255,255,255,0.055);
  padding: 40px 32px;
  background: #09090f;
}
.lp-footer-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  flex-wrap: wrap;
}
.lp-footer-logo { display: flex; align-items: center; gap: 8px; }
.lp-footer-logo-mark {
  width: 26px; height: 26px; border-radius: 7px;
  background: linear-gradient(135deg, #c49a2e, #e8b84b);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 12px; color: #0c0c15;
}
.lp-footer-wordmark {
  font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px;
  color: rgba(240,240,250,0.6);
}
.lp-footer-copy {
  font-size: 12px; color: rgba(232,232,240,0.3); font-weight: 400;
}
.lp-footer-links { display: flex; gap: 24px; }
.lp-footer-link {
  font-size: 12px; color: rgba(232,232,240,0.35); cursor: pointer;
  transition: color 0.2s; text-decoration: none; background: none; border: none;
}
.lp-footer-link:hover { color: rgba(232,232,240,0.7); }

/* ── MOBILE ──────────────────────────────────────────── */
@media (max-width: 900px) {
  .lp-nav-links { display: none; }
  .lp-hero-inner { grid-template-columns: 1fr; gap: 48px; }
  .lp-h1 { font-size: 42px; }
  .lp-mockup-wrap { display: none; }
  .lp-feat-grid { grid-template-columns: 1fr 1fr; }
  .lp-feat { border-bottom: 1px solid rgba(255,255,255,0.055); }
  .lp-stats-inner { grid-template-columns: 1fr 1fr; }
  .lp-stat { border-bottom: 1px solid rgba(255,255,255,0.055); }
  .lp-detail-inner { grid-template-columns: 1fr; gap: 48px; }
  .lp-cta-title { font-size: 34px; }
  .lp-section-title { font-size: 30px; }
  .lp-stat-num { font-size: 36px; }
}
@media (max-width: 600px) {
  .lp-feat-grid { grid-template-columns: 1fr; }
  .lp-stats-inner { grid-template-columns: 1fr 1fr; }
  .lp-detail-cards { grid-template-columns: 1fr; }
  .lp-hero { padding: 100px 20px 60px; }
  .lp-features-section, .lp-detail-section, .lp-cta-section { padding: 70px 20px; }
  .lp-h1 { font-size: 36px; }
}
`

const TICKER_ITEMS = [
  'Grades & Assessments', 'Attendance Tracking', 'Fee Management',
  'Parent Portal', 'PDF Report Cards', 'Audit Logging',
  'Multi-Role Access', 'Academic Year Wizard', 'Behaviour Records',
  'Class Broadsheet', 'Subject Reports', 'Multi-School Support',
]

const FEATURES = [
  { icon: '📊', title: 'Grades & Reports', desc: 'Weighted components, automatic totals, class rankings, and printable report cards generated in seconds.' },
  { icon: '📋', title: 'Attendance', desc: 'Daily batch marking with Ghana public holiday detection, vacation blocking, and full exportable history.' },
  { icon: '💳', title: 'Fee Management', desc: 'Multi-currency invoicing, bulk assignment, payment recording, arrear carry-forward, and printed receipts.' },
  { icon: '👥', title: 'Parent Portal', desc: 'A dedicated portal where parents view grades, attendance, fees, and announcements — released on your schedule.' },
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

export default function Landing({ onEnter }) {
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 40)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div className="lp">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="lp-nav" ref={navRef}>
        <div className="lp-nav-inner">
          <div className="lp-logo" onClick={onEnter}>
            <div className="lp-logo-mark">S</div>
            <span className="lp-logo-text">SRMS</span>
          </div>
          <div className="lp-nav-links">
            <span className="lp-nav-link">Features</span>
            <span className="lp-nav-link">Roles</span>
            <span className="lp-nav-link">Pricing</span>
          </div>
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

          {/* Left */}
          <div>
            <div className="lp-pill">
              <div className="lp-pill-dot" />
              <span className="lp-pill-text">Built for Schools</span>
            </div>
            <h1 className="lp-h1">
              Every record,<br />
              <span className="lp-gold">perfectly</span><br />
              <span className="lp-dim">organised.</span>
            </h1>
            <p className="lp-sub">
              The complete school management platform. Grades, attendance, fees, reports, and a parent portal — all in one system.
            </p>
            <div className="lp-actions">
              <button className="lp-btn-hero" onClick={onEnter}>
                Get Started Free →
              </button>
              <button className="lp-btn-outline" onClick={onEnter}>
                Sign In
              </button>
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

          {/* Right — App Mockup */}
          <div className="lp-mockup-wrap">
            <div className="lp-mockup-glow" />
            <div className="lp-float lp-float-1">
              <div className="lp-float-val" style={{ color: '#2dd4a0' }}>94.7%</div>
              <div className="lp-float-lbl">Attendance Rate</div>
            </div>
            <div className="lp-float lp-float-2">
              <div className="lp-float-val" style={{ color: '#e8b84b' }}>₵48,200</div>
              <div className="lp-float-lbl">Fees Collected</div>
            </div>
            <div className="lp-mockup">
              <div className="lp-mock-titlebar">
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
                  <div className="lp-mock-pagetitle">Dashboard</div>
                  <div className="lp-mock-kpis">
                    <div className="lp-mock-kpi">
                      <div className="lp-mock-kpi-val">38</div>
                      <div className="lp-mock-kpi-lbl">Students</div>
                    </div>
                    <div className="lp-mock-kpi">
                      <div className="lp-mock-kpi-val gold">₵48k</div>
                      <div className="lp-mock-kpi-lbl">Collected</div>
                    </div>
                    <div className="lp-mock-kpi">
                      <div className="lp-mock-kpi-val green">94%</div>
                      <div className="lp-mock-kpi-lbl">Attendance</div>
                    </div>
                  </div>
                  <div className="lp-mock-table">
                    <div className="lp-mock-thead">
                      <div className="lp-mock-th" />
                      <div className="lp-mock-th">Student</div>
                      <div className="lp-mock-th">Score</div>
                      <div className="lp-mock-th">Grade</div>
                    </div>
                    {[
                      { init: 'KM', name: 'Kofi Mensah', score: 92, grade: 'A', bg: 'rgba(232,184,75,0.15)', c: '#e8b84b', gc: '#2dd4a0', gb: 'rgba(45,212,160,0.1)' },
                      { init: 'AA', name: 'Ama Asante', score: 85, grade: 'B', bg: 'rgba(91,168,245,0.15)', c: '#5ba8f5', gc: '#5ba8f5', gb: 'rgba(91,168,245,0.1)' },
                      { init: 'EK', name: 'Esi Kyei', score: 78, grade: 'B', bg: 'rgba(45,212,160,0.15)', c: '#2dd4a0', gc: '#5ba8f5', gb: 'rgba(91,168,245,0.1)' },
                    ].map((r, i) => (
                      <div className="lp-mock-tr" key={i}>
                        <div className="lp-mock-av" style={{ background: r.bg, color: r.c }}>{r.init}</div>
                        <div className="lp-mock-name">{r.name}</div>
                        <div className="lp-mock-score">{r.score}</div>
                        <div className="lp-mock-grade" style={{ background: r.gb, color: r.gc }}>{r.grade}</div>
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
          {doubled.map((item, i) => (
            <div className="lp-ticker-item" key={i}>
              <span className="lp-ticker-diamond">◆</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="lp-features-section">
        <div className="lp-features-inner">
          <div className="lp-section-label">What it does</div>
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
      <div className="lp-stats-section">
        <div className="lp-stats-inner">
          <div className="lp-stat">
            <div className="lp-stat-num">5<span>+</span></div>
            <div className="lp-stat-lbl">User roles with scoped access</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">1<span>click</span></div>
            <div className="lp-stat-lbl">Report card generation</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">365<span>d</span></div>
            <div className="lp-stat-lbl">Audit history per school</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">0</div>
            <div className="lp-stat-lbl">Data shared between schools</div>
          </div>
        </div>
      </div>

      {/* DETAIL */}
      <section className="lp-detail-section">
        <div className="lp-detail-inner">
          <div className="lp-detail-left">
            <div className="lp-section-label">Built right</div>
            <h2 className="lp-detail-title">Designed for the people who run schools.</h2>
            <p className="lp-detail-body">Not just a grade book. SRMS handles the full complexity of school administration — access control, audit trails, year transitions, and a separate portal for parents.</p>
            <div className="lp-detail-list">
              {DETAIL_ITEMS.map((item, i) => (
                <div className="lp-detail-item" key={i}>
                  <div className="lp-detail-check">✓</div>
                  <div className="lp-detail-item-text">
                    <strong>{item.title}</strong> — {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-detail-right">
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
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-section">
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
            <div className="lp-footer-logo-mark">S</div>
            <span className="lp-footer-wordmark">SRMS</span>
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
