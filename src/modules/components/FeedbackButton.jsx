// FeedbackButton.jsx
// Floating feedback button — bottom-right corner of every page.
// Saves to Supabase `feedback` table.
// Optionally POSTs to FEEDBACK_WEBHOOK_URL in constants.js (works with
// Formspree, Make, Zapier, n8n — any URL that accepts a JSON POST).

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { FEEDBACK_WEBHOOK_URL } from '../lib/constants'

const TYPES = [
  { key: 'bug',        label: '🐛  Bug report',       desc: 'Something is broken or not working right' },
  { key: 'suggestion', label: '💡  Suggestion',        desc: 'An idea to improve the system' },
  { key: 'other',      label: '💬  Other',             desc: 'Anything else on your mind' },
]

export default function FeedbackButton({ profile, settings, currentPage }) {
  const [open,    setOpen]    = useState(false)
  const [type,    setType]    = useState('bug')
  const [desc,    setDesc]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  // ── Prevent body scroll when modal is open ──
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const reset = () => {
    setType('bug'); setDesc(''); setError(''); setDone(false)
  }

  const close = () => { setOpen(false); setTimeout(reset, 300) }

  const submit = async () => {
    if (!desc.trim()) { setError('Please describe the issue.'); return }
    setSaving(true); setError('')

    const payload = {
      school_id:    profile?.school_id  || null,
      school_name:  settings?.school_name || null,
      submitted_by: profile?.full_name  || null,
      user_email:   profile?.email      || null,
      type,
      description:  desc.trim(),
      page:         currentPage         || null,
      status:       'open',
    }

    // ── 1. Save to Supabase ──
    const { error: dbErr } = await supabase.from('feedback').insert(payload)
    if (dbErr) { setError('Could not submit. Please try again.'); setSaving(false); return }

    // ── 2. Notify via webhook (optional) ──
    if (FEEDBACK_WEBHOOK_URL) {
      try {
        await fetch(FEEDBACK_WEBHOOK_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            subject:  `[SRMS Feedback] ${TYPES.find(t => t.key === type)?.label} — ${settings?.school_name || 'Unknown school'}`,
            school:   settings?.school_name || 'Unknown',
            user:     `${profile?.full_name || 'Unknown'} (${profile?.email || ''})`,
            type:     TYPES.find(t => t.key === type)?.label,
            page:     currentPage || 'Unknown',
            message:  desc.trim(),
          }),
        })
      } catch (_) {
        // Webhook failure is silent — Supabase save already succeeded
      }
    }

    setSaving(false); setDone(true)
  }

  return (
    <>
      {/* ── Floating trigger ── */}
      <button
        onClick={() => { setOpen(true) }}
        title="Send feedback"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 800,
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--ink4)', border: '1px solid var(--line2)',
          color: 'var(--mist2)', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background    = 'var(--ink5)'
          e.currentTarget.style.color         = 'var(--white)'
          e.currentTarget.style.borderColor   = 'var(--line2)'
          e.currentTarget.style.transform     = 'scale(1.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background    = 'var(--ink4)'
          e.currentTarget.style.color         = 'var(--mist2)'
          e.currentTarget.style.borderColor   = 'var(--line2)'
          e.currentTarget.style.transform     = 'scale(1)'
        }}
      >
        ⚑
      </button>

      {/* ── Modal ── */}
      {open && (
        <>
          <style>{`
            @keyframes fbFade   { from { opacity:0 } to { opacity:1 } }
            @keyframes fbSlide  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
          `}</style>

          {/* backdrop */}
          <div
            onClick={close}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(8,8,18,0.7)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              animation: 'fbFade 0.18s ease both',
            }}
          />

          {/* panel */}
          <div style={{
            position: 'fixed', bottom: 80, right: 24, zIndex: 1001,
            width: 380, maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            background: 'var(--ink2)', border: '1px solid var(--line2)',
            borderRadius: 'var(--r-xl)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
            animation: 'fbSlide 0.22s cubic-bezier(.16,1,.3,1) both',
          }}>

            {/* accent strip */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: 0.6 }}/>

            {done ? (
              /* ── Success state ── */
              <div style={{ padding: '36px 28px', textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, margin: '0 auto 20px', color: 'var(--emerald)',
                }}>✓</div>
                <div className="d" style={{ fontSize: 17, fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>
                  Thanks for the feedback
                </div>
                <p style={{ fontSize: 13, color: 'var(--mist2)', lineHeight: 1.6, marginBottom: 24 }}>
                  We've received your report and will look into it.
                </p>
                <button onClick={close} style={{
                  width: '100%', padding: '10px',
                  background: 'var(--ink4)', border: '1px solid var(--line2)',
                  borderRadius: 'var(--r-sm)', color: 'var(--mist2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>Close</button>
              </div>
            ) : (
              /* ── Form ── */
              <div style={{ padding: '24px 24px 20px' }}>

                {/* header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div className="d" style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>Send Feedback</div>
                    <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2 }}>
                      {settings?.school_name || 'Your school'}
                    </div>
                  </div>
                  <button onClick={close} style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--ink4)', border: '1px solid var(--line2)',
                    color: 'var(--mist3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontFamily: 'inherit',
                  }}>✕</button>
                </div>

                {/* type selector */}
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'Clash Display',sans-serif" }}>
                  Type
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {TYPES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setType(t.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 'var(--r-sm)',
                        background: type === t.key ? 'rgba(232,184,75,0.08)' : 'var(--ink3)',
                        border: `1px solid ${type === t.key ? 'rgba(232,184,75,0.3)' : 'var(--line2)'}`,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        fontFamily: 'inherit',
                        color: 'var(--white)',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--white)' }}>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* description */}
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'Clash Display',sans-serif" }}>
                  Description
                </div>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder={
                    type === 'bug'        ? 'What happened? What were you trying to do?' :
                    type === 'suggestion' ? 'What would you like to see improved?' :
                                           'What\'s on your mind?'
                  }
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--ink3)', border: `1px solid ${error ? 'var(--rose)' : 'var(--line2)'}`,
                    borderRadius: 'var(--r-sm)', padding: '10px 12px',
                    color: 'var(--white)', fontSize: 13, lineHeight: 1.6,
                    resize: 'vertical', minHeight: 90, outline: 'none',
                    fontFamily: 'inherit', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.07)' }}
                  onBlur={e  => { e.target.style.borderColor = error ? 'var(--rose)' : 'var(--line2)'; e.target.style.boxShadow = 'none' }}
                />
                {error && <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 5 }}>{error}</div>}

                {/* meta info */}
                <div style={{
                  marginTop: 12, padding: '8px 12px',
                  background: 'var(--ink3)', border: '1px solid var(--line2)',
                  borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--mist3)',
                  display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
                }}>
                  <span>👤 {profile?.full_name || '—'}</span>
                  <span>📄 {currentPage || '—'}</span>
                </div>

                {/* submit */}
                <button
                  onClick={submit}
                  disabled={saving || !desc.trim()}
                  style={{
                    marginTop: 14, width: '100%', padding: '11px',
                    background: saving || !desc.trim() ? 'var(--ink5)' : 'var(--gold)',
                    border: 'none', borderRadius: 'var(--r-sm)',
                    color: saving || !desc.trim() ? 'var(--mist3)' : 'var(--ink)',
                    fontSize: 13, fontWeight: 700, cursor: saving || !desc.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                >
                  {saving ? 'Sending…' : 'Send Feedback →'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}