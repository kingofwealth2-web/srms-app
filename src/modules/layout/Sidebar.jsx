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

  const select = (y) => {
    setSelectedYear(y === currentYear ? null : y)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: isMobile ? '3px 8px' : '4px 10px',
          background: isViewingPast ? 'rgba(251,159,58,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isViewingPast ? 'rgba(251,159,58,0.35)' : 'var(--line2)'}`,
          borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background   = isViewingPast ? 'rgba(251,159,58,0.15)' : 'rgba(255,255,255,0.07)'
          e.currentTarget.style.borderColor  = isViewingPast ? 'rgba(251,159,58,0.5)'  : 'var(--mist3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background   = isViewingPast ? 'rgba(251,159,58,0.1)'  : 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor  = isViewingPast ? 'rgba(251,159,58,0.35)' : 'var(--line2)'
        }}
      >
        <svg width={isMobile ? 10 : 11} height={isMobile ? 10 : 11} viewBox="0 0 12 12" fill="none">
          <rect x="1" y="2" width="10" height="9" rx="1.5" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist2)'} strokeWidth="1.2"/>
          <path d="M1 5h10" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist2)'} strokeWidth="1.2"/>
          <path d="M4 1v2M8 1v2" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist2)'} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span style={{
          fontSize: isMobile ? 10 : 12, fontWeight: 600, lineHeight: 1,
          color: isViewingPast ? 'var(--amber)' : 'var(--mist2)',
          letterSpacing: '0.01em', fontFamily: "'Cabinet Grotesk', sans-serif",
        }}>{activeYear}</span>
        <svg width={8} height={8} viewBox="0 0 8 8" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <path d="M1.5 2.5L4 5L6.5 2.5" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist3)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }}/>
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: isMobile ? '50%' : 0,
            transform: isMobile ? 'translateX(-50%)' : 'none',
            zIndex: 999,
            background: 'var(--ink3)', border: '1px solid var(--line2)',
            borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            minWidth: 170, overflow: 'hidden',
            animation: 'fadeUp 0.18s cubic-bezier(.16,1,.3,1) both',
          }}>
            <div style={{
              padding: '10px 14px 8px', borderBottom: '1px solid var(--line)',
              fontSize: 10, fontWeight: 700, color: 'var(--mist3)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Academic Year</div>

            {[...years].reverse().map(y => {
              const isCurrent = y === currentYear
              const isActive  = y === activeYear
              return (
                <button key={y} onClick={() => select(y)} style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '9px 14px',
                  background: isActive ? 'rgba(232,184,75,0.08)' : 'transparent',
                  borderBottom: '1px solid var(--line)',
                  color: isActive ? 'var(--gold)' : isCurrent ? 'var(--white)' : 'var(--mist2)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{y}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isCurrent && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--emerald)',
                        background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.25)',
                        borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>Current</span>
                    )}
                    {isActive && (
                      <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
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
export default function Sidebar({
  profile, active, onNav, collapsed, onToggle,
  onLogout, isMobile, drawerOpen, onDrawerClose,
}) {
  const items = NAV_ITEMS[profile?.role] || []
  const rm    = ROLE_META[profile?.role] || {}

  const navContent = (
    <>
      <div style={{
        padding: '18px 16px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: 'space-between', minHeight: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(232,184,75,0.3)',
          }}>
            <span className='d' style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>S</span>
          </div>
          <span className='d' style={{ fontWeight: 700, fontSize: 15 }}>SRMS</span>
        </div>
        {isMobile ? (
          <button onClick={onDrawerClose} style={{
            background: 'var(--ink4)', border: '1px solid var(--line)',
            color: 'var(--mist2)', width: 30, height: 30, borderRadius: '50%',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        ) : (
          <button onClick={onToggle} style={{
            background: 'none', color: 'var(--mist3)',
            fontSize: 18, padding: '2px 6px', borderRadius: 4, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--mist)'; e.currentTarget.style.background = 'var(--ink4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--mist3)'; e.currentTarget.style.background = 'none' }}
          >‹</button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        <div style={{
          fontSize: 9, fontWeight: 600, color: 'var(--mist3)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          padding: '8px 8px 6px', fontFamily: "'Clash Display',sans-serif",
        }}>Navigation</div>
        {items.map(key => {
          const m = NAV_META[key]; const isAct = active === key
          return (
            <button key={key}
              onClick={() => { onNav(key); if (isMobile) onDrawerClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 10px', borderRadius: 'var(--r-sm)', marginBottom: 2,
                background: isAct ? 'rgba(232,184,75,0.1)' : 'transparent',
                color: isAct ? 'var(--gold)' : 'var(--mist2)',
                fontSize: 14, fontWeight: isAct ? 600 : 400,
                transition: 'all 0.15s', justifyContent: 'flex-start',
                borderLeft: isAct ? '2px solid var(--gold)' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!isAct) { e.currentTarget.style.background = 'var(--ink3)'; e.currentTarget.style.color = 'var(--white)' } }}
              onMouseLeave={e => { if (!isAct) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mist2)' } }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, opacity: isAct ? 1 : 0.7 }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--line)', padding: '14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { onNav('myprofile'); onDrawerClose() }} title='My Profile'
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              flex: 1, minWidth: 0, background: 'none',
              padding: '4px 6px', borderRadius: 'var(--r-sm)',
              transition: 'background 0.15s', cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--ink4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Avatar name={profile?.full_name} size={34} color={rm.bg}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--white)',
              }}>{profile?.full_name}</div>
              <Badge color={rm.color} bg={rm.bg}>{rm.label}</Badge>
            </div>
          </button>
          <button onClick={onLogout} title='Sign out' style={{
            background: 'none', color: 'var(--mist3)',
            fontSize: 14, padding: 4, borderRadius: 4,
            transition: 'color 0.15s', flexShrink: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--mist3)'}
          >⏻</button>
        </div>
      </div>
    </>
  )

  // ── Mobile drawer ──
  if (isMobile) return (
    <>
      {drawerOpen && (
        <div onClick={onDrawerClose} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,5,10,0.7)', zIndex: 200, backdropFilter: 'blur(4px)',
        }}/>
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: 280, height: '100vh',
        background: 'var(--ink2)', borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', zIndex: 201,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(.16,1,.3,1)',
        boxShadow: drawerOpen ? '8px 0 48px rgba(0,0,0,0.6)' : 'none',
      }}>
        {navContent}
      </div>
    </>
  )

  // ── Desktop sidebar ──
  return (
    <div style={{
      width: collapsed ? 64 : 228, minHeight: '100vh',
      background: 'var(--ink2)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(.16,1,.3,1)',
      flexShrink: 0, zIndex: 10,
    }}>
      <div style={{
        padding: collapsed ? '18px 0' : '18px 16px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: collapsed ? 'center' : 'space-between', minHeight: 64,
      }}>
        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(232,184,75,0.3)',
              }}>
                <span className='d' style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>S</span>
              </div>
              <span className='d' style={{ fontWeight: 700, fontSize: 15 }}>SRMS</span>
            </div>
            <button onClick={onToggle} style={{
              background: 'none', color: 'var(--mist3)',
              fontSize: 18, padding: '2px 6px', borderRadius: 4, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--mist)'; e.currentTarget.style.background = 'var(--ink4)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--mist3)'; e.currentTarget.style.background = 'none' }}
            >‹</button>
          </>
        )}
        {collapsed && (
          <div onClick={onToggle}
            style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(232,184,75,0.3)', cursor: 'pointer',
            }}
            title='Expand sidebar'
          >
            <span className='d' style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>S</span>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {!collapsed && (
          <div style={{
            fontSize: 9, fontWeight: 600, color: 'var(--mist3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            padding: '8px 8px 6px', fontFamily: "'Clash Display',sans-serif",
          }}>Navigation</div>
        )}
        {items.map(key => {
          const m = NAV_META[key]; const isAct = active === key
          return (
            <button key={key} onClick={() => onNav(key)} title={collapsed ? m.label : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? 10 : '9px 10px',
                borderRadius: 'var(--r-sm)', marginBottom: 2,
                background: isAct ? 'rgba(232,184,75,0.1)' : 'transparent',
                color: isAct ? 'var(--gold)' : 'var(--mist2)',
                fontSize: 13, fontWeight: isAct ? 600 : 400,
                transition: 'all 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderLeft: isAct ? '2px solid var(--gold)' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!isAct) { e.currentTarget.style.background = 'var(--ink3)'; e.currentTarget.style.color = 'var(--white)' } }}
              onMouseLeave={e => { if (!isAct) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mist2)' } }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, opacity: isAct ? 1 : 0.7 }}>{m.icon}</span>
              {!collapsed && <span>{m.label}</span>}
            </button>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--line)', padding: collapsed ? '12px 8px' : '14px 12px' }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => onNav('myprofile')} title='My Profile'
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                flex: 1, minWidth: 0, background: 'none',
                padding: '4px 6px', borderRadius: 'var(--r-sm)',
                transition: 'background 0.15s', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--ink4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Avatar name={profile?.full_name} size={34} color={rm.bg}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--white)',
                }}>{profile?.full_name}</div>
                <Badge color={rm.color} bg={rm.bg}>{rm.label}</Badge>
              </div>
            </button>
            <button onClick={onLogout} title='Sign out' style={{
              background: 'none', color: 'var(--mist3)',
              fontSize: 14, padding: 4, borderRadius: 4,
              transition: 'color 0.15s', flexShrink: 0,
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--mist3)'}
            >⏻</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button onClick={() => onNav('myprofile')} title='My Profile'
              style={{ background: 'none', borderRadius: '50%', padding: 0, cursor: 'pointer', lineHeight: 0 }}
            >
              <Avatar name={profile?.full_name} size={34} color={rm.bg}/>
            </button>
            <button onClick={onToggle} style={{ background: 'none', color: 'var(--mist3)', fontSize: 16 }}>›</button>
          </div>
        )}
      </div>
    </div>
  )
}
