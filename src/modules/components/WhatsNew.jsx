import { useState, useEffect } from 'react'

// ── Version history ──────────────────────────────────────────────
// Add new entries at the TOP. Bump LATEST_VERSION when adding.
const LATEST_VERSION = '2.0'

const CHANGELOG = [
  {
    version: '2.0',
    date: 'May 2026',
    title: 'Recurring Fees & Bulk Payments',
    entries: [
      {
        icon: '🔁',
        title: 'Recurring Fees',
        description: 'Set up fees that repeat over time — feeding fees, transport, hostel charges. Go to Fees → Recurring tab → New Recurring Fee. Assign it to specific classes and set an amount per period.',
        howto: 'Fees → 🔁 Recurring → + New Recurring Fee',
      },
      {
        icon: '⊞',
        title: 'Bulk Record Payment',
        description: 'Record a recurring fee payment for a whole class at once. For each student, choose Paid (they paid — enter the amount), Owes (present but didn\'t pay), or Out (absent). Students marked Owes show as Outstanding in the register.',
        howto: 'Fees → 🔁 Recurring → select a template → ⊞ Bulk Record Payment',
      },
      {
        icon: '📋',
        title: 'Period Register',
        description: 'See exactly who paid, who owes, and who was absent for any period. Click a period row to expand the register below it. Filter by class or status, and print a clean register for your records.',
        howto: 'Fees → 🔁 Recurring → click any period row',
      },
      {
        icon: '💰',
        title: 'Bulk Collect Payment',
        description: 'Multiple students paying a one-time fee on the same day? Record all of them at once. Filter by fee type and class — only students with outstanding balances appear. Print individual or combined receipts.',
        howto: 'Fees → 💳 Fees tab → 💰 Bulk Collect Payment',
      },
      {
        icon: '⊞',
        title: 'Bulk Add Fee (improved)',
        description: 'When adding a fee to a whole class, you can now deselect specific students before confirming. Useful when a student shouldn\'t receive a particular charge.',
        howto: 'Fees → 💳 Fees tab → ⊞ Bulk Add Fee → Step 2',
      },
      {
        icon: '🔍',
        title: 'Fee Type Filter',
        description: 'The fees list now has a fee type dropdown filter. Useful when a school has many different fee types and you need to focus on one.',
        howto: 'Fees → 💳 Fees tab → All Fee Types dropdown',
      },
      {
        icon: '👤',
        title: 'Student Improvements',
        description: 'Students can now be added with just a name and class — guardian and date of birth are optional. Filter students by gender (Male/Female) and sort alphabetically by surname. Set your school\'s Student ID Prefix in Settings (e.g. GMS) so all student IDs match your school\'s format.',
        howto: 'Settings → Student ID Prefix · Students → Gender filter & A→Z sort',
      },
    ],
  },
]

// ── Component ────────────────────────────────────────────────────
export default function WhatsNew() {
  const [open, setOpen]   = useState(false)
  const [unread, setUnread] = useState(false)

  const storageKey = 'srms_whats_new_seen'

  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageKey)
      if(seen !== LATEST_VERSION) setUnread(true)
    } catch { setUnread(true) }
  }, [])

  const openModal = () => {
    setOpen(true)
    setUnread(false)
    try { localStorage.setItem(storageKey, LATEST_VERSION) } catch {}
  }

  return (
    <>
      {/* Bell button */}
      <button onClick={openModal}
        title="What's new in SRMS"
        style={{position:'relative',background:'none',border:'none',cursor:'pointer',padding:'6px',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--mist2)',transition:'color 0.15s, background 0.15s'}}
        onMouseEnter={e=>{e.currentTarget.style.color='var(--white)';e.currentTarget.style.background='var(--ink3)'}}
        onMouseLeave={e=>{e.currentTarget.style.color='var(--mist2)';e.currentTarget.style.background='none'}}>
        {/* Bell icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {/* Red dot */}
        {unread && (
          <span style={{position:'absolute',top:4,right:4,width:8,height:8,borderRadius:'50%',background:'var(--rose)',border:'2px solid var(--ink2)'}}/>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
          {/* Backdrop */}
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}/>
          {/* Panel */}
          <div style={{position:'relative',width:'100%',maxWidth:560,maxHeight:'85vh',display:'flex',flexDirection:'column',background:'var(--ink2)',borderRadius:16,border:'1px solid var(--line)',boxShadow:'0 24px 80px rgba(0,0,0,0.4)',overflow:'hidden'}}>
            {/* Header */}
            <div style={{padding:'20px 24px 16px',borderBottom:'1px solid var(--line)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--white)',fontFamily:"'Clash Display',sans-serif"}}>What's New ✨</div>
                  <div style={{fontSize:12,color:'var(--mist3)',marginTop:2}}>Latest updates to SRMS</div>
                </div>
                <button onClick={()=>setOpen(false)}
                  style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:8,width:32,height:32,cursor:'pointer',color:'var(--mist2)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{overflowY:'auto',flex:1,padding:'20px 24px'}}>
              {CHANGELOG.map(release=>(
                <div key={release.version}>
                  {/* Release header */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--ink)',background:'var(--gold)',borderRadius:20,padding:'3px 10px',letterSpacing:'0.04em'}}>
                      v{release.version}
                    </span>
                    <span style={{fontSize:12,color:'var(--mist3)'}}>{release.date}</span>
                    <div style={{flex:1,height:1,background:'var(--line)'}}/>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--white)',marginBottom:14}}>{release.title}</div>

                  {/* Entries */}
                  <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:28}}>
                    {release.entries.map((e,i)=>(
                      <div key={i} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:12,padding:'14px 16px'}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                          <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{e.icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:'var(--white)',marginBottom:5}}>{e.title}</div>
                            <div style={{fontSize:12,color:'var(--mist2)',lineHeight:1.6,marginBottom:8}}>{e.description}</div>
                            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(232,184,75,0.08)',border:'1px solid rgba(232,184,75,0.2)',borderRadius:6,padding:'4px 10px'}}>
                              <span style={{fontSize:10,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>How to</span>
                              <span style={{fontSize:11,color:'var(--gold)',fontWeight:600}}>{e.howto}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div style={{textAlign:'center',padding:'8px 0 4px',borderTop:'1px solid var(--line)'}}>
                <div style={{fontSize:11,color:'var(--mist3)'}}>SRMS by Kofi William · More updates coming soon</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}