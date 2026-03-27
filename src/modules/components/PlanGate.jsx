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
    if (onUpgrade) onUpgrade(targetPlan)
    else setShowModal(true)
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
        }}>⬡</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text1)', marginBottom: 4 }}>
            {featureLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mist3)', maxWidth: 260, lineHeight: 1.5 }}>
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
        />
      )}
    </>
  )
}

// ── Upgrade Modal ──────────────────────────────────────────────
function UpgradeModal({ featureLabel, featureDesc, targetPlan, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface1)', borderRadius: 16,
          border: '1px solid var(--border1)',
          padding: '32px 28px', maxWidth: 420, width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(232,184,75,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, margin: '0 auto 20px',
        }}>⬡</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#e8b84b', letterSpacing: '0.12em', marginBottom: 8 }}>
          {targetPlan?.label?.toUpperCase()} FEATURE
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text1)', marginBottom: 10, lineHeight: 1.2 }}>
          {featureLabel}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--mist3)', lineHeight: 1.6, marginBottom: 20 }}>
          {featureDesc} This feature is on the <strong>{targetPlan?.label}</strong> plan.
          Contact us to upgrade your account.
        </p>

        <div style={{
          background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.15)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'left',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e8b84b', letterSpacing: '0.1em', marginBottom: 12 }}>
            CONTACT US TO UPGRADE
          </div>
          <a href="tel:+233536759120" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: 'var(--text1)', textDecoration: 'none', marginBottom: 10,
          }}>
            <span>📞</span>
            <span>0536 759 120</span>
          </a>
          <a href="mailto:kofi.william2311@gmail.com" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: 'var(--text1)', textDecoration: 'none',
          }}>
            <span>✉️</span>
            <span>kofi.william2311@gmail.com</span>
          </a>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px', borderRadius: 8,
            border: '1px solid var(--border1)', background: 'transparent',
            color: 'var(--mist3)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Infer which plan is required if not explicitly passed ──────
function _inferRequiredPlan(feature) {
  for (const key of PLAN_ORDER) {
    if (PLANS[key]?.features?.[feature] === true) return key
  }
  return 'pro'
}