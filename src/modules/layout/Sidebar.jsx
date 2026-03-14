import { useState } from 'react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { NAV_ITEMS, NAV_META, ROLE_META } from '../lib/constants'
import { generateYears } from '../lib/helpers'

// ── YEAR SWITCHER ──────────────────────────────────────────────
export function YearSwitcher({ activeYear, currentYear, selectedYear, setSelectedYear, isMobile }) {
  const [open, setOpen] = useState(false)
  const years = generateYears(currentYear)
  const isViewingPast = selectedYear && selectedYear !== currentYear
  const select = (y) => { setSelectedYear(y === currentYear ? null : y); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: isViewingPast ? 'rgba(251,159,58,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isViewingPast ? 'rgba(251,159,58,0.3)' : 'var(--line2)'}`,
          borderRadius: 8, cursor: 'pointer',
          transition: 'all var(--t-fast)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = isViewingPast ? 'rgba(251,159,58,0.12)' : 'rgba(255,255,255,0.07)' }}
        onMouseLeave={e => { e.currentTarget.style.background = isViewingPast ? 'rgba(251,159,58,0.08)' : 'rgba(255,255,255,0.04)' }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: isViewingPast ? 'var(--amber)' : 'var(--mist2)', letterSpacing: '0.02em' }}>{activeYear}</span>
        <svg width={8} height={8} viewBox="0 0 8 8" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1.5 2.5L4 5L6.5 2.5" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist3)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }}/>
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)',
            left: isMobile ? '50%' : 0,
            transform: isMobile ? 'translateX(-50%)' : 'none',
            zIndex: 999,
            background: 'var(--ink4)',
            border: '1px solid var(--line2)',
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            minWidth: 180, overflow: 'hidden',
            animation: 'fadeDown 0.2s cubic-bezier(.16,1,.3,1) both',
          }}>
            <div style={{ padding: '10px 14px 8px', fontSize: 9, fontWeight: 700, color: 'var(--mist3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Academic Year</div>
            {[...years].reverse().map(y => {
              const isCurrent = y === currentYear
              const isActive  = y === activeYear
              return (
                <button key={y} onClick={() => select(y)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px',
                  background: isActive ? 'rgba(232,184,75,0.07)' : 'transparent',
                  borderBottom: '1px solid var(--line)',
                  color: isActive ? 'var(--gold)' : isCurrent ? 'var(--white)' : 'var(--mist2)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                  transition: 'background var(--t-fast)',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{y}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isCurrent && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--emerald)', background: 'rgba(45,212,160,0.1)', borderRadius: 3, padding: '1px 5px' }}>Current</span>}
                    {isActive && <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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
    <>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--gold3), var(--gold))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(232,184,75,0.25)',
            flexShrink: 0,
          }}>
            <span className='d' style={{ fontSize: 14, fontWeight: 700, color: '#0b0b12' }}>S</span>
          </div>
          <span className='d' style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--white)' }}>SRMS</span>
        </div>
        {isMobile ? (
          <button onClick={onDrawerClose} style={{
            background: 'var(--ink5)', border: 'none',
            color: 'var(--mist2)', width: 28, height: 28, borderRadius: '50%',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background var(--t-fast)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--ink6)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--ink5)'}
          >×</button>
        ) : (
          <button onClick={onToggle} style={{
            background: 'none', color: 'var(--mist3)',
            width: 24, height: 24, borderRadius: 6,
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all var(--t-fast)',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--mist)'; e.currentTarget.style.background = 'var(--ink5)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--mist3)'; e.currentTarget.style.background = 'none' }}
          >‹</button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
        {items.map((key, i) => {
          const m = NAV_META[key]
          const isAct = active === key
          return (
            <button key={key}
              onClick={() => { onNav(key); if (isMobile) onDrawerClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                background: isAct ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: isAct ? 'var(--white)' : 'var(--mist3)',
                fontSize: 13.5, fontWeight: isAct ? 600 : 400,
                transition: 'all var(--t-fast)',
                position: 'relative',
                animation: `fadeIn 0.3s ${i * 0.03}s both`,
              }}
              onMouseEnter={e => { if (!isAct) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--mist)' } }}
              onMouseLeave={e => { if (!isAct) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mist3)' } }}
            >
              {/* Active dot */}
              {isAct && (
                <div style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 16, borderRadius: 2,
                  background: 'linear-gradient(180deg, var(--gold2), var(--gold3))',
                  boxShadow: '0 0 8px rgba(232,184,75,0.4)',
                }}/>
              )}
              <span style={{ fontSize: 15, flexShrink: 0, opacity: isAct ? 1 : 0.5, transition: 'opacity var(--t-fast)' }}>{m.icon}</span>
              <span style={{ letterSpacing: '0.005em' }}>{m.label}</span>
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 12px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--line)',
          transition: 'background var(--t-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >
          <button onClick={() => { onNav('myprofile'); if (isMobile) onDrawerClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar name={profile?.full_name} size={32} color={rm.bg}/>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)', border: '1.5px solid var(--ink3)' }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: 10, color: 'var(--mist3)', marginTop: 1 }}>{rm.label}</div>
            </div>
          </button>
          <button onClick={onLogout} title='Sign out' style={{
            background: 'none', color: 'var(--mist3)',
            width: 26, height: 26, borderRadius: 6, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all var(--t-fast)',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)'; e.currentTarget.style.background = 'rgba(240,107,122,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--mist3)'; e.currentTarget.style.background = 'none' }}
          >⏻</button>
        </div>
      </div>
    </>
  )

  // Mobile drawer
  if (isMobile) return (
    <>
      {drawerOpen && (
        <div onClick={onDrawerClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,10,0.75)', zIndex: 200, backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s both' }}/>
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: 270, height: '100vh',
        background: 'var(--ink2)',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', zIndex: 201,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.32s cubic-bezier(.16,1,.3,1)',
        boxShadow: drawerOpen ? '12px 0 60px rgba(0,0,0,0.7)' : 'none',
      }}>
        {navContent}
      </div>
    </>
  )

  // Desktop sidebar
  return (
    <div className='srms-sidebar' style={{
      width: collapsed ? 60 : 224,
      minHeight: '100vh',
      background: 'var(--ink2)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.28s cubic-bezier(.16,1,.3,1)',
      flexShrink: 0, zIndex: 10,
    }}>
      {collapsed ? (
        // Collapsed state
        <>
          <div style={{ padding: '20px 0 16px', display: 'flex', justifyContent: 'center' }}>
            <div onClick={onToggle} style={{
              width: 30, height: 30, borderRadius: 9, cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--gold3), var(--gold))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(232,184,75,0.25)',
              transition: 'box-shadow var(--t-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(232,184,75,0.4)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(232,184,75,0.25)'}
              title='Expand sidebar'
            >
              <span className='d' style={{ fontSize: 14, fontWeight: 700, color: '#0b0b12' }}>S</span>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {items.map(key => {
              const m = NAV_META[key]; const isAct = active === key
              return (
                <button key={key} onClick={() => onNav(key)} title={m.label} style={{
                  width: 40, height: 40, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isAct ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: isAct ? 'var(--gold)' : 'var(--mist3)',
                  fontSize: 16, transition: 'all var(--t-fast)',
                  position: 'relative',
                }}
                  onMouseEnter={e => { if (!isAct) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--mist)' } }}
                  onMouseLeave={e => { if (!isAct) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mist3)' } }}
                >
                  {isAct && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 16, borderRadius: 2, background: 'var(--gold)', boxShadow: '0 0 8px rgba(232,184,75,0.5)' }}/>}
                  {m.icon}
                </button>
              )
            })}
          </nav>
          <div style={{ padding: '12px 0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button onClick={() => onNav('myprofile')} style={{ background: 'none', cursor: 'pointer', borderRadius: '50%' }}>
              <Avatar name={profile?.full_name} size={32} color={rm.bg}/>
            </button>
          </div>
        </>
      ) : (
        navContent
      )}
    </div>
  )
}
