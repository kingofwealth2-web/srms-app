// PlanGate.jsx
// Wraps any feature that requires a specific plan.
// If the current plan doesn't include the feature, shows an upgrade prompt.
//
// Usage:
//   <PlanGate planHook={planHook} feature="reportsExcel" requiredPlan="basic">
//     <button onClick={exportExcel}>Export Excel</button>
//   </PlanGate>
//
//   mode="block"  (default) — replaces children with a locked card
//   mode="inline" — renders children but disables + shows a badge on hover
//   mode="sidebar"— slim locked state for nav items

import { useState } from 'react'
import { PLANS } from '../lib/constants'

const PLAN_ORDER = ['starter', 'basic', 'pro']

const FEATURE_LABELS = {
  feeReceipts:    'Fee Receipt Generation',
  reportsExcel:   'Excel Export',
  behaviour:      'Behaviour Tracking',
  announcements:  'Announcements',
  reportsPDF:     'PDF Reports',
  parentPortal:   'Parent Portal',
  auditLog:       'Audit Log',
  yearSwitcher:   'Year Switcher',
}

const UPGRADE_DESCRIPTIONS = {
  feeReceipts:   'Generate and print professional fee receipts for parents.',
  reportsExcel:  'Export broadsheets and reports as Excel files for further analysis.',
  behaviour:     'Track student behaviour, achievements, discipline, and club activity.',
  announcements: 'Send announcements to staff, teachers, and parents.',
  reportsPDF:    'Generate and print full report cards and broadsheets.',
  parentPortal:  'Give parents secure access to their child\'s grades, attendance, and fees.',
  auditLog:      'View a full searchable log of every change made in the system.',
  yearSwitcher:  'Switch between academic years to view and manage historical data.',
}

export default function PlanGate({ planHook, feature, requiredPlan, children, mode = 'block', onUpgrade }) {
  const [showModal, setShowModal] = useState(false)
  const { can, plan } = planHook

  // If allowed, just render children normally
  if (can(feature)) return children

  const featureLabel = FEATURE_LABELS[feature]    || feature
  const featureDesc  = UPGRADE_DESCRIPTIONS[feature] || ''
  const targetPlan   = requiredPlan || _inferRequiredPlan(feature)
  const targetConfig = PLANS[targetPlan]

  const handleClick = () => {
    setShowModal(true)
  }

  // ── Sidebar mode — slim locked nav item ──
  if (mode === 'sidebar') {
    return (
      <div
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
          opacity: 0.45,
          transition: 'opacity 0.2s',
        }}
        title={`${featureLabel} — ${targetConfig?.label} plan required`}
      >
        {children}
        <span style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 700,
          background: 'rgba(232,184,75,0.15)', color: '#e8b84b',
          padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em',
        }}>
          {targetConfig?.label?.toUpperCase()}
        </span>
      </div>
    )
  }

  // ── Inline mode — button is visible but clicking opens upgrade modal ──
  if (mode === 'inline') {
    return (
      <>
        <div
          onClick={handleClick}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative' }}
          title={`Upgrade to ${targetConfig?.label} to use this feature`}
        >
          <div style={{ opacity: 0.4, pointerEvents: 'none' }}>{children}</div>
          <span style={{
            fontSize: 10, fontWeight: 700,
            background: 'rgba(232,184,75,0.15)', color: '#e8b84b',
            padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em',
          }}>
            {targetConfig?.label?.toUpperCase()}
          </span>
        </div>
        {showModal && (
          <UpgradeModal
            featureLabel={featureLabel}
            featureDesc={featureDesc}
            targetPlan={targetConfig}
            currentPlan={plan}
            onClose={() => setShowModal(false)}
            onUpgrade={onUpgrade}
          />
        )}
      </>
    )
  }

  // ── Block mode (default) — replaces children with locked card ──
  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: '32px 24px',
          border: '1.5px dashed rgba(232,184,75,0.2)',
          borderRadius: 12, cursor: 'pointer', textAlign: 'center',
          background: 'rgba(232,184,75,0.03)',
          transition: 'background 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(232,184,75,0.06)'
          e.currentTarget.style.borderColor = 'rgba(232,184,75,0.35)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(232,184,75,0.03)'
          e.currentTarget.style.borderColor = 'rgba(232,184,75,0.2)'
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(232,184,75,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>🔒</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)', marginBottom: 4 }}>
            {featureLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mist2)', maxWidth: 260, lineHeight: 1.5 }}>
            {featureDesc}
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          background: 'rgba(232,184,75,0.12)', color: '#e8b84b',
          padding: '5px 14px', borderRadius: 6, letterSpacing: '0.04em',
        }}>
          Upgrade to {targetConfig?.label} →
        </div>
      </div>

      {showModal && (
        <UpgradeModal
          featureLabel={featureLabel}
          featureDesc={featureDesc}
          targetPlan={targetConfig}
          currentPlan={plan}
          onClose={() => setShowModal(false)}
          onUpgrade={onUpgrade}
        />
      )}
    </>
  )
}

// ── Upgrade Modal ──────────────────────────────────────────────
function UpgradeModal({ featureLabel, featureDesc, targetPlan, currentPlan, onClose }) {
  // Close on Escape
  if (typeof document !== 'undefined') {
    const prev = document._pgEsc
    document._pgEsc && document.removeEventListener('keydown', document._pgEsc)
    document._pgEsc = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', document._pgEsc)
  }

  const planColors = { starter: 'var(--emerald)', basic: 'var(--gold)', pro: 'var(--amber)' }
  const planGlows  = { starter: 'rgba(45,212,160,0.12)', basic: 'rgba(232,184,75,0.12)', pro: 'rgba(251,159,58,0.12)' }
  const planLines  = { starter: 'rgba(45,212,160,0.25)', basic: 'rgba(232,184,75,0.25)', pro: 'rgba(251,159,58,0.25)' }
  const key        = targetPlan?.key || 'pro'
  const color      = planColors[key] || 'var(--gold)'
  const glow       = planGlows[key]  || 'rgba(232,184,75,0.12)'
  const line       = planLines[key]  || 'rgba(232,184,75,0.25)'

  const backdrop = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(8,8,18,0.78)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '5vh 20px 20px',
    animation: 'pgFadeIn 0.18s ease both',
  }

  return (
    <>
      <style>{`
        @keyframes pgFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes pgSlideIn { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
      <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={backdrop}>
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'var(--ink2)',
          border: '1px solid var(--line2)',
          borderRadius: 'var(--r-xl, 24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          animation: 'pgSlideIn 0.22s cubic-bezier(.16,1,.3,1) both',
        }}>

          {/* ── Top accent strip ── */}
          <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.7 }} />

          {/* ── Icon + header ── */}
          <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: glow, border: `1px solid ${line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 22,
            }}>⬡</div>

            <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.14em', marginBottom: 10, textTransform: 'uppercase' }}>
              {targetPlan?.label} Feature
            </div>
            <h2 className='d' style={{ fontSize: 20, fontWeight: 600, color: 'var(--white)', lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.02em' }}>
              {featureLabel}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.65, marginBottom: 24 }}>
              {featureDesc}
            </p>
          </div>

          {/* ── Plan highlight ── */}
          <div style={{
            margin: '0 28px 20px',
            background: glow, border: `1px solid ${line}`,
            borderRadius: 'var(--r-sm, 10px)', padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Required plan</div>
              <div className='d' style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>{targetPlan?.label}</div>
              <div style={{ fontSize: 11, color: 'var(--mist2)', marginTop: 2 }}>
                  Contact us for pricing
              </div>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, color,
              background: `rgba(0,0,0,0.2)`, border: `1px solid ${line}`,
              borderRadius: 20, padding: '4px 12px', letterSpacing: '0.06em',
              textTransform: 'uppercase', flexShrink: 0,
            }}>
              Upgrade
            </div>
          </div>

          {/* ── Contact box ── */}
          <div style={{ margin: '0 28px 24px', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm, 10px)', padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mist3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Contact us to upgrade
            </div>
            <a href="tel:+233536759120" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--white)', textDecoration: 'none', marginBottom: 10, fontWeight: 500 }}>
              <span style={{ fontSize: 15 }}>📞</span>
              <span>0536 759 120</span>
            </a>
            <a href="mailto:kofi.william2311@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--white)', textDecoration: 'none', fontWeight: 500 }}>
              <span style={{ fontSize: 15 }}>✉️</span>
              <span>kofi.william2311@gmail.com</span>
            </a>
          </div>

          {/* ── Close ── */}
          <div style={{ padding: '0 28px 28px' }}>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '11px',
                borderRadius: 'var(--r-sm, 10px)',
                border: '1px solid var(--line2)',
                background: 'var(--ink4)',
                color: 'var(--mist)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ink5)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--ink4)'}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Infer which plan is required if not explicitly passed ──────
function _inferRequiredPlan(feature) {
  for (const key of PLAN_ORDER) {
    if (PLANS[key]?.features?.[feature] === true) return key
  }
  return 'pro'
}
