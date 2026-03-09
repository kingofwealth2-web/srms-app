import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META } from '../lib/constants'
import { fmtDate } from '../lib/helpers'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Spinner from '../components/Spinner'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'
import Avatar from '../components/Avatar'
import LoadingScreen from '../components/LoadingScreen'
import Skeleton from '../components/Skeleton'

const MODULE_META = {
  Students:      { icon: '👤', color: 'var(--sky)' },
  Classes:       { icon: '🏫', color: 'var(--amber)' },
  Grades:        { icon: '📝', color: 'var(--emerald)' },
  Attendance:    { icon: '📋', color: 'var(--gold)' },
  Fees:          { icon: '💳', color: 'var(--rose)' },
  Payments:      { icon: '💰', color: 'var(--emerald)' },
  Behaviour:     { icon: '⭐', color: 'var(--amber)' },
  Announcements: { icon: '📢', color: 'var(--sky)' },
  Users:         { icon: '👥', color: 'var(--gold)' },
  Settings:      { icon: '⚙️', color: 'var(--mist2)' },
}

const ACTION_COLOR = {
  Created:  'var(--emerald)',
  Updated:  'var(--sky)',
  Deleted:  'var(--rose)',
  Locked:   'var(--rose)',
  Unlocked: 'var(--emerald)',
  Marked:   'var(--gold)',
  'Bulk Promote': 'var(--amber)',
}

export default function AuditLog({profile}) {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [fModule, setFModule]   = useState('')
  const [fUser,   setFUser]     = useState('')
  const [fSearch, setFSearch]   = useState('')
  const [users,   setUsers]     = useState([])

  const fetchLogs = async (isRefresh = false) => {
    if (!profile?.school_id) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    const cutoff = new Date(Date.now() - 50*24*60*60*1000).toISOString()
    const [{ data: logsData, error }, { data: usersData }] = await Promise.all([
      supabase.from('audit_logs').select('*').eq('school_id', profile.school_id).gte('created_at', cutoff).order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('id,full_name,email,role').eq('school_id', profile.school_id)
    ])
    if (error) console.error(error)
    setLogs(logsData || [])
    setUsers(usersData || [])
    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [profile?.school_id])

  const modules = [...new Set(logs.map(l=>l.module))].sort()
  const filtered = logs.filter(l=>{
    if(fModule && l.module!==fModule) return false
    if(fUser   && l.user_id!==fUser)  return false
    if(fSearch) {
      const q=fSearch.toLowerCase()
      if(!l.description?.toLowerCase().includes(q) &&
         !l.action?.toLowerCase().includes(q) &&
         !l.user_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const fmt = iso => {
    const d = new Date(iso)
    return d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
  }
  const timeAgo = iso => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24)
    if(d>0) return `${d}d ago`
    if(h>0) return `${h}h ago`
    if(m>0) return `${m}m ago`
    return 'just now'
  }

  const isUUID = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  const fmtVal = v => {
    if (v === null || v === undefined) return '—'
    if (isUUID(String(v))) return `ID: ${String(v).slice(0,8)}…`
    return String(v)
  }

  const renderDiff = (log) => {
    if(!log.before_data && !log.after_data) return null
    const before = log.before_data||{}
    const after  = log.after_data||{}
    const keys   = [...new Set([...Object.keys(before),...Object.keys(after)])]
      .filter(k=>!['id','created_at','updated_at','password','school_id'].includes(k))
      .filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]))
    if(!keys.length) return <div style={{fontSize:12,color:'var(--mist3)',fontStyle:'italic'}}>No field changes recorded.</div>
    return (
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {keys.map(k=>(
          <div key={k} style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr',gap:8,fontSize:11,alignItems:'start'}}>
            <div style={{color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',paddingTop:2}}>{k.replace(/_/g,' ')}</div>
            {log.action==='Created' ? (
              <>
                <div style={{color:'var(--mist3)',fontStyle:'italic'}}>—</div>
                <div style={{color:'var(--emerald)',background:'rgba(45,212,160,0.08)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all'}}>{fmtVal(after[k])}</div>
              </>
            ) : log.action==='Deleted' ? (
              <>
                <div style={{color:'var(--rose)',background:'rgba(240,107,122,0.08)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all',textDecoration:'line-through'}}>{fmtVal(before[k])}</div>
                <div style={{color:'var(--mist3)',fontStyle:'italic'}}>—</div>
              </>
            ) : (
              <>
                <div style={{color:'var(--mist2)',background:'var(--ink3)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all'}}>{fmtVal(before[k])}</div>
                <div style={{color:'var(--emerald)',background:'rgba(45,212,160,0.08)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all'}}>{fmtVal(after[k])}</div>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  if(profile?.role!=='superadmin') return <div style={{padding:48,textAlign:'center',color:'var(--mist3)'}}>Access restricted to superadmin.</div>

  if(loading) return (
    <div>
      <PageHeader title='Audit Log' sub='Loading events...'/>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:'14px 16px',display:'flex',gap:12,alignItems:'center'}}>
            <Skeleton width={34} height={34} style={{borderRadius:'50%',flexShrink:0}}/>
            <div style={{flex:1}}>
              <Skeleton width='40%' height={12} style={{marginBottom:8}}/>
              <Skeleton width='25%' height={10}/>
            </div>
            <Skeleton width={80} height={10}/>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title='Audit Log' sub={`${filtered.length} events · last 50 days`}>
        <Btn variant='ghost' size='sm' onClick={() => fetchLogs(true)} disabled={refreshing}>
          {refreshing ? <><Spinner/> Refreshing...</> : '↻ Refresh'}
        </Btn>
      </PageHeader>

      {/* Filters */}
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:13}}>⌕</span>
            <input value={fSearch} onChange={e=>setFSearch(e.target.value)} placeholder='Search actions, users, descriptions...'
              style={{width:'100%',paddingLeft:32,paddingRight:12,paddingTop:8,paddingBottom:8,background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--white)',fontSize:13,boxSizing:'border-box'}}/>
          </div>
          <select value={fModule} onChange={e=>setFModule(e.target.value)}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:140}}>
            <option value=''>All Modules</option>
            {modules.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select value={fUser} onChange={e=>setFUser(e.target.value)}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
            <option value=''>All Users</option>
            {users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.email}</option>)}
          </select>
          {(fModule||fUser||fSearch) && (
            <button onClick={()=>{setFModule('');setFUser('');setFSearch('')}}
              style={{padding:'8px 14px',background:'transparent',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--mist3)',fontSize:12,cursor:'pointer'}}>
              ✕ Clear
            </button>
          )}
        </div>
      </Card>

      {/* Summary chips */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {Object.entries(MODULE_META).filter(([m])=>logs.some(l=>l.module===m)).map(([m,meta])=>{
          const count = logs.filter(l=>l.module===m).length
          return (
            <button key={m} onClick={()=>setFModule(fModule===m?'':m)}
              style={{padding:'5px 12px',background:fModule===m?'var(--ink3)':'transparent',border:`1px solid ${fModule===m?meta.color:'var(--line)'}`,borderRadius:20,color:fModule===m?meta.color:'var(--mist3)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'all 0.15s'}}>
              <span>{meta.icon}</span>
              <span>{m}</span>
              <span style={{background:'var(--ink4)',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:700}}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {filtered.length===0 ? (
          <Card style={{padding:'48px 20px',textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>◫</div>
            <div style={{color:'var(--mist2)',fontWeight:600}}>No audit events found</div>
            <div style={{color:'var(--mist3)',fontSize:12,marginTop:4}}>Try adjusting your filters</div>
          </Card>
        ) : filtered.map((log,i)=>{
          const meta   = MODULE_META[log.module]||{icon:'◈',color:'var(--mist2)'}
          const aColor = ACTION_COLOR[log.action]||'var(--mist2)'
          const isOpen = expanded===log.id
          const hasDiff = log.before_data||log.after_data
          return (
            <div key={log.id}
              style={{background:'var(--ink2)',border:`1px solid ${isOpen?meta.color+'40':'var(--line)'}`,borderRadius:'var(--r)',overflow:'hidden',transition:'border-color 0.15s'}}>
              {/* Main row */}
              <div onClick={()=>setExpanded(isOpen?null:log.id)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:hasDiff?'pointer':'default'}}>
                {/* Module icon */}
                <div style={{width:34,height:34,borderRadius:'50%',background:`${meta.color}15`,border:`1px solid ${meta.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:meta.color,flexShrink:0}}>
                  {meta.icon}
                </div>
                {/* Content */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2,flexWrap:'wrap'}}>
                    <span style={{fontSize:12,fontWeight:700,color:aColor,background:`${aColor}15`,padding:'1px 8px',borderRadius:4}}>{log.action}</span>
                    <span style={{fontSize:12,color:meta.color,fontWeight:600}}>{log.module}</span>
                    <span style={{fontSize:12,color:'var(--mist)',fontWeight:500}}>{log.description}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <Avatar name={log.user_name||'?'} size={18}/>
                      <span style={{fontSize:11,color:'var(--mist3)'}}>{log.user_name||'Unknown'}</span>
                    </div>
                    <span style={{fontSize:10,color:'var(--line2)'}}>·</span>
                    <span style={{fontSize:11,color:'var(--mist3)'}} title={fmt(log.created_at)}>{timeAgo(log.created_at)}</span>
                    <span style={{fontSize:10,color:'var(--line2)'}}>·</span>
                    <span style={{fontSize:11,color:'var(--mist3)'}}>{fmt(log.created_at)}</span>
                  </div>
                </div>
                {/* Expand indicator */}
                {hasDiff && (
                  <div style={{fontSize:12,color:'var(--mist3)',transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}>▾</div>
                )}
              </div>
              {/* Expanded diff */}
              {isOpen && hasDiff && (
                <div style={{borderTop:'1px solid var(--line)',padding:'14px 16px',background:'var(--ink)'}}>
                  {log.action!=='Created'&&log.action!=='Deleted' && (
                    <div style={{display:'grid',gridTemplateColumns:'120px 1fr 1fr',gap:8,marginBottom:8}}>
                      <div/>
                      <div style={{fontSize:10,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>Before</div>
                      <div style={{fontSize:10,color:'var(--emerald)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>After</div>
                    </div>
                  )}
                  {renderDiff(log)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ── SETTINGS ───────────────────────────────────────────────────