import { useState } from 'react'
import { supabase } from '../../supabase'
import { DEFAULT_GRADING_SCALE, DEFAULT_GRADE_COMPONENTS, generateYears } from '../lib/helpers'
import { CURRENCIES } from '../lib/constants'
import Spinner from '../components/Spinner'

// ── SCHOOL SETUP WIZARD ────────────────────────────────────────
// Shown when a logged-in user has no school_id assigned.
// Creates the school row, settings row, and links the profile.

const STEP_LABELS = ['Your School', 'Academic Setup']

export default function SchoolSetup({ profile, onComplete, onCancel }) {
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const currentYear = generateYears()[0]

  const [form, setForm] = useState({
    // Step 1 — School info
    school_name:    '',
    address:        '',
    region:         '',
    motto:          '',
    // Step 2 — Academic setup
    academic_year:  currentYear,
    period_type:    'semester',
    period_count:   2,
    currency_code:  'GHS',
  })

  const f = k => v => setForm(p => ({ ...p, [k]: v }))

  const next = () => {
    setError('')
    if (step === 0) {
      if (!form.school_name.trim()) { setError('School name is required.'); return }
      if (!form.region.trim())      { setError('Region is required.'); return }
    }
    setStep(s => s + 1)
  }

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      // Single SECURITY DEFINER RPC — bypasses RLS so it works even though
      // the user is still role='teacher'/school_id=null at this point.
      // Creates school, settings, and promotes profile to superadmin atomically.
      const { data, error: rpcErr } = await supabase.rpc('setup_school', {
        p_school_name:      form.school_name.trim(),
        p_address:          form.address.trim(),
        p_region:           form.region.trim(),
        p_motto:            form.motto.trim(),
        p_academic_year:    form.academic_year,
        p_period_type:      form.period_type,
        p_period_count:     parseInt(form.period_count),
        p_currency_code:    form.currency_code,
        p_grading_scale:    DEFAULT_GRADING_SCALE,
        p_grade_components: DEFAULT_GRADE_COMPONENTS,
      })
      if (rpcErr) throw rpcErr

      // Done — hand back to App.jsx to reload
      setStep(2)
      setTimeout(() => onComplete(data.school_id), 1800)

    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setStep(1)
    }
    setSaving(false)
  }

  return (
    <div style={styles.overlay} className='srms-setup-overlay'>
      <style>{`
        .srms-setup-overlay::-webkit-scrollbar { width: 6px; }
        .srms-setup-overlay::-webkit-scrollbar-track { background: transparent; }
        .srms-setup-overlay::-webkit-scrollbar-thumb { background: var(--line2); border-radius: 3px; }
        .srms-setup-overlay::-webkit-scrollbar-thumb:hover { background: var(--mist3); }
      `}</style>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>SRMS</div>
          <h1 style={styles.title}>
            {step === 2 ? 'You\'re all set!' : 'Set up your school'}
          </h1>
          <p style={styles.subtitle}>
            {step === 0 && 'Tell us about your school. This takes about a minute.'}
            {step === 1 && 'Configure your academic structure. You can change this later.'}
            {step === 2 && `Welcome to SRMS, ${profile?.full_name?.split(' ')[0] || 'there'}. Your dashboard is loading.`}
          </p>
        </div>

        {/* Step indicators */}
        {step < 2 && (
          <div style={styles.steps}>
            {STEP_LABELS.map((label, i) => (
              <div key={i} style={styles.stepItem}>
                <div style={{
                  ...styles.stepDot,
                  background: i <= step ? 'var(--gold)' : 'var(--line2)',
                  boxShadow: i === step ? '0 0 0 4px rgba(212,175,55,0.2)' : 'none',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ ...styles.stepLabel, color: i <= step ? 'var(--white)' : 'var(--mist3)' }}>
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && <div style={{ ...styles.stepLine, background: i < step ? 'var(--gold)' : 'var(--line)' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 0 — School Info */}
        {step === 0 && (
          <div style={styles.fields}>
            <FormField label='School Name' required>
              <input
                value={form.school_name}
                onChange={e => f('school_name')(e.target.value)}
                placeholder='e.g. Kandit Standard School'
                style={styles.input}
                autoFocus
              />
            </FormField>
            <FormField label='Region' required>
              <select value={form.region} onChange={e => f('region')(e.target.value)} style={styles.input}>
                <option value=''>Select region...</option>
                {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label='Address'>
              <input
                value={form.address}
                onChange={e => f('address')(e.target.value)}
                placeholder='Town, District'
                style={styles.input}
              />
            </FormField>
            <FormField label='School Motto'>
              <input
                value={form.motto}
                onChange={e => f('motto')(e.target.value)}
                placeholder='e.g. Excellence in All Things'
                style={styles.input}
              />
            </FormField>
          </div>
        )}

        {/* Step 1 — Academic Setup */}
        {step === 1 && (
          <div style={styles.fields}>
            <FormField label='Current Academic Year'>
              <select value={form.academic_year} onChange={e => f('academic_year')(e.target.value)} style={styles.input}>
                {generateYears(form.academic_year).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </FormField>
            <FormField label='Period Structure'>
              <div style={styles.radioGroup}>
                {[['semester', 'Semester-based', '2 semesters per year'], ['term', 'Term-based', '3 terms per year']].map(([val, label, sub]) => (
                  <div key={val}
                    onClick={() => { f('period_type')(val); f('period_count')(val === 'semester' ? 2 : 3) }}
                    style={{ ...styles.radioCard, borderColor: form.period_type === val ? 'var(--gold)' : 'var(--line)', background: form.period_type === val ? 'rgba(212,175,55,0.06)' : 'var(--ink3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ ...styles.radioDot, background: form.period_type === val ? 'var(--gold)' : 'transparent', borderColor: form.period_type === val ? 'var(--gold)' : 'var(--mist3)' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white)' }}>{label}</div>
                        <div style={{ fontSize: 11, color: 'var(--mist3)', marginTop: 2 }}>{sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FormField>
            <FormField label='Currency'>
              <select value={form.currency_code} onChange={e => f('currency_code')(e.target.value)} style={styles.input}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>)}
              </select>
            </FormField>
            <div style={styles.note}>
              ⓘ You can change all of these later in Settings.
            </div>
          </div>
        )}

        {/* Step 2 — Success */}
        {step === 2 && (
          <div style={styles.success}>
            <div style={styles.successIcon}>✓</div>
            <div style={styles.successText}>{form.school_name}</div>
            <div style={styles.successSub}>Loading your dashboard...</div>
            <div style={styles.loader}>
              <div style={styles.loaderBar} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Actions */}
        {step < 2 && (
          <div style={styles.actions}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={styles.backBtn} disabled={saving}>
                ← Back
              </button>
            )}
            <button
              onClick={step === 1 ? submit : next}
              style={{ ...styles.nextBtn, opacity: saving ? 0.7 : 1 }}
              disabled={saving}
            >
              {saving ? <><Spinner /> Setting up...</> : step === 1 ? 'Create School →' : 'Continue →'}
            </button>
          </div>
        )}

        {step < 2 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--mist3)', fontSize: 12, cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => e.target.style.color = 'var(--mist)'}
              onMouseLeave={e => e.target.style.color = 'var(--mist3)'}
            >← Back to sign in</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: 'var(--rose)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'var(--ink)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '24px 20px',
    overflowY: 'auto',
    // Custom scrollbar
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--line2) transparent',
  },
  card: {
    width: '100%', maxWidth: 480,
    background: 'var(--ink2)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r)',
    padding: '40px 36px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
    margin: 'auto',
  },
  header: { marginBottom: 32, textAlign: 'center' },
  logo: {
    display: 'inline-block',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
    color: 'var(--gold)',
    fontFamily: "'Clash Display', sans-serif",
    marginBottom: 20,
    padding: '4px 12px',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 4,
  },
  title: {
    fontSize: 22, fontWeight: 700,
    fontFamily: "'Clash Display', sans-serif",
    color: 'var(--white)', marginBottom: 8,
  },
  subtitle: { fontSize: 13, color: 'var(--mist3)', lineHeight: 1.6 },
  steps: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 0, marginBottom: 32,
  },
  stepItem: { display: 'flex', alignItems: 'center', gap: 8 },
  stepDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: 'var(--ink)',
    transition: 'all 0.2s', flexShrink: 0,
  },
  stepLabel: { fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' },
  stepLine: { width: 40, height: 1, margin: '0 8px', flexShrink: 0 },
  fields: { marginBottom: 8 },
  label: {
    display: 'block', marginBottom: 6,
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--mist2)',
    fontFamily: "'Clash Display', sans-serif",
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--ink3)', border: '1px solid var(--line)',
    borderRadius: 'var(--r-sm)', padding: '10px 14px',
    color: 'var(--white)', fontSize: 13,
    fontFamily: "'Cabinet Grotesk', sans-serif",
    outline: 'none', transition: 'border-color 0.15s',
  },
  radioGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
  radioCard: {
    padding: '14px 16px', borderRadius: 'var(--r-sm)',
    border: '1px solid', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  radioDot: {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid', flexShrink: 0,
    transition: 'all 0.15s',
  },
  note: {
    fontSize: 12, color: 'var(--mist3)',
    padding: '10px 14px',
    background: 'var(--ink3)', borderRadius: 'var(--r-sm)',
    marginBottom: 8,
  },
  error: {
    fontSize: 12, color: 'var(--rose)',
    background: 'rgba(240,107,122,0.08)',
    border: '1px solid rgba(240,107,122,0.2)',
    borderRadius: 'var(--r-sm)', padding: '10px 14px',
    marginBottom: 16,
  },
  actions: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 24,
  },
  backBtn: {
    background: 'transparent', border: '1px solid var(--line)',
    borderRadius: 'var(--r-sm)', padding: '10px 20px',
    color: 'var(--mist2)', fontSize: 13, cursor: 'pointer',
    fontFamily: "'Cabinet Grotesk', sans-serif",
  },
  nextBtn: {
    background: 'var(--gold)', border: 'none',
    borderRadius: 'var(--r-sm)', padding: '10px 24px',
    color: 'var(--ink)', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', marginLeft: 'auto',
    fontFamily: "'Clash Display', sans-serif",
    display: 'flex', alignItems: 'center', gap: 8,
    transition: 'opacity 0.15s',
  },
  success: {
    textAlign: 'center', padding: '20px 0 32px',
  },
  successIcon: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'rgba(45,212,160,0.12)',
    border: '2px solid var(--emerald)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, color: 'var(--emerald)',
    margin: '0 auto 20px',
  },
  successText: {
    fontSize: 18, fontWeight: 700,
    fontFamily: "'Clash Display', sans-serif",
    color: 'var(--white)', marginBottom: 6,
  },
  successSub: { fontSize: 13, color: 'var(--mist3)', marginBottom: 24 },
  loader: {
    height: 3, background: 'var(--line)',
    borderRadius: 2, overflow: 'hidden',
    margin: '0 auto', maxWidth: 200,
  },
  loaderBar: {
    height: '100%', background: 'var(--emerald)',
    borderRadius: 2,
    animation: 'srms-load 1.6s ease-in-out forwards',
    width: '0%',
  },
}

// ── Data ────────────────────────────────────────────────────────

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central',
  'Eastern', 'Greater Accra', 'North East', 'Northern',
  'Oti', 'Savannah', 'Upper East', 'Upper West',
  'Volta', 'Western', 'Western North',
]