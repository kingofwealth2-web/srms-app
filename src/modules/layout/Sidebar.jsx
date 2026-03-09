import { useState } from 'react'
import Avatar from '../components/Avatar'
import { NAV_ITEMS, NAV_META, ROLE_META } from '../lib/constants'
import { generateYears } from '../lib/helpers'

// ── YEAR SWITCHER ──────────────────────────────────────────────
export function YearSwitcher({ activeYear, currentYear, selectedYear, setSelectedYear, isMobile }) {
  const [open, setOpen] = useState(false)
  const years = generateYears(currentYear)
  const isPast = selectedYear && selectedYear !== currentYear
  const select = y => { setSelectedYear(y === currentYear ? null : y); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 10px 3px 8px',
        background: isPast ? 'rgba(251,159,58,0.1)' : 'var(--ink4)',
        border: `1px solid ${isPast ? 'rgba(251,159,58,0.35)' : 'var(--line2)'}`,
        borderRadius: 8, cursor: 'pointer',
        transition: 'all var(--t-fast)',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = isPast ? 'rgba(251,159,58,0.15)' : 'var(--ink5)' }}
        onMouseLeave={e => { e.currentTarget.style.background = isPast ? 'rgba(251,159,58,0.1)' : 'var(--ink4)' }}
      >
        <span style={{ fontSize: 10, color: isPast ? 'var(--amber)' : 'var(--mist3)' }}>📅</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? 'var(--amber)' : 'var(--mist2)', letterSpacing: '0.01em' }}>{activeYear}</span>
        <span style={{ fontSize: 8, color: isPast ? 'var(--amber)' : 'var(--mist3)', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }}/>
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)',
            left: isMobile ? '50%' : 0,
            transform: isMobile ? 'translateX(-50%)' : 'none',
            zIndex: 999,
            background: 'var(--ink4)', border: '1px solid var(--line2)',
            borderRadius: 12, minWidth: 190, overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            animation: 'fadeDown 0.2s cubic-bezier(.16,1,.3,1) both',
          }}>
            <div style={{ padding: '8px 14px 6px', fontSize: 9, fontWeight: 700, color: 'var(--mist3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Academic Year</div>
            {[...years].reverse().map(y => {
              const isCurrent = y === currentYear; const isActive = y === activeYear
              return (
                <button key={y} onClick={() => select(y)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px', background: isActive ? 'rgba(232,184,75,0.08)' : 'transparent',
                  borderBottom: '1px solid var(--line)',
                  color: isActive ? 'var(--gold)' : isCurrent ? 'var(--white)' : 'var(--mist2)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                  transition: 'background var(--t-fast)',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--ink4)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{y}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isCurrent && <span style={{ fontSize: 9, color: 'var(--emerald)', background: 'rgba(45,212,160,0.1)', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>Current</span>}
                    {isActive && <span style={{ color: 'var(--gold)', fontSize: 12 }}>✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── SIDEBAR ────────────────────────────────────────────────────
export default function Sidebar({ profile, active, onNav, collapsed, onToggle, onLogout, isMobile, drawerOpen, onDrawerClose }) {
  const items = NAV_ITEMS[profile?.role] || []
  const rm    = ROLE_META[profile?.role] || {}

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Brand ── */}
      <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(145deg, #b8871e, #e8b84b, #f5d07a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(232,184,75,0.38), inset 0 1px 0 rgba(255,255,255,0.25)',
            flexShrink: 0,
          }}>
            <span className='d' style={{ fontSize: 15, fontWeight: 700, color: '#12120e' }}>S</span>
          </div>
          <div>
            <div className='d' style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>SRMS</div>
            <div style={{ fontSize: 10, color: 'var(--mist3)', marginTop: 1 }}>{profile?.role === 'superadmin' ? 'Super Admin' : rm.label}</div>
          </div>
        </div>
        {isMobile ? (
          <button onClick={onDrawerClose} style={{ background: 'var(--ink5)', border: '1px solid var(--line)', color: 'var(--mist2)', width: 28, height: 28, borderRadius: '50%', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--t-fast)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink6)'; e.currentTarget.style.color = 'var(--white)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink5)'; e.currentTarget.style.color = 'var(--mist2)' }}
          >×</button>
        ) : (
          <button onClick={onToggle} style={{ background: 'none', color: 'var(--mist3)', width: 26, height: 26, borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--t-fast)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink5)'; e.currentTarget.style.color = 'var(--mist)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--mist3)' }}
          >‹</button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
        {items.map((key, i) => {
          const m = NAV_META[key]; const isAct = active === key
          return (
            <button key={key}
              onClick={() => { onNav(key); if (isMobile) onDrawerClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 1,
                background: isAct ? 'rgba(232,184,75,0.1)' : 'transparent',
                color: isAct ? 'var(--gold)' : 'var(--mist2)',
                fontSize: 13.5, fontWeight: isAct ? 600 : 400,
                transition: 'all var(--t-fast)',
                animation: `fadeIn 0.3s ${i * 0.03 + 0.05}s both`,
                position: 'relative', textAlign: 'left',
                boxShadow: isAct ? 'inset 0 1px 0 rgba(232,184,75,0.1)' : 'none',
              }}
              onMouseEnter={e => { if (!isAct) { e.currentTarget.style.background = 'var(--ink4)'; e.currentTarget.style.color = 'var(--mist)' } }}
              onMouseLeave={e => { if (!isAct) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mist2)' } }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, opacity: isAct ? 1 : 0.55, transition: 'opacity var(--t-fast)' }}>{m.icon}</span>
              <span style={{ letterSpacing: '-0.01em' }}>{m.label}</span>
              {isAct && (
                <div style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 18, borderRadius: 2,
                  background: 'linear-gradient(180deg, var(--gold2), var(--gold3))',
                  boxShadow: '0 0 10px rgba(232,184,75,0.5)',
                }}/>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── User ── */}
      <div style={{ padding: '10px 10px 14px', flexShrink: 0, borderTop: '1px solid var(--line)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          background: 'var(--ink3)',
          border: '1px solid var(--line)',
          transition: 'background var(--t-fast), border-color var(--t-fast)',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink3)'; e.currentTarget.style.borderColor = 'var(--line2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink3)'; e.currentTarget.style.borderColor = 'var(--line)' }}
        >
          <button onClick={() => { onNav('myprofile'); if (isMobile) onDrawerClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar name={profile?.full_name} size={32} color={rm.bg}/>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--emerald)', border: '2px solid var(--ink2)' }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{profile?.full_name}</div>
              <div style={{ fontSize: 10, color: 'var(--mist3)', marginTop: 1 }}>{rm.label}</div>
            </div>
          </button>
          <button onClick={onLogout} title='Sign out' style={{
            background: 'none', color: 'var(--mist3)', width: 28, height: 28,
            borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all var(--t-fast)',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)'; e.currentTarget.style.background = 'rgba(240,107,122,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--mist3)'; e.currentTarget.style.background = 'none' }}
          >⏻</button>
        </div>
      </div>
    </div>
  )

  // ── Mobile drawer ──
  if (isMobile) return (
    <>
      {drawerOpen && (
        <div onClick={onDrawerClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,14,0.8)', zIndex: 200, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s both' }}/>
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: 272, height: '100vh',
        background: 'var(--ink2)', borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', zIndex: 201,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(.16,1,.3,1)',
        boxShadow: drawerOpen ? '16px 0 60px rgba(0,0,0,0.7)' : 'none',
      }}>
        {navContent}
      </div>
    </>
  )

  // ── Desktop ──
  return (
    <div style={{
      width: collapsed ? 58 : 222,
      minHeight: '100vh',
      background: 'var(--ink2)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.28s cubic-bezier(.16,1,.3,1)',
      flexShrink: 0, zIndex: 10, overflow: 'hidden',
    }}>
      {collapsed ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
          <div style={{ padding: '18px 0 14px' }}>
            <div onClick={onToggle} style={{
              width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
              background: 'linear-gradient(145deg, #b8871e, #e8b84b, #f5d07a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(232,184,75,0.38), inset 0 1px 0 rgba(255,255,255,0.25)',
              transition: 'box-shadow var(--t-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(232,184,75,0.5)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(232,184,75,0.3)'}
              title='Expand sidebar'
            >
              <span className='d' style={{ fontSize: 15, fontWeight: 700, color: '#12120e' }}>S</span>
            </div>
          </div>
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
            {items.map(key => {
              const m = NAV_META[key]; const isAct = active === key
              return (
                <button key={key} onClick={() => onNav(key)} title={m.label} style={{
                  width: 40, height: 40, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isAct ? 'rgba(232,184,75,0.1)' : 'transparent',
                  color: isAct ? 'var(--gold)' : 'var(--mist3)',
                  fontSize: 16, transition: 'all var(--t-fast)', position: 'relative',
                }}
                  onMouseEnter={e => { if (!isAct) { e.currentTarget.style.background = 'var(--ink4)'; e.currentTarget.style.color = 'var(--mist)' } }}
                  onMouseLeave={e => { if (!isAct) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mist3)' } }}
                >
                  {isAct && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 16, borderRadius: 2, background: 'var(--gold)', boxShadow: '0 0 8px rgba(232,184,75,0.6)' }}/>}
                  {m.icon}
                </button>
              )
            })}
          </nav>
          <div style={{ padding: '12px 0 16px' }}>
            <button onClick={() => onNav('myprofile')} style={{ background: 'none', borderRadius: '50%', cursor: 'pointer' }}>
              <Avatar name={profile?.full_name} size={32} color={rm.bg}/>
            </button>
          </div>
        </div>
      ) : navContent}
    </div>
  )
}