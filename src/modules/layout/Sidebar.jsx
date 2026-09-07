import { useState } from 'react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import LogoMark from '../components/LogoMark'
import Select from '../components/Select'
import { NAV_ITEMS, NAV_META, ROLE_META } from '../lib/constants'
import { generateYears } from '../lib/helpers'

function NavIcon({ name }) {
  const common = { fill:'none', stroke:'currentColor', strokeWidth:1.7, strokeLinecap:'round', strokeLinejoin:'round' }
  const paths = {
    dashboard:<><rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/><rect x='3' y='14' width='7' height='7' rx='1'/><rect x='14' y='14' width='7' height='7' rx='1'/></>,
    students:<><path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/></>,
    classes:<><path d='M3 4h18v16H3z'/><path d='M8 9h8M8 13h5'/></>,
    grades:<><path d='M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5'/><path d='m9 10 2 2 4-5'/></>,
    attendance:<><rect x='3' y='5' width='18' height='16' rx='2'/><path d='M16 3v4M8 3v4M3 10h18m-13 5 2 2 4-4'/></>,
    fees:<><rect x='3' y='5' width='18' height='14' rx='2'/><path d='M3 10h18M7 15h3'/></>,
    behaviour:<><path d='M12 3 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6z'/><path d='m9 12 2 2 4-4'/></>,
    reports:<><path d='M4 19V9M10 19V5M16 19v-7M22 19H2'/></>,
    announcements:<><path d='M3 11v2a2 2 0 0 0 2 2h2l4 4V5L7 9H5a2 2 0 0 0-2 2zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12'/></>,
    users:<><circle cx='9' cy='8' r='4'/><path d='M3 21v-2a6 6 0 0 1 12 0v2M19 8v6M16 11h6'/></>,
    settings:<><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 20 14a1.7 1.7 0 0 0-.6 1z'/></>,
    auditlog:<><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><path d='M14 2v6h6M8 13h8M8 17h6'/></>,
  }
  return <svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true' {...common}>{paths[name]}</svg>
}

// ── YEAR SWITCHER ──────────────────────────────────────────────
export function YearSwitcher({ activeYear, currentYear, selectedYear, setSelectedYear, isMobile }) {
  const years = generateYears(currentYear)
  const currentStart = parseInt(currentYear, 10)
  const isViewingPast = selectedYear && parseInt(selectedYear, 10) < currentStart
  const yearOptions = [...years].reverse().map(year => ({
    value: year,
    label: year,
    isCurrent: year === currentYear,
    status: year === currentYear ? 'Current' : parseInt(year, 10) < currentStart ? 'Archived' : 'Upcoming',
  }))

  return (
    <Select
      value={activeYear}
      options={yearOptions}
      onChange={e => setSelectedYear(e.target.value === currentYear ? null : e.target.value)}
      menuLabel='Academic year'
      compact
      accent={isViewingPast ? 'amber' : 'gold'}
      aria-label='Academic year'
      style={{ width: isMobile ? 112 : 120, minWidth: isMobile ? 112 : 120 }}
      renderOption={option => (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
          <span>{option.label}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: option.isCurrent ? 'var(--emerald)' : option.status === 'Upcoming' ? 'var(--gold)' : 'var(--mist3)', background: option.isCurrent ? 'rgba(45,212,160,0.1)' : option.status === 'Upcoming' ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.04)', borderRadius: 3, padding: '2px 6px' }}>
            {option.status}
          </span>
        </span>
      )}
    />
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
            background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'none',
            flexShrink: 0,
          }}>
            <LogoMark size={16}/>
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
            <button key={key} className={`daybook-nav-item ${isAct ? 'is-active' : ''}`}
              onClick={() => { onNav(key); if (isMobile) onDrawerClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                background: isAct ? 'var(--gold-subtle)' : 'transparent',
                color: isAct ? 'var(--white)' : 'var(--mist3)',
                fontSize: 13.5, fontWeight: isAct ? 600 : 400,
                transition: 'all var(--t-fast)',
                position: 'relative',
                animation: `fadeIn 0.2s ${i * 0.018}s both`,
              }}
              onMouseEnter={e => { if (!isAct) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--mist)' } }}
              onMouseLeave={e => { if (!isAct) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mist3)' } }}
            >
              {/* Active dot */}
              {isAct && (
                <div style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 16, borderRadius: 2,
                  background: 'var(--gold)',
                }}/>
              )}
              <span style={{ display:'flex', flexShrink: 0, opacity: isAct ? 1 : 0.62, transition: 'opacity var(--t-fast)' }}><NavIcon name={key}/></span>
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
              background: 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'none',
              transition: 'background var(--t-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gold2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--gold)'}
              title='Expand sidebar'
            >
              <LogoMark size={16}/>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {items.map(key => {
              const m = NAV_META[key]; const isAct = active === key
              return (
                <button key={key} className={`daybook-nav-item ${isAct ? 'is-active' : ''}`} onClick={() => onNav(key)} title={m.label} style={{
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
                  {isAct && (
                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 16, borderRadius: 2, background: 'var(--gold)' }}/>
                  )}
                  <NavIcon name={key}/>
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
