import { useState } from 'react'

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Perfect for small private schools just getting started.',
    monthly: 199,
    yearly: 1990,
    lifetime: 4500,
    color: 'var(--sky)',
    glow: 'rgba(91,168,245,0.15)',
    border: 'rgba(91,168,245,0.25)',
    features: {
      'Student Management': ['Up to 200 students', 'Student profiles & records', 'Class & section management'],
      'Academic': ['Grade entry & report cards', 'Attendance tracking', 'Basic behaviour log'],
      'Communication': ['School announcements'],
      'Access': ['Admin + 2 teachers', 'Standard support'],
      'Not included': ['Parent portal', 'Fees management', 'Analytics & reports', 'Audit log', 'Bulk import/export', 'Multi-role users (unlimited)', 'Priority support'],
    },
  },
  {
    key: 'standard',
    name: 'Standard',
    tagline: 'The most popular plan for growing schools.',
    monthly: 349,
    yearly: 3490,
    lifetime: 7500,
    color: 'var(--gold)',
    glow: 'rgba(232,184,75,0.18)',
    border: 'rgba(232,184,75,0.35)',
    badge: 'Most Popular',
    features: {
      'Student Management': ['Up to 500 students', 'Student profiles & records', 'Class & section management', 'Bulk import/export'],
      'Academic': ['Grade entry & report cards', 'Attendance tracking', 'Behaviour tracking', 'Academic reports & analytics'],
      'Communication': ['School announcements', 'Parent portal (view-only)'],
      'Finance': ['Fees management & tracking'],
      'Access': ['Admin + unlimited teachers', 'Email support'],
      'Not included': ['Full parent portal', 'Audit log', 'Priority support'],
    },
  },
  {
    key: 'premium',
    name: 'Premium',
    tagline: 'Full-featured for established institutions.',
    monthly: 549,
    yearly: 5490,
    lifetime: 12000,
    color: 'var(--emerald)',
    glow: 'rgba(45,212,160,0.15)',
    border: 'rgba(45,212,160,0.25)',
    features: {
      'Student Management': ['Unlimited students', 'Student profiles & records', 'Class & section management', 'Bulk import/export'],
      'Academic': ['Grade entry & report cards', 'Attendance tracking', 'Behaviour tracking', 'Full analytics & reports'],
      'Communication': ['School announcements', 'Full parent portal'],
      'Finance': ['Fees management & tracking'],
      'Access': ['All roles: Admin, Teachers, Parents', 'Audit log & activity history', 'Priority support', 'Custom school settings'],
    },
  },
]

const allFeatureGroups = ['Student Management', 'Academic', 'Communication', 'Finance', 'Access']

const CHECK = ({ color }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="7" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.3" strokeWidth="1"/>
    <path d="M4.5 7.5L6.5 9.5L10.5 5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CROSS = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="7" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
    <path d="M5.5 5.5L9.5 9.5M9.5 5.5L5.5 9.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly') // 'monthly' | 'yearly' | 'lifetime'

  const getPrice = (plan) => {
    if (billing === 'monthly') return { amount: plan.monthly, label: '/mo' }
    if (billing === 'yearly') return { amount: plan.yearly, label: '/yr' }
    return { amount: plan.lifetime, label: ' once' }
  }

  const getSavings = (plan) => {
    if (billing === 'yearly') {
      const saved = plan.monthly * 12 - plan.yearly
      return `Save ₵${saved.toLocaleString()}`
    }
    if (billing === 'lifetime') {
      const breakEven = Math.ceil(plan.lifetime / plan.monthly)
      return `Breaks even in ${breakEven} months`
    }
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ink1, #0b0b12)',
      color: 'var(--white, #f0f0f8)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: '60px 20px 100px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap');

        :root {
          --ink1: #0b0b12;
          --ink2: #11111c;
          --ink3: #16161f;
          --ink4: #1c1c27;
          --ink5: #22222f;
          --ink6: #2a2a38;
          --line: rgba(255,255,255,0.06);
          --line2: rgba(255,255,255,0.09);
          --white: #f0f0f8;
          --mist: #c8c8dc;
          --mist2: #9898b4;
          --mist3: #6868884;
          --gold: #e8b84b;
          --gold2: #f0c85a;
          --gold3: #d4a03a;
          --sky: #5ba8f5;
          --emerald: #2dd4a0;
          --amber: #fb9f3a;
          --rose: #f06b7a;
          --t-fast: 0.15s ease;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; border: none; outline: none; }
        button { cursor: pointer; font-family: inherit; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .plan-card {
          animation: fadeUp 0.5s cubic-bezier(.16,1,.3,1) both;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .plan-card:hover {
          transform: translateY(-4px);
        }
        .billing-btn {
          transition: all 0.18s ease;
        }
        .cta-btn {
          transition: all 0.18s ease;
          position: relative;
          overflow: hidden;
        }
        .cta-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.15s ease;
        }
        .cta-btn:hover::after { background: rgba(255,255,255,0.08); }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56, animation: 'fadeUp 0.5s both' }}>
          {/* Logo pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(232,184,75,0.08)',
            border: '1px solid rgba(232,184,75,0.2)',
            borderRadius: 100, padding: '6px 14px 6px 8px',
            marginBottom: 28,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg, #d4a03a, #e8b84b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#0b0b12',
            }}>S</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.04em' }}>SRMS</span>
          </div>

          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(36px, 6vw, 58px)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 16,
            background: 'linear-gradient(135deg, #f0f0f8 30%, #9898b4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: 17, color: '#9898b4', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Choose a plan that fits your school. All prices in <strong style={{ color: '#c8c8dc' }}>Ghanaian Cedi (₵)</strong>. No hidden fees.
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48, animation: 'fadeUp 0.5s 0.05s both' }}>
          <div style={{
            display: 'inline-flex',
            background: 'var(--ink3)',
            border: '1px solid var(--line2)',
            borderRadius: 12, padding: 4, gap: 2,
          }}>
            {[
              { key: 'monthly', label: 'Monthly' },
              { key: 'yearly', label: 'Yearly', badge: '–17%' },
              { key: 'lifetime', label: 'Lifetime' },
            ].map(({ key, label, badge }) => (
              <button key={key} className="billing-btn" onClick={() => setBilling(key)} style={{
                padding: '8px 18px',
                borderRadius: 9,
                fontSize: 13.5, fontWeight: billing === key ? 600 : 400,
                color: billing === key ? 'var(--white)' : '#6868884',
                background: billing === key ? 'var(--ink5)' : 'transparent',
                boxShadow: billing === key ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {label}
                {badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: billing === key ? 'var(--emerald)' : '#6868884',
                    background: billing === key ? 'rgba(45,212,160,0.12)' : 'transparent',
                    border: `1px solid ${billing === key ? 'rgba(45,212,160,0.2)' : 'transparent'}`,
                    borderRadius: 4, padding: '1px 5px',
                    transition: 'all 0.18s',
                  }}>{badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 64,
        }}>
          {plans.map((plan, i) => {
            const price = getPrice(plan)
            const savings = getSavings(plan)
            const isPopular = plan.badge === 'Most Popular'

            return (
              <div key={plan.key} className="plan-card" style={{
                animationDelay: `${i * 0.08 + 0.1}s`,
                background: isPopular
                  ? `radial-gradient(ellipse at top, ${plan.glow}, transparent 60%), var(--ink2)`
                  : 'var(--ink2)',
                border: `1px solid ${isPopular ? plan.border : 'var(--line2)'}`,
                borderRadius: 20,
                padding: '28px 28px 32px',
                position: 'relative',
                boxShadow: isPopular ? `0 0 0 1px ${plan.border}, 0 24px 60px rgba(0,0,0,0.4)` : '0 8px 30px rgba(0,0,0,0.2)',
              }}>

                {/* Popular badge */}
                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(90deg, ${plan.color}cc, ${plan.color})`,
                    color: '#0b0b12',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '4px 14px', borderRadius: 100,
                    whiteSpace: 'nowrap',
                    boxShadow: `0 4px 16px ${plan.glow}`,
                  }}>{plan.badge}</div>
                )}

                {/* Plan name & tagline */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: plan.color,
                      boxShadow: `0 0 8px ${plan.color}`,
                    }}/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: plan.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{plan.name}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#9898b4', lineHeight: 1.5 }}>{plan.tagline}</p>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#9898b4', marginBottom: 2 }}>₵</span>
                    <span style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 48, fontWeight: 400,
                      color: 'var(--white)',
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}>{price.amount.toLocaleString()}</span>
                    <span style={{ fontSize: 13, color: '#9898b4', marginBottom: 4 }}>{price.label}</span>
                  </div>
                  {savings && (
                    <div style={{
                      marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11.5, fontWeight: 600, color: 'var(--emerald)',
                      background: 'rgba(45,212,160,0.08)',
                      border: '1px solid rgba(45,212,160,0.15)',
                      borderRadius: 6, padding: '3px 8px',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 1v8M2 4l3-3 3 3" stroke="var(--emerald)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {savings}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button className="cta-btn" style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  background: isPopular
                    ? `linear-gradient(135deg, ${plan.color}cc, ${plan.color})`
                    : 'var(--ink5)',
                  color: isPopular ? '#0b0b12' : 'var(--white)',
                  border: isPopular ? 'none' : '1px solid var(--line2)',
                  boxShadow: isPopular ? `0 8px 24px ${plan.glow}` : 'none',
                  marginBottom: 28,
                }}>
                  Get Started with {plan.name}
                </button>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--line)', marginBottom: 24 }}/>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {Object.entries(plan.features).map(([group, items]) => (
                    <div key={group}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        color: group === 'Not included' ? '#9898b4' : plan.color,
                        textTransform: 'uppercase', marginBottom: 10, opacity: group === 'Not included' ? 0.5 : 1,
                      }}>{group}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {items.map(item => (
                          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            {group === 'Not included'
                              ? <CROSS />
                              : <CHECK color={plan.color} />
                            }
                            <span style={{
                              fontSize: 13.5,
                              color: group === 'Not included' ? '#6868884' : '#c8c8dc',
                              opacity: group === 'Not included' ? 0.45 : 1,
                              textDecoration: group === 'Not included' ? 'line-through' : 'none',
                            }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )
          })}
        </div>

        {/* One-time / Lifetime callout */}
        {billing !== 'lifetime' && (
          <div style={{
            background: 'var(--ink2)',
            border: '1px solid var(--line2)',
            borderRadius: 16,
            padding: '24px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
            marginBottom: 48,
            animation: 'fadeUp 0.5s 0.35s both',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>
                💡 Prefer to pay once?
              </div>
              <div style={{ fontSize: 13.5, color: '#9898b4' }}>
                Switch to the <strong style={{ color: '#c8c8dc' }}>Lifetime</strong> plan and pay a one-time fee — no recurring charges, ever.
              </div>
            </div>
            <button className="billing-btn" onClick={() => setBilling('lifetime')} style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'var(--ink5)', border: '1px solid var(--line2)',
              color: 'var(--white)', fontSize: 13.5, fontWeight: 600,
              flexShrink: 0,
            }}>
              View Lifetime Prices →
            </button>
          </div>
        )}

        {/* Footer note */}
        <div style={{ textAlign: 'center', animation: 'fadeUp 0.5s 0.4s both' }}>
          <p style={{ fontSize: 13, color: '#9898b44a', lineHeight: 1.7 }}>
            All plans include a <strong style={{ color: '#9898b4' }}>14-day free trial</strong>. No credit card required. <br/>
            Need a custom plan for a large institution? <a href="mailto:hello@srms.app" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 500 }}>Contact us →</a>
          </p>
        </div>

      </div>
    </div>
  )
}