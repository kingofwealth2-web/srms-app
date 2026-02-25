import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

/* ═══════════════════════════════════════════════════════════════
   SRMS Premium — Fully wired to Supabase
   Auth · Real-time data · Role-based access
═══════════════════════════════════════════════════════════════ */

const G = `
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=cabinet-grotesk@300,400,500,600,700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#09090e;--ink2:#0f0f17;--ink3:#16161f;--ink4:#1e1e2a;--ink5:#252534;
  --line:#2a2a3a;--line2:#363650;
  --gold:#e8b84b;--gold2:#f5d07a;--gold3:#c49a2e;
  --gold-glow:rgba(232,184,75,0.15);--gold-dim:rgba(232,184,75,0.08);
  --emerald:#2dd4a0;--rose:#f06b7a;--sky:#5ba8f5;--amber:#fb9f3a;
  --mist:#c8c8e0;--mist2:#8888a8;--mist3:#55556a;--white:#f0f0f8;
  --r-sm:8px;--r:14px;--r-lg:20px;
  --sh:0 8px 32px rgba(0,0,0,0.5);--sh-gold:0 0 24px rgba(232,184,75,0.12);
}
html,body,#root{height:100%;background:var(--ink);color:var(--white);font-family:'Cabinet Grotesk',sans-serif;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--line2);border-radius:3px}
.d{font-family:'Clash Display',sans-serif}
.mono{font-family:'JetBrains Mono','Fira Code',monospace;font-size:0.9em}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.fu{animation:fadeUp 0.35s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fadeIn 0.2s ease both}
.fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
.fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}
.grain::after{content:'';position:fixed;inset:0;pointer-events:none;opacity:0.018;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:256px;z-index:9999}
button{cursor:pointer;border:none;outline:none;font-family:inherit}
input,select,textarea{font-family:inherit;outline:none}
`

// ── HELPERS ────────────────────────────────────────────────────
const ALL_COMPONENTS = ['classwork','homework','midsemester','final_exam','project']
const DEFAULT_GRADE_COMPONENTS = [
  {key:'classwork',  label:'Classwork',   max_score:10, weight:10, enabled:true},
  {key:'homework',   label:'Homework',    max_score:10, weight:10, enabled:true},
  {key:'midsemester',label:'Midsemester', max_score:20, weight:20, enabled:true},
  {key:'final_exam', label:'Final Exam',  max_score:50, weight:50, enabled:true},
  {key:'project',    label:'Project',     max_score:10, weight:10, enabled:true},
]
const getGradeComponents = settings => settings?.grade_components || DEFAULT_GRADE_COMPONENTS
const calcTotal = (g, gradeComponents) => {
  const comps = gradeComponents || DEFAULT_GRADE_COMPONENTS
  const active = comps.filter(c=>c.enabled)
  if(!active.length) return 0
  return Math.round(active.reduce((sum,c) => {
    const raw = +g[c.key]||0
    const maxRaw = c.max_score||1
    return sum + (raw/maxRaw)*c.weight
  }, 0))
}
const getLetter = (t, scale) => { for(const s of scale) if(t>=s.min&&t<=s.max) return s.letter; return 'F' }
const getGPA    = (t, scale) => { for(const s of scale) if(t>=s.min&&t<=s.max) return s.gpa;    return 0   }
const fmtDate   = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'
const CURRENCIES = [
  {code:'GHS',symbol:'₵', name:'Ghanaian Cedi',    position:'before', decimals:2},
  {code:'USD',symbol:'$', name:'US Dollar',         position:'before', decimals:2},
  {code:'GBP',symbol:'£', name:'British Pound',     position:'before', decimals:2},
  {code:'EUR',symbol:'€', name:'Euro',              position:'before', decimals:2},
  {code:'NGN',symbol:'₦', name:'Nigerian Naira',    position:'before', decimals:2},
  {code:'KES',symbol:'KSh',name:'Kenyan Shilling',  position:'before', decimals:2},
  {code:'ZAR',symbol:'R', name:'South African Rand',position:'before', decimals:2},
  {code:'TZS',symbol:'TSh',name:'Tanzanian Shilling',position:'before',decimals:0},
  {code:'UGX',symbol:'USh',name:'Ugandan Shilling', position:'before', decimals:0},
  {code:'XOF',symbol:'Fr', name:'West African CFA', position:'after',  decimals:0},
  {code:'ETB',symbol:'Br', name:'Ethiopian Birr',   position:'before', decimals:2},
  {code:'CAD',symbol:'CA$',name:'Canadian Dollar',  position:'before', decimals:2},
  {code:'AUD',symbol:'A$', name:'Australian Dollar',position:'before', decimals:2},
  {code:'INR',symbol:'₹', name:'Indian Rupee',      position:'before', decimals:2},
  {code:'JPY',symbol:'¥', name:'Japanese Yen',      position:'before', decimals:0},
  {code:'CNY',symbol:'¥', name:'Chinese Yuan',      position:'before', decimals:2},
  {code:'AED',symbol:'AED',name:'UAE Dirham',       position:'before', decimals:2},
]
const getCurrency = settings => {
  const base = CURRENCIES.find(c=>c.code===(settings?.currency_code||'GHS')) || CURRENCIES[0]
  return {
    ...base,
    position: settings?.currency_position || base.position,
    decimals: settings?.currency_decimals ?? base.decimals,
  }
}
const fmtMoney = (n, currency) => {
  const c = currency || CURRENCIES[0]
  const decimals = c.decimals ?? 2
  const formatted = Number(n||0).toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})
  return c.position==='after' ? `${formatted} ${c.symbol}` : `${c.symbol}${formatted}`
}
const genSID    = arr => { const max=arr.reduce((m,s)=>Math.max(m,parseInt(s.student_id?.split('-')[1]||0)),0); return `STU-${String(max+1).padStart(4,'0')}` }
const genRCP    = arr => { const max=arr.filter(f=>f.receipt_no).reduce((m,f)=>Math.max(m,parseInt(f.receipt_no?.split('-')[1]||0)),0); return `RCP-${String(max+1).padStart(4,'0')}` }

// ── DESIGN TOKENS ──────────────────────────────────────────────
const ROLE_META = {
  superadmin:  {label:'Super Admin',    color:'var(--gold)',    bg:'rgba(232,184,75,0.12)'},
  admin:       {label:'Administrator',  color:'var(--sky)',     bg:'rgba(91,168,245,0.12)'},
  classteacher:{label:'Class Teacher',  color:'var(--emerald)', bg:'rgba(45,212,160,0.12)'},
  teacher:     {label:'Subject Teacher',color:'var(--amber)',   bg:'rgba(251,159,58,0.12)'},
}
const STATUS_META = {
  Present:{color:'var(--emerald)',bg:'rgba(45,212,160,0.12)'},
  Absent: {color:'var(--rose)',   bg:'rgba(240,107,122,0.12)'},
  Late:   {color:'var(--amber)',  bg:'rgba(251,159,58,0.12)'},
  Excused:{color:'var(--sky)',    bg:'rgba(91,168,245,0.12)'},
}
const BEHAVIOUR_META = {
  Discipline:    {color:'var(--rose)',   icon:'⚡'},
  Achievement:   {color:'var(--emerald)',icon:'🏆'},
  'Club Activity':{color:'var(--sky)',   icon:'🎯'},
  Notes:         {color:'var(--mist2)', icon:'📎'},
}
const LETTER_COLOR = {'A+':'var(--emerald)','A':'var(--emerald)','B':'var(--sky)','C':'var(--amber)','D':'var(--amber)','F':'var(--rose)'}
const FEE_STATUS   = {
  Paid:       {color:'var(--emerald)',bg:'rgba(45,212,160,0.12)'},
  Partial:    {color:'var(--amber)',  bg:'rgba(251,159,58,0.12)'},
  Outstanding:{color:'var(--rose)',   bg:'rgba(240,107,122,0.12)'},
}
const NAV_ITEMS = {
  superadmin:  ['dashboard','students','classes','grades','attendance','fees','behaviour','reports','announcements','users','settings'],
  admin:       ['dashboard','students','classes','grades','attendance','fees','behaviour','reports','announcements'],
  classteacher:['dashboard','students','grades','attendance','behaviour','announcements'],
  teacher:     ['dashboard','grades','announcements'],
}
const NAV_META = {
  dashboard:    {icon:'▦', label:'Dashboard'},
  students:     {icon:'◈', label:'Students'},
  classes:      {icon:'⊟', label:'Classes'},
  grades:       {icon:'◎', label:'Grades'},
  attendance:   {icon:'◉', label:'Attendance'},
  fees:         {icon:'◈', label:'Fees'},
  behaviour:    {icon:'◐', label:'Behaviour'},
  reports:      {icon:'⊞', label:'Reports'},
  announcements:{icon:'◯', label:'Announcements'},
  users:        {icon:'◈', label:'Users'},
  settings:     {icon:'◧', label:'Settings'},
}

// ── BASE UI COMPONENTS ─────────────────────────────────────────
function Spinner() {
  return <div style={{width:20,height:20,border:'2px solid var(--line)',borderTopColor:'var(--gold)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
}

function Badge({children,color,bg}) {
  return <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:'0.04em',color:color||'var(--mist2)',background:bg||'var(--ink4)'}}>{children}</span>
}

function Btn({children,variant='primary',size='md',onClick,style,disabled}) {
  const v = {
    primary:  {bg:'var(--gold)',  color:'var(--ink)', hover:'var(--gold2)'},
    secondary:{bg:'var(--ink4)', color:'var(--mist)', hover:'var(--ink5)', border:'1px solid var(--line)'},
    ghost:    {bg:'transparent', color:'var(--mist2)',hover:'var(--ink4)', border:'1px solid var(--line)'},
    danger:   {bg:'rgba(240,107,122,0.1)',color:'var(--rose)',hover:'rgba(240,107,122,0.18)',border:'1px solid rgba(240,107,122,0.25)'},
  }[variant]||{}
  const p  = {sm:'5px 14px',md:'8px 20px',lg:'12px 28px'}[size]
  const fs = {sm:'12px',md:'13px',lg:'14px'}[size]
  const [hov,setHov] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:'inline-flex',alignItems:'center',gap:6,padding:p,fontSize:fs,fontWeight:600,
        borderRadius:'var(--r-sm)',fontFamily:"'Cabinet Grotesk',sans-serif",
        background:hov?v.hover:v.bg,color:v.color,border:v.border||'none',
        transition:'all 0.15s',opacity:disabled?0.45:1,cursor:disabled?'not-allowed':'pointer',...style}}>
      {children}
    </button>
  )
}

function Field({label,value,onChange,type='text',placeholder,options,required,rows,style}) {
  const base = {width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13,transition:'border-color 0.15s',lineHeight:1.5}
  const [foc,setFoc] = useState(false)
  const fs = foc ? {borderColor:'var(--gold)',boxShadow:'0 0 0 3px rgba(232,184,75,0.08)'} : {}
  return (
    <div style={{marginBottom:16,...style}}>
      {label && <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>{label}{required&&<span style={{color:'var(--gold)',marginLeft:3}}>*</span>}</label>}
      {options ? (
        <select value={value||''} onChange={e=>onChange(e.target.value)} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={{...base,...fs,cursor:'pointer'}}>
          <option value=''>— Select —</option>
          {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
        </select>
      ) : rows ? (
        <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={{...base,...fs,resize:'vertical'}}/>
      ) : (
        <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={{...base,...fs}}/>
      )}
    </div>
  )
}

function Modal({title,subtitle,onClose,children,width=520}) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}}
      style={{position:'fixed',inset:0,background:'rgba(5,5,10,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div className='fu' style={{width:'100%',maxWidth:width,background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r-lg)',maxHeight:'90vh',overflow:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.6)'}}>
        <div style={{padding:'24px 28px 20px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
          <div>
            <h3 className='d' style={{fontSize:17,fontWeight:600}}>{title}</h3>
            {subtitle && <p style={{fontSize:12,color:'var(--mist2)',marginTop:4}}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{background:'var(--ink4)',border:'1px solid var(--line)',color:'var(--mist2)',width:30,height:30,borderRadius:'50%',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--ink5)';e.currentTarget.style.color='var(--white)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--ink4)';e.currentTarget.style.color='var(--mist2)'}}>×</button>
        </div>
        <div style={{padding:'24px 28px'}}>{children}</div>
      </div>
    </div>
  )
}

function Card({children,style}) {
  return <div style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,...style}}>{children}</div>
}

function KPI({label,value,color,sub,index=0}) {
  return (
    <div className={`fu fu${index+1}`} style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:22,position:'relative',overflow:'hidden',transition:'border-color 0.2s,box-shadow 0.2s'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.boxShadow=`0 0 24px ${color}18`}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--line)';e.currentTarget.style.boxShadow='none'}}>
      <div style={{position:'absolute',top:0,right:0,width:80,height:80,background:`radial-gradient(circle at top right,${color}14,transparent 70%)`,pointerEvents:'none'}}/>
      <div className='d' style={{fontSize:11,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14}}>{label}</div>
      <div className='d' style={{fontSize:32,fontWeight:700,color,letterSpacing:'-0.02em',lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:12,color:'var(--mist3)',marginTop:8}}>{sub}</div>}
    </div>
  )
}

function SectionTitle({children}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
      <span className='d' style={{fontSize:10,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.12em',whiteSpace:'nowrap'}}>{children}</span>
      <div style={{flex:1,height:1,background:'var(--line)'}}/>
    </div>
  )
}

function Avatar({name,size=32,color}) {
  const initials = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('')
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:color||'var(--ink5)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.35,fontWeight:700,color:'var(--mist)',flexShrink:0}}>
      {initials}
    </div>
  )
}

function PageHeader({title,sub,children}) {
  return (
    <div className='fu' style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28,flexWrap:'wrap',gap:16}}>
      <div>
        <h1 className='d' style={{fontSize:26,fontWeight:700,letterSpacing:'-0.02em'}}>{title}</h1>
        {sub && <p style={{color:'var(--mist2)',fontSize:13,marginTop:5}}>{sub}</p>}
      </div>
      {children && <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>{children}</div>}
    </div>
  )
}

function DataTable({columns,data,onRow}) {
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr style={{borderBottom:'1px solid var(--line)'}}>
            {columns.map(c=>(
              <th key={c.key} style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',whiteSpace:'nowrap',fontFamily:"'Clash Display',sans-serif",background:'var(--ink3)'}}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length===0 && <tr><td colSpan={columns.length} style={{padding:48,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No records found</td></tr>}
          {data.map((row,i)=>(
            <tr key={row.id||i} onClick={()=>onRow&&onRow(row)}
              style={{borderBottom:'1px solid var(--line)',cursor:onRow?'pointer':'default',transition:'background 0.1s'}}
              onMouseEnter={e=>{if(onRow)e.currentTarget.style.background='var(--ink3)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
              {columns.map(c=>(
                <td key={c.key} style={{padding:'13px 16px',fontSize:13,color:'var(--white)',verticalAlign:'middle'}}>
                  {c.render ? c.render(row[c.key],row) : (row[c.key]??'—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Toast({msg,type='success'}) {
  const color = type==='error' ? 'var(--rose)' : 'var(--emerald)'
  return (
    <div className='fi' style={{position:'fixed',bottom:28,right:28,zIndex:2000,background:'var(--ink2)',border:`1px solid ${color}40`,borderRadius:'var(--r)',padding:'12px 20px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
      <span style={{fontSize:13,fontWeight:500}}>{msg}</span>
    </div>
  )
}

// ── LOADING SCREEN ─────────────────────────────────────────────
function LoadingScreen({msg='Loading…'}) {
  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,background:'var(--ink)'}}>
      <div style={{width:44,height:44,borderRadius:12,background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(232,184,75,0.4)'}}>
        <span className='d' style={{fontSize:20,fontWeight:700,color:'var(--ink)'}}>S</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,color:'var(--mist2)',fontSize:13}}>
        <Spinner/> {msg}
      </div>
    </div>
  )
}

// ── LOGIN ──────────────────────────────────────────────────────
function Login({onLogin}) {
  const [email,setEmail]       = useState('')
  const [password,setPassword] = useState('')
  const [error,setError]       = useState('')
  const [loading,setLoading]   = useState(false)

  const attempt = async () => {
    if(!email||!password){setError('Please enter your email and password.');return}
    setLoading(true);setError('')
    const {data,error:err} = await supabase.auth.signInWithPassword({email,password})
    if(err){setError(err.message);setLoading(false);return}
    // fetch profile
    const {data:profile} = await supabase.from('profiles').select('*').eq('id',data.user.id).single()
    onLogin({...data.user,...profile})
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'var(--ink)',position:'relative',overflow:'hidden'}}>
      {/* Left */}
      <div style={{flex:'0 0 500px',display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px',position:'relative',zIndex:1}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)',backgroundSize:'40px 40px',opacity:0.3,maskImage:'radial-gradient(ellipse at center,black 40%,transparent 80%)'}}/>
        <div className='fu' style={{position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:56}}>
            <div style={{width:44,height:44,borderRadius:12,background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(232,184,75,0.4)'}}>
              <span className='d' style={{fontSize:20,fontWeight:700,color:'var(--ink)'}}>S</span>
            </div>
            <div>
              <div className='d' style={{fontSize:20,fontWeight:700}}>SRMS</div>
              <div style={{fontSize:11,color:'var(--mist3)',marginTop:1}}>Student Record Management System</div>
            </div>
          </div>
          <h1 className='d' style={{fontSize:38,fontWeight:700,letterSpacing:'-0.03em',lineHeight:1.1,marginBottom:12}}>Welcome<br/>back.</h1>
          <p style={{color:'var(--mist2)',fontSize:14,marginBottom:40,lineHeight:1.6}}>Sign in to access your dashboard<br/>and manage student records.</p>
          <Field label='Email Address' value={email} onChange={setEmail} type='email' placeholder='you@school.edu' required/>
          <Field label='Password' value={password} onChange={setPassword} type='password' placeholder='••••••••' required/>
          {error && <div className='fi' style={{background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:'var(--r-sm)',padding:'11px 14px',fontSize:13,color:'var(--rose)',marginBottom:16}}>{error}</div>}
          <Btn onClick={attempt} disabled={loading} style={{width:'100%',justifyContent:'center',padding:13,fontSize:14,boxShadow:loading?'none':'0 4px 20px rgba(232,184,75,0.25)'}}>
            {loading ? <><Spinner/> Signing in…</> : 'Sign In →'}
          </Btn>
          <p style={{fontSize:12,color:'var(--mist3)',marginTop:20,textAlign:'center'}}>Use the credentials created in the Supabase setup.</p>
        </div>
      </div>
      {/* Right decorative */}
      <div style={{flex:1,background:'var(--ink2)',borderLeft:'1px solid var(--line)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:60,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)',backgroundSize:'60px 60px',opacity:0.4}}/>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(232,184,75,0.07) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div className='fu fu2' style={{position:'relative',textAlign:'center',maxWidth:340}}>
          <div style={{background:'var(--ink)',border:'1px solid var(--line)',borderRadius:'var(--r-lg)',padding:28,marginBottom:16,boxShadow:'0 32px 64px rgba(0,0,0,0.5)'}}>
            <div className='d' style={{fontSize:10,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:20}}>System Overview</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              {[['Students','248','var(--gold)',true],['Classes','12','var(--sky)',false],['Attendance','94%','var(--emerald)',false],['Pass Rate','87%','var(--amber)',true]].map(([l,v,c,g])=>(
                <div key={l} style={{background:'var(--ink2)',border:`1px solid ${g?'var(--gold)':'var(--line)'}`,borderRadius:'var(--r-sm)',padding:14,boxShadow:g?'var(--sh-gold)':undefined}}>
                  <div className='d' style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:'var(--mist3)',marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
            <p style={{fontSize:12,color:'var(--mist3)',lineHeight:1.6}}>Grades · Attendance · Fees · Behaviour<br/>All in one secure platform.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SIDEBAR ────────────────────────────────────────────────────
function Sidebar({profile,active,onNav,collapsed,onToggle,onLogout}) {
  const items = NAV_ITEMS[profile?.role] || []
  const rm    = ROLE_META[profile?.role] || {}
  return (
    <div style={{width:collapsed?64:228,minHeight:'100vh',background:'var(--ink2)',borderRight:'1px solid var(--line)',display:'flex',flexDirection:'column',transition:'width 0.25s cubic-bezier(.16,1,.3,1)',flexShrink:0,zIndex:10}}>
      <div style={{padding:collapsed?'18px 0':'18px 16px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'center',gap:10,justifyContent:collapsed?'center':'space-between',minHeight:64}}>
        {!collapsed && <>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(232,184,75,0.3)'}}>
              <span className='d' style={{fontSize:15,fontWeight:700,color:'var(--ink)'}}>S</span>
            </div>
            <span className='d' style={{fontWeight:700,fontSize:15}}>SRMS</span>
          </div>
          <button onClick={onToggle} style={{background:'none',color:'var(--mist3)',fontSize:18,padding:'2px 6px',borderRadius:4,transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.color='var(--mist)';e.currentTarget.style.background='var(--ink4)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='var(--mist3)';e.currentTarget.style.background='none'}}>‹</button>
        </>}
        {collapsed && <div onClick={onToggle} style={{width:32,height:32,borderRadius:8,background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(232,184,75,0.3)',cursor:'pointer'}} title='Expand sidebar'><span className='d' style={{fontSize:15,fontWeight:700,color:'var(--ink)'}}>S</span></div>}
      </div>
      <nav style={{flex:1,padding:'10px 8px',overflowY:'auto'}}>
        {!collapsed && <div style={{fontSize:9,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.12em',padding:'8px 8px 6px',fontFamily:"'Clash Display',sans-serif"}}>Navigation</div>}
        {items.map(key=>{
          const m=NAV_META[key]; const isAct=active===key
          return (
            <button key={key} onClick={()=>onNav(key)} title={collapsed?m.label:undefined}
              style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:collapsed?10:'9px 10px',borderRadius:'var(--r-sm)',marginBottom:2,background:isAct?'rgba(232,184,75,0.1)':'transparent',color:isAct?'var(--gold)':'var(--mist2)',fontSize:13,fontWeight:isAct?600:400,transition:'all 0.15s',justifyContent:collapsed?'center':'flex-start',borderLeft:isAct?'2px solid var(--gold)':'2px solid transparent'}}
              onMouseEnter={e=>{if(!isAct){e.currentTarget.style.background='var(--ink3)';e.currentTarget.style.color='var(--white)'}}}
              onMouseLeave={e=>{if(!isAct){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--mist2)'}}}>
              <span style={{fontSize:15,flexShrink:0,opacity:isAct?1:0.7}}>{m.icon}</span>
              {!collapsed && <span>{m.label}</span>}
            </button>
          )
        })}
      </nav>
      <div style={{borderTop:'1px solid var(--line)',padding:collapsed?'12px 8px':'14px 12px'}}>
        {!collapsed ? (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Avatar name={profile?.full_name} size={34} color={rm.bg}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{profile?.full_name}</div>
              <Badge color={rm.color} bg={rm.bg}>{rm.label}</Badge>
            </div>
            <button onClick={onLogout} title='Sign out' style={{background:'none',color:'var(--mist3)',fontSize:14,padding:4,borderRadius:4,transition:'color 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--rose)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--mist3)'}>⏻</button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <Avatar name={profile?.full_name} size={34} color={rm.bg}/>
            <button onClick={onToggle} style={{background:'none',color:'var(--mist3)',fontSize:16}}>›</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────────────
function Dashboard({profile,data,settings,onNav}) {
  const {students=[],classes=[],fees=[],attendance=[],grades=[],announcements=[],subjects=[]} = data
  const today = new Date().toISOString().split('T')[0]
  const scale = settings?.grading_scale || []
  const gradeComps = getGradeComponents(settings)
  const currency = getCurrency(settings)
  const myClass = profile?.role==='classteacher' ? classes.find(c=>c.id===profile.class_id) : null
  const todayMarked = myClass ? attendance.some(a=>a.class_id===myClass.id&&a.date===today) : true
  const totalFees = fees.reduce((s,f)=>s+Number(f.amount||0),0)
  const totalPaid = fees.reduce((s,f)=>s+Number(f.paid||0),0)
  const allTotals = grades.map(g=>calcTotal(g,gradeComps))
  const avgScore  = allTotals.length ? Math.round(allTotals.reduce((a,b)=>a+b,0)/allTotals.length) : 0
  const passRate  = allTotals.length ? Math.round(allTotals.filter(s=>s>=50).length/allTotals.length*100) : 0
  const myClassStudents = myClass ? students.filter(s=>s.class_id===myClass.id) : []
  const activeAnn = announcements.filter(a=>a.active).slice(0,4)
  const isAdmin   = ['superadmin','admin'].includes(profile?.role)

  return (
    <div>
      {profile?.role==='classteacher' && !todayMarked && (
        <div className='fu' style={{background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.25)',borderRadius:'var(--r)',padding:'14px 20px',marginBottom:24,display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(251,159,58,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>⚠</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--amber)'}}>Attendance Not Marked Today</div>
            <div style={{fontSize:12,color:'var(--mist2)',marginTop:2}}>{myClass?.name} · {fmtDate(today)}</div>
          </div>
          <Btn size='sm' onClick={()=>onNav('attendance')}>Mark Now →</Btn>
        </div>
      )}
      <PageHeader title={`Good ${new Date().getHours()<12?'morning':'afternoon'}, ${profile?.full_name?.split(' ')[0]||'there'}.`} sub={`${settings?.school_name||'SRMS'} · ${settings?.academic_year||''}`}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:28}}>
        {isAdmin && <>
          <KPI label='Total Students' value={students.length}       color='var(--gold)'    sub={`${classes.length} classes`} index={0}/>
          <KPI label='Fee Collection'  value={`${totalFees?Math.round(totalPaid/totalFees*100):0}%`} color='var(--emerald)' sub={`${fmtMoney(totalPaid,currency)} collected`} index={1}/>
          <KPI label='Average Score'   value={avgScore}             color='var(--sky)'     sub={`Pass rate: ${passRate}%`} index={2}/>
          <KPI label='Active Classes'  value={classes.length}       color='var(--amber)'   sub={`${subjects.length} subjects`} index={3}/>
        </>}
        {profile?.role==='classteacher' && <>
          <KPI label='My Class'        value={myClass?.name||'—'}   color='var(--gold)'    sub='Your assigned class' index={0}/>
          <KPI label='Students'        value={myClassStudents.length} color='var(--sky)'   sub='In your class' index={1}/>
          <KPI label='Attendance'      value={todayMarked?'Marked':'Pending'} color={todayMarked?'var(--emerald)':'var(--amber)'} sub='Today' index={2}/>
          <KPI label='Pass Rate'       value={`${passRate}%`}       color='var(--emerald)' sub='This semester' index={3}/>
        </>}
        {profile?.role==='teacher' && <>
          <KPI label='Subjects'        value={subjects.filter(s=>s.teacher_id===profile.id).length} color='var(--gold)'  sub='Assigned to you' index={0}/>
          <KPI label='Grades Entered'  value={grades.filter(g=>g.subject_id===profile.subject_id).length} color='var(--sky)' sub='Total records' index={1}/>
          <KPI label='Avg Score'       value={avgScore}             color='var(--emerald)' sub='Your subjects' index={2}/>
          <KPI label='Announcements'   value={activeAnn.length}     color='var(--amber)'   sub='Active' index={3}/>
        </>}
      </div>
      <Card>
        <SectionTitle>Recent Announcements</SectionTitle>
        {activeAnn.length===0 && <div style={{padding:32,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No announcements posted yet.</div>}
        {activeAnn.map(a=>(
          <div key={a.id} style={{padding:14,background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:10,borderLeft:`3px solid ${{all:'var(--gold)',teacher:'var(--sky)'}[a.target_role]||'var(--line)'}`,transition:'background 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--ink4)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--ink3)'}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12}}>
              <div>
                <div style={{fontWeight:600,fontSize:13,marginBottom:5}}>{a.title}</div>
                <div style={{fontSize:12,color:'var(--mist2)',lineHeight:1.5}}>{a.body}</div>
                <div style={{fontSize:11,color:'var(--mist3)',marginTop:8}}>Posted by {a.posted_by_name} · {fmtDate(a.created_at)}</div>
              </div>
              <div style={{fontSize:11,color:'var(--mist3)',whiteSpace:'nowrap'}}>{fmtDate(a.created_at)}</div>
            </div>
          </div>
        ))}
        <Btn variant='ghost' size='sm' onClick={()=>onNav('announcements')} style={{marginTop:4}}>View all →</Btn>
      </Card>
    </div>
  )
}

// ── STUDENTS ───────────────────────────────────────────────────
function Students({profile,data,setData,toast,settings}) {
  const {students=[],classes=[]} = data
  const [search,setSearch] = useState('')
  const [fc,setFc]         = useState('')
  const [modal,setModal]   = useState(false)
  const [edit,setEdit]     = useState(null)
  const [form,setForm]     = useState({})
  const [saving,setSaving] = useState(false)
  const f = k => v => setForm(p=>({...p,[k]:v}))
  const canEdit = ['superadmin','admin'].includes(profile?.role)
  const visible = profile?.role==='classteacher' ? students.filter(s=>s.class_id===profile.class_id) : students
  const filtered = visible.filter(s=>{
    const q=search.toLowerCase()
    return (`${s.first_name} ${s.last_name} ${s.student_id}`).toLowerCase().includes(q) && (!fc||s.class_id===fc)
  })
  const openAdd = ()=>{setEdit(null);setForm({first_name:'',last_name:'',class_id:'',dob:'',gender:'',phone:'',email:'',address:'',medical_info:'',guardian_name:'',guardian_relation:'',guardian_phone:'',guardian_email:''});setModal(true)}
  const openEdit = s=>{setEdit(s);setForm({...s});setModal(true)}
  const save = async ()=>{
    if(!form.first_name||!form.last_name||!form.class_id)return
    if(!form.guardian_name||!form.guardian_phone){toast('Please add at least one parent or guardian with a name and phone number','error');return}
    setSaving(true)
    if(edit){
      const {error} = await supabase.from('students').update({...form,updated_at:new Date()}).eq('id',edit.id)
      if(error){toast(error.message,'error')}else{setData(p=>({...p,students:p.students.map(s=>s.id===edit.id?{...s,...form}:s)}));toast('Student updated');setModal(false)}
    } else {
      const sid = genSID(students)
      const {data:row,error} = await supabase.from('students').insert({...form,student_id:sid,created_at:new Date()}).select().single()
      if(error){toast(error.message,'error')}else{setData(p=>({...p,students:[...p.students,row]}));toast('Student added');setModal(false)}
    }
    setSaving(false)
  }
  const del = async id=>{
    if(!confirm('Remove this student?'))return
    const {error} = await supabase.from('students').delete().eq('id',id)
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,students:p.students.filter(s=>s.id!==id)}));toast('Student removed')}
  }
  return (
    <div>
      <PageHeader title='Students' sub={`${filtered.length} of ${visible.length} students`}>
        {canEdit && <Btn onClick={openAdd}>+ New Student</Btn>}
      </PageHeader>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:'1 1 240px'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:14}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search by name or ID…' style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
          </div>
          {canEdit && <select value={fc} onChange={e=>setFc(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Classes</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>}
        </div>
      </Card>
      <Card>
        <DataTable onRow={canEdit?openEdit:null} data={filtered} columns={[
          {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
          {key:'first_name',label:'Student',render:(v,r)=>(
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Avatar name={`${r.first_name} ${r.last_name}`} size={30}/>
              <div><div style={{fontWeight:600}}>{r.first_name} {r.last_name}</div><div style={{fontSize:11,color:'var(--mist3)'}}>{r.email||'—'}</div></div>
            </div>
          )},
          {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'—'},
          {key:'gender',label:'Gender'},
          {key:'dob',label:'Date of Birth',render:v=>fmtDate(v)},
          {key:'medical_info',label:'Medical',render:v=>v&&v!=='None'?<Badge color='var(--rose)'>{v}</Badge>:<span style={{color:'var(--mist3)'}}>None</span>},
          canEdit?{key:'id',label:'',render:(v,r)=>(
            <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
              <Btn variant='ghost' size='sm' onClick={()=>openEdit(r)}>Edit</Btn>
              <Btn variant='danger' size='sm' onClick={()=>del(r.id)}>Remove</Btn>
            </div>
          )}:{key:'id',label:'',render:()=>null},
        ]}/>
      </Card>
      {modal && (
        <Modal title={edit?'Edit Student':'New Student'} subtitle={edit?`ID: ${edit.student_id}`:'A Student ID will be generated automatically.'} onClose={()=>setModal(false)} width={580}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label='First Name' value={form.first_name} onChange={f('first_name')} required/>
            <Field label='Last Name'  value={form.last_name}  onChange={f('last_name')}  required/>
            <Field label='Class' value={form.class_id} onChange={f('class_id')} required options={classes.map(c=>({value:c.id,label:c.name}))}/>
            <Field label='Gender' value={form.gender} onChange={f('gender')} options={['Male','Female','Other']}/>
            <Field label='Date of Birth' value={form.dob} onChange={f('dob')} type='date'/>
            <Field label='Phone' value={form.phone} onChange={f('phone')}/>
            <Field label='Email' value={form.email} onChange={f('email')} type='email'/>
            <Field label='Address' value={form.address} onChange={f('address')}/>
          </div>
          <Field label='Medical Information' value={form.medical_info} onChange={f('medical_info')} placeholder='Known conditions, allergies…'/>
          <div style={{margin:'16px 0 10px',paddingTop:16,borderTop:'1px solid var(--line)'}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
              <span>Parent / Guardian</span>
              <span style={{fontSize:10,color:'var(--rose)',background:'rgba(240,107,122,0.1)',border:'1px solid rgba(240,107,122,0.2)',padding:'2px 8px',borderRadius:10}}>Required</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
              <Field label='Guardian Name' value={form.guardian_name} onChange={f('guardian_name')} required placeholder='Full name'/>
              <Field label='Relationship' value={form.guardian_relation} onChange={f('guardian_relation')} options={['','Mother','Father','Grandmother','Grandfather','Uncle','Aunt','Sibling','Legal Guardian','Other']}/>
              <Field label='Guardian Phone' value={form.guardian_phone} onChange={f('guardian_phone')} required placeholder='Primary contact number'/>
              <Field label='Guardian Email' value={form.guardian_email} onChange={f('guardian_email')} type='email' placeholder='Optional'/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving…</>:'Save Student'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── GRADES ─────────────────────────────────────────────────────
function Grades({profile,data,setData,toast,settings}) {
  const {grades=[],students=[],subjects=[]} = data
  const scale = settings?.grading_scale || []
  const allComps = getGradeComponents(settings)
  const activeComps = allComps.filter(c=>c.enabled)
  const mySubjects = ['superadmin','admin'].includes(profile?.role) ? subjects : subjects.filter(s=>s.teacher_id===profile?.id)
  const myGrades   = ['superadmin','admin'].includes(profile?.role) ? grades   : grades.filter(g=>mySubjects.some(s=>s.id===g.subject_id))
  const [fs,setFs] = useState('')
  const [fp,setFp] = useState('')
  const [modal,setModal] = useState(false)
  const [edit,setEdit]   = useState(null)
  const [form,setForm]   = useState({})
  const [saving,setSaving] = useState(false)
  const f = k => v => setForm(p=>({...p,[k]:v}))
  const periods = settings?.period_type==='term'
    ? Array.from({length:settings.period_count||2},(_,i)=>`Term ${i+1}`)
    : Array.from({length:settings.period_count||2},(_,i)=>`Semester ${i+1}`)
  const filtered = myGrades.filter(g=>(!fs||g.subject_id===fs)&&(!fp||g.period===fp))

  const openAdd = () => {
    const emptyScores = ALL_COMPONENTS.reduce((acc,k)=>({...acc,[k]:''}),{})
    setEdit(null)
    setForm({student_id:'',subject_id:mySubjects[0]?.id||'',...emptyScores,period:periods[0],year:settings?.academic_year||''})
    setModal(true)
  }
  const openEdit = g => { setEdit(g); setForm({...g}); setModal(true) }

  const save = async () => {
    if(!form.student_id||!form.subject_id){toast('Please select a student and subject','error');return}
    // Only save scores for active components; zero out disabled ones
    const scores = ALL_COMPONENTS.reduce((acc,k)=>{
      const comp = allComps.find(c=>c.key===k)
      return {...acc,[k]:comp?.enabled ? (+form[k]||0) : 0}
    },{})
    const g = {...form,...scores}
    setSaving(true)
    if(edit){
      const {error}=await supabase.from('grades').update(g).eq('id',edit.id)
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,grades:p.grades.map(x=>x.id===edit.id?{...x,...g}:x)}));toast('Grade updated');setModal(false)}
    } else {
      const {data:row,error}=await supabase.from('grades').insert(g).select().single()
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,grades:[...p.grades,row]}));toast('Grade recorded');setModal(false)}
    }
    setSaving(false)
  }

  // Live preview total using only active components
  const previewG = ALL_COMPONENTS.reduce((acc,k)=>({...acc,[k]:+form[k]||0}),{})
  const prev  = calcTotal(previewG, allComps)
  const prevL = getLetter(prev,scale)
  const prevG = getGPA(prev,scale)

  // For table: show all components that have any data OR are active
  const tableComps = allComps.filter(c=>c.enabled || grades.some(g=>+g[c.key]>0))

  return (
    <div>
      <PageHeader title='Grades & Records' sub={`${filtered.length} grade records`}>
        {activeComps.length===0
          ? <span style={{fontSize:12,color:'var(--rose)',padding:'8px 16px',background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)'}}>⚠ No grade components active. Configure in Settings.</span>
          : <Btn onClick={openAdd}>+ Record Grades</Btn>
        }
      </PageHeader>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <select value={fs} onChange={e=>setFs(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
            <option value=''>All Subjects</option>
            {mySubjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={fp} onChange={e=>setFp(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Periods</option>
            {periods.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
      </Card>
      <Card>
        <DataTable onRow={openEdit} data={filtered} columns={[
          {key:'student_id',label:'Student',render:v=>{const s=students.find(x=>x.id===v);return s?(<div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={`${s.first_name} ${s.last_name}`} size={28}/><span style={{fontWeight:600}}>{s.first_name} {s.last_name}</span></div>):'—'}},
          {key:'subject_id',label:'Subject',render:v=>subjects.find(s=>s.id===v)?.name||'—'},
          {key:'period',label:'Period'},
          ...tableComps.map(c=>({
            key:c.key,
            label:`${c.label} /${c.max_score}`,
            render:v=><span className='mono' style={{color:c.enabled?'var(--white)':'var(--mist3)'}}>{v||0}</span>
          })),
          {key:'id',label:'Total',render:(_,r)=>{const t=calcTotal(r,allComps);const l=getLetter(t,scale);return(
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span className='mono' style={{fontWeight:700,fontSize:14}}>{t}</span>
              <Badge color={LETTER_COLOR[l]||'var(--mist2)'}>{l}</Badge>
              <span style={{fontSize:11,color:'var(--mist3)'}}>GPA {getGPA(t,scale).toFixed(1)}</span>
            </div>
          )}},
        ]}/>
      </Card>
      {modal && (
        <Modal title={edit?'Edit Grade':'Record Grades'} onClose={()=>setModal(false)} width={600}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label='Student' value={form.student_id} onChange={f('student_id')} required options={students.map(s=>({value:s.id,label:`${s.first_name} ${s.last_name}`}))}/>
            <Field label='Subject' value={form.subject_id} onChange={f('subject_id')} required options={mySubjects.map(s=>({value:s.id,label:s.name}))}/>
            <Field label='Period'        value={form.period} onChange={f('period')} options={periods}/>
            <Field label='Academic Year' value={form.year}   onChange={f('year')}/>
          </div>
          <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:18,marginBottom:16}}>
            <SectionTitle>Score Entry</SectionTitle>
            {/* Active components — editable */}
            {activeComps.length>0 && (
              <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(activeComps.length,4)},1fr)`,gap:'8px 12px',marginBottom:12}}>
                {activeComps.map(c=>(
                  <Field key={c.key} label={`${c.label} /${c.max_score}`} value={form[c.key]||''} onChange={f(c.key)} type='number' style={{marginBottom:0}}/>
                ))}
              </div>
            )}
            {/* Disabled components with existing scores — read-only */}
            {edit && allComps.filter(c=>!c.enabled&&+form[c.key]>0).length>0 && (
              <div style={{marginTop:8,padding:'10px 14px',background:'var(--ink4)',borderRadius:'var(--r-sm)',border:'1px solid var(--line)'}}>
                <div style={{fontSize:10,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Archived scores (component disabled)</div>
                <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                  {allComps.filter(c=>!c.enabled&&+form[c.key]>0).map(c=>(
                    <div key={c.key}>
                      <div style={{fontSize:10,color:'var(--mist3)',marginBottom:2}}>{c.label}</div>
                      <div className='mono' style={{fontSize:14,color:'var(--mist2)'}}>{form[c.key]||0}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{marginTop:14,display:'flex',alignItems:'center',gap:20,background:'var(--ink4)',borderRadius:'var(--r-sm)',padding:'14px 18px',border:`1px solid ${LETTER_COLOR[prevL]||'var(--line)'}20`}}>
              <div>
                <div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Total Score</div>
                <div className='d' style={{fontSize:28,fontWeight:700,color:LETTER_COLOR[prevL]||'var(--mist)',lineHeight:1}}>{prev}<span style={{fontSize:14,color:'var(--mist3)'}}>/100</span></div>
              </div>
              <div style={{width:1,height:40,background:'var(--line)'}}/>
              <div>
                <div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Grade</div>
                <Badge color={LETTER_COLOR[prevL]||'var(--mist2)'}>{prevL}</Badge>
              </div>
              <div style={{width:1,height:40,background:'var(--line)'}}/>
              <div>
                <div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>GPA</div>
                <div className='d' style={{fontSize:22,fontWeight:700}}>{prevG.toFixed(1)}</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving||activeComps.length===0}>{saving?<><Spinner/> Saving…</>:'Save Grade'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── ATTENDANCE ─────────────────────────────────────────────────
function Attendance({profile,data,setData,toast}) {
  const {attendance=[],students=[],classes=[]} = data
  const today = new Date().toISOString().split('T')[0]
  const [date,setDate]     = useState(today)
  const [cid,setCid]       = useState(profile?.role==='classteacher'?profile.class_id:'')
  const [tab,setTab]       = useState('mark')
  const [saving,setSaving] = useState(false)
  const [pendingMarks,setPendingMarks] = useState({})
  const [hasUnsaved,setHasUnsaved] = useState(false)
  const myClasses = profile?.role==='classteacher' ? classes.filter(c=>c.id===profile.class_id) : classes
  const cls = myClasses.find(c=>c.id===cid)
  const classStudents = cls ? students.filter(s=>s.class_id===cls.id) : []
  const savedRecs = attendance.filter(a=>a.date===date&&a.class_id===cid)
  const getSavedStatus = sid => savedRecs.find(r=>r.student_id===sid)?.status||''
  const getStatus = sid => pendingMarks[sid] !== undefined ? pendingMarks[sid] : getSavedStatus(sid)
  const alreadyMarkedToday = date===today && savedRecs.length>0 && Object.keys(pendingMarks).length===0
  const unmarkedCount = classStudents.filter(s=>!getStatus(s.id)).length

  const changeContext = (newCid, newDate) => {
    if(hasUnsaved) {
      if(!window.confirm('You have unsaved attendance marks. Changing will discard them. Continue?')) return
    }
    setPendingMarks({})
    setHasUnsaved(false)
    if(newCid !== undefined) setCid(newCid)
    if(newDate !== undefined) setDate(newDate)
  }

  const markStudent = (sid, status) => {
    setPendingMarks(p=>({...p,[sid]:status}))
    setHasUnsaved(true)
  }

  const markAll = status => {
    const all = classStudents.reduce((acc,s)=>({...acc,[s.id]:status}),{})
    setPendingMarks(all)
    setHasUnsaved(true)
  }

  const saveAttendance = async () => {
    if(!cls) return
    setSaving(true)
    try {
      const allMarks = classStudents
        .map(s=>({student_id:s.id,class_id:cid,date,status:getStatus(s.id)||null,marked_by:profile?.id}))
        .filter(m=>m.status)
      if(allMarks.length===0){toast('No students marked — nothing to save','error');setSaving(false);return}
      const {error:delErr} = await supabase.from('attendance').delete().eq('class_id',cid).eq('date',date)
      if(delErr) throw delErr
      const {data:rows,error:insErr} = await supabase.from('attendance').insert(allMarks).select()
      if(insErr) throw insErr
      setData(p=>({...p,attendance:[...p.attendance.filter(a=>!(a.class_id===cid&&a.date===date)),...(rows||[])]}))
      setPendingMarks({})
      setHasUnsaved(false)
      toast(`Attendance saved — ${allMarks.length} student${allMarks.length!==1?'s':''} recorded ✓`)
    } catch(err) {
      toast(`Save failed: ${err.message}. Please try again.`,'error')
    }
    setSaving(false)
  }

  const statuses = ['Present','Absent','Late','Excused']
  const counts = statuses.reduce((acc,s)=>({...acc,[s]:classStudents.filter(st=>getStatus(st.id)===s).length}),{})
  const histRecs = attendance.filter(a=>!cid||a.class_id===cid).sort((a,b)=>b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader title='Attendance' sub='Mark and review daily attendance records'>
        <Btn variant={tab==='mark'?'primary':'ghost'} size='sm' onClick={()=>setTab('mark')}>Mark Attendance</Btn>
        <Btn variant={tab==='history'?'primary':'ghost'} size='sm' onClick={()=>setTab('history')}>History</Btn>
      </PageHeader>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          {['superadmin','admin'].includes(profile?.role) && (
            <select value={cid} onChange={e=>changeContext(e.target.value,undefined)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:180}}>
              <option value=''>Select a class</option>
              {myClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input type='date' value={date} onChange={e=>changeContext(undefined,e.target.value)}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--white)',fontSize:13}}/>
          {tab==='mark'&&cls&&(
            <div style={{display:'flex',gap:6,marginLeft:'auto',flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:12,color:'var(--mist3)',marginRight:4}}>Mark all:</span>
              {statuses.map(s=>(
                <button key={s} onClick={()=>markAll(s)}
                  style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',background:STATUS_META[s].bg,color:STATUS_META[s].color,border:`1px solid ${STATUS_META[s].color}30`,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </Card>
      {tab==='mark' ? (
        <div>
          {!cls ? (
            <Card><div style={{padding:60,textAlign:'center',color:'var(--mist3)',fontSize:13}}>Select a class to begin marking attendance.</div></Card>
          ) : (
            <>
              {!hasUnsaved && alreadyMarkedToday && (
                <div className='fi' style={{background:'rgba(45,212,160,0.06)',border:'1px solid rgba(45,212,160,0.2)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16}}>✓</span>
                  <span style={{fontSize:13,color:'var(--emerald)'}}>Attendance already marked for today. You can still edit and save again.</span>
                </div>
              )}
              {!hasUnsaved && !alreadyMarkedToday && savedRecs.length===0 && date===today && (
                <div className='fi' style={{background:'rgba(251,159,58,0.06)',border:'1px solid rgba(251,159,58,0.2)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16}}>⚠</span>
                  <span style={{fontSize:13,color:'var(--amber)'}}>Attendance has not been marked yet today for <strong>{cls.name}</strong>.</span>
                </div>
              )}
              {hasUnsaved && unmarkedCount>0 && (
                <div className='fi' style={{background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16,color:'var(--rose)'}}>●</span>
                  <span style={{fontSize:13,color:'var(--rose)'}}><strong>{unmarkedCount} student{unmarkedCount!==1?'s':''}</strong> not yet marked — they won't be recorded.</span>
                </div>
              )}
              <Card>
                <div style={{display:'flex',gap:20,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
                  {statuses.map(s=>(
                    <div key={s} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:STATUS_META[s].color}}/>
                      <span style={{fontSize:13}}><strong style={{color:STATUS_META[s].color}}>{counts[s]}</strong> <span style={{color:'var(--mist3)'}}>{s}</span></span>
                    </div>
                  ))}
                  {unmarkedCount>0 && <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:'50%',background:'var(--mist3)'}}/><span style={{fontSize:13}}><strong style={{color:'var(--mist3)'}}>{unmarkedCount}</strong> <span style={{color:'var(--mist3)'}}>Unmarked</span></span></div>}
                </div>
                <DataTable data={classStudents} columns={[
                  {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
                  {key:'first_name',label:'Student',render:(v,r)=>(
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <Avatar name={`${r.first_name} ${r.last_name}`} size={28}/>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span>
                        {!getStatus(r.id)&&hasUnsaved&&<span style={{width:6,height:6,borderRadius:'50%',background:'var(--rose)',display:'inline-block'}}/>}
                      </div>
                    </div>
                  )},
                  {key:'id',label:'Mark Attendance',render:(_,r)=>(
                    <div style={{display:'flex',gap:6}}>
                      {statuses.map(s=>{
                        const cur=getStatus(r.id)===s
                        const isPending=pendingMarks[r.id]===s
                        return (
                          <button key={s} onClick={()=>markStudent(r.id,s)}
                            style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all 0.12s',fontFamily:"'Cabinet Grotesk',sans-serif",
                              background:cur?STATUS_META[s].bg:'transparent',color:cur?STATUS_META[s].color:'var(--mist3)',
                              border:`1px solid ${cur?STATUS_META[s].color:'var(--line)'}`,
                              outline:isPending?`2px solid ${STATUS_META[s].color}`:'none',outlineOffset:1}}
                            onMouseEnter={e=>{if(!cur){e.currentTarget.style.borderColor=STATUS_META[s].color;e.currentTarget.style.color=STATUS_META[s].color}}}
                            onMouseLeave={e=>{if(!cur){e.currentTarget.style.borderColor='var(--line)';e.currentTarget.style.color='var(--mist3)'}}}>
                            {s}
                          </button>
                        )
                      })}
                    </div>
                  )},
                ]}/>
              </Card>
              <div style={{position:'sticky',bottom:0,marginTop:16,background:'var(--ink2)',border:'1px solid var(--line)',borderTop:`2px solid ${hasUnsaved?'var(--gold)':'var(--line)'}`,borderRadius:'var(--r)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,boxShadow:'0 -8px 32px rgba(0,0,0,0.4)'}}>
                <div style={{fontSize:13}}>
                  {hasUnsaved
                    ? <><span style={{fontWeight:600,color:'var(--amber)'}}>⚠ Unsaved changes</span><span style={{color:'var(--mist2)'}}> — click Save to record attendance</span></>
                    : <span style={{color:'var(--mist3)'}}>✓ All changes saved</span>
                  }
                </div>
                <Btn onClick={saveAttendance} disabled={saving||!hasUnsaved} style={{minWidth:160,justifyContent:'center',boxShadow:hasUnsaved?'0 4px 20px rgba(232,184,75,0.25)':'none'}}>
                  {saving?<><Spinner/> Saving…</>:(unmarkedCount>0?`Save Attendance (${unmarkedCount} unmarked)`:'Save Attendance')}
                </Btn>
              </div>
            </>
          )}
        </div>
      ) : (
        <Card>
          <DataTable data={histRecs.slice(0,100)} columns={[
            {key:'date',label:'Date',render:v=>fmtDate(v)},
            {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'—'},
            {key:'student_id',label:'Student',render:v=>{const s=students.find(x=>x.id===v);return s?`${s.first_name} ${s.last_name}`:'—'}},
            {key:'status',label:'Status',render:v=><Badge color={STATUS_META[v]?.color} bg={STATUS_META[v]?.bg}>{v}</Badge>},
          ]}/>
        </Card>
      )}
    </div>
  )
}

// ── FEES ───────────────────────────────────────────────────────
function Fees({profile,data,setData,toast,settings}) {
  const {fees=[],students=[]} = data
  const currency = getCurrency(settings)
  const [search,setSearch]   = useState('')
  const [fstatus,setFstatus] = useState('')
  const [modal,setModal]     = useState(false)
  const [payModal,setPayModal] = useState(false)
  const [editFee,setEditFee]   = useState(null)
  const [form,setForm]         = useState({})
  const [payForm,setPayForm]   = useState({})
  const [saving,setSaving]     = useState(false)
  const f  = k=>v=>setForm(p=>({...p,[k]:v}))
  const pf = k=>v=>setPayForm(p=>({...p,[k]:v}))
  const enriched = fees.map(fee=>{
    const s=students.find(x=>x.id===fee.student_id)
    const bal=Number(fee.amount||0)-Number(fee.paid||0)
    const status=bal<=0?'Paid':fee.paid>0?'Partial':'Outstanding'
    return{...fee,student_name:s?`${s.first_name} ${s.last_name}`:'—',balance:bal,status}
  })
  const filtered = enriched.filter(f=>f.student_name.toLowerCase().includes(search.toLowerCase())&&(!fstatus||f.status===fstatus))
  const totalOwed = fees.reduce((s,f)=>s+Number(f.amount||0),0)
  const totalPaid = fees.reduce((s,f)=>s+Number(f.paid||0),0)
  const openAdd = ()=>{setForm({student_id:'',fee_type:'',amount:'',due_date:''});setModal(true)}
  const openPay = fee=>{setEditFee(fee);setPayForm({amount:fee.balance});setPayModal(true)}
  const saveFee = async ()=>{
    if(!form.student_id||!form.amount)return
    setSaving(true)
    const {data:row,error}=await supabase.from('fees').insert({student_id:form.student_id,fee_type:form.fee_type,amount:parseFloat(form.amount),paid:0,due_date:form.due_date}).select().single()
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,fees:[...p.fees,row]}));toast('Fee record added');setModal(false)}
    setSaving(false)
  }
  const recordPayment = async ()=>{
    const amt=Math.min(parseFloat(payForm.amount)||0,editFee.balance)
    const newPaid=Number(editFee.paid||0)+amt
    const rcpt=editFee.receipt_no||genRCP(fees)
    const {error}=await supabase.from('fees').update({paid:newPaid,receipt_no:rcpt}).eq('id',editFee.id)
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,fees:p.fees.map(f=>f.id===editFee.id?{...f,paid:newPaid,receipt_no:rcpt}:f)}));toast('Payment recorded');setPayModal(false)}
  }
  return (
    <div>
      <PageHeader title='Fee Management' sub='Track payments, balances and receipts'>
        <Btn onClick={openAdd}>+ Add Fee Record</Btn>
      </PageHeader>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        <KPI label='Total Owed'      value={fmtMoney(totalOwed,currency)} color='var(--mist)'    sub='All fees' index={0}/>
        <KPI label='Collected'       value={fmtMoney(totalPaid,currency)} color='var(--emerald)' sub='Payments received' index={1}/>
        <KPI label='Outstanding'     value={fmtMoney(totalOwed-totalPaid,currency)} color='var(--rose)' sub='Awaiting payment' index={2}/>
        <KPI label='Collection Rate' value={`${totalOwed?Math.round(totalPaid/totalOwed*100):0}%`} color='var(--gold)' sub='Of total owed' index={3}/>
      </div>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:'1 1 200px'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:14}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search student…' style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
          </div>
          <select value={fstatus} onChange={e=>setFstatus(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Status</option>
            <option>Paid</option><option>Partial</option><option>Outstanding</option>
          </select>
        </div>
      </Card>
      <Card>
        <DataTable data={filtered} columns={[
          {key:'student_name',label:'Student',render:(v,r)=>{const s=students.find(x=>x.id===r.student_id);return(<div style={{display:'flex',alignItems:'center',gap:10}}>{s&&<Avatar name={v} size={28}/>}<span style={{fontWeight:600}}>{v}</span></div>)}},
          {key:'fee_type',label:'Fee Type'},
          {key:'amount', label:'Amount',  render:v=><span className='mono'>{fmtMoney(v,currency)}</span>},
          {key:'paid',   label:'Paid',    render:v=><span className='mono' style={{color:'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
          {key:'balance',label:'Balance', render:v=><span className='mono' style={{color:v>0?'var(--rose)':'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
          {key:'status', label:'Status',  render:v=><Badge color={FEE_STATUS[v]?.color} bg={FEE_STATUS[v]?.bg}>{v}</Badge>},
          {key:'receipt_no',label:'Receipt',render:v=>v?<span className='mono' style={{fontSize:12,color:'var(--mist2)'}}>{v}</span>:'—'},
          {key:'id',label:'',render:(_,r)=>r.balance>0?<Btn size='sm' onClick={()=>openPay(r)}>Record Payment</Btn>:<Badge color='var(--emerald)'>✓ Paid</Badge>},
        ]}/>
      </Card>
      {modal && (
        <Modal title='Add Fee Record' onClose={()=>setModal(false)}>
          <Field label='Student' value={form.student_id} onChange={f('student_id')} required options={students.map(s=>({value:s.id,label:`${s.first_name} ${s.last_name}`}))}/>
          <Field label='Fee Type' value={form.fee_type} onChange={f('fee_type')} placeholder='e.g. Tuition, Activity Fee' required/>
          <Field label='Amount' value={form.amount} onChange={f('amount')} type='number' required/>
          <Field label='Due Date' value={form.due_date} onChange={f('due_date')} type='date'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={saveFee} disabled={saving}>{saving?<><Spinner/> Saving…</>:'Save'}</Btn>
          </div>
        </Modal>
      )}
      {payModal && editFee && (
        <Modal title='Record Payment' subtitle={`${editFee.student_name} · ${editFee.fee_type}`} onClose={()=>setPayModal(false)}>
          <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:18,marginBottom:20,display:'flex',gap:24,flexWrap:'wrap'}}>
            {[['Total',fmtMoney(editFee.amount,currency),'var(--mist)'],['Paid',fmtMoney(editFee.paid,currency),'var(--emerald)'],['Balance',fmtMoney(editFee.balance,currency),'var(--rose)']].map(([l,v,c])=>(
              <div key={l}><div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>{l}</div><div className='d' style={{fontSize:20,fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
          <Field label='Payment Amount' value={payForm.amount} onChange={pf('amount')} type='number'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setPayModal(false)}>Cancel</Btn>
            <Btn onClick={recordPayment}>Confirm Payment</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── BEHAVIOUR ──────────────────────────────────────────────────
function Behaviour({profile,data,setData,toast}) {
  const {behaviour=[],students=[]} = data
  const [ftype,setFtype] = useState('')
  const [fsid,setFsid]   = useState('')
  const [modal,setModal] = useState(false)
  const [form,setForm]   = useState({})
  const [saving,setSaving] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const types = ['Discipline','Achievement','Club Activity','Notes']
  const filtered = behaviour.filter(b=>(!ftype||b.type===ftype)&&(!fsid||b.student_id===fsid)).sort((a,b)=>b.created_at?.localeCompare(a.created_at))
  const counts   = types.reduce((acc,t)=>({...acc,[t]:behaviour.filter(b=>b.type===t).length}),{})
  const openAdd  = ()=>{setForm({student_id:'',type:'Achievement',title:'',description:'',date:new Date().toISOString().split('T')[0]});setModal(true)}
  const save = async ()=>{
    if(!form.student_id||!form.title)return
    setSaving(true)
    const {data:row,error}=await supabase.from('behaviour').insert({...form,recorded_by_id:profile?.id,recorded_by_name:profile?.full_name}).select().single()
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,behaviour:[row,...p.behaviour]}));toast('Record added');setModal(false)}
    setSaving(false)
  }
  const del = async id=>{
    if(!confirm('Remove this record?'))return
    const {error}=await supabase.from('behaviour').delete().eq('id',id)
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,behaviour:p.behaviour.filter(b=>b.id!==id)}));toast('Record removed')}
  }
  return (
    <div>
      <PageHeader title='Behaviour & Extracurricular' sub='Discipline, achievements and co-curricular records'>
        <Btn onClick={openAdd}>+ Add Record</Btn>
      </PageHeader>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {types.map((t,i)=>{
          const m=BEHAVIOUR_META[t];const isAct=ftype===t
          return(
            <div key={t} className={`fu fu${i+1}`} onClick={()=>setFtype(isAct?'':t)}
              style={{background:isAct?`${m.color}10`:'var(--ink2)',border:`1px solid ${isAct?m.color:'var(--line)'}`,borderRadius:'var(--r)',padding:18,cursor:'pointer',transition:'all 0.15s'}}>
              <div style={{fontSize:22,marginBottom:8}}>{m.icon}</div>
              <div className='d' style={{fontSize:24,fontWeight:700,color:m.color}}>{counts[t]}</div>
              <div style={{fontSize:12,color:'var(--mist2)',marginTop:4}}>{t}</div>
            </div>
          )
        })}
      </div>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <select value={fsid} onChange={e=>setFsid(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:200}}>
            <option value=''>All Students</option>
            {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
          <select value={ftype} onChange={e=>setFtype(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Types</option>
            {types.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </Card>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.length===0 && <div style={{padding:48,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No records found.</div>}
        {filtered.map(b=>{
          const s=students.find(x=>x.id===b.student_id)
          const m=BEHAVIOUR_META[b.type]||{color:'var(--mist2)',icon:'◎'}
          return(
            <div key={b.id} style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:'18px 20px',display:'flex',gap:14,alignItems:'flex-start',transition:'border-color 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--line2)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}>
              <div style={{width:4,borderRadius:2,alignSelf:'stretch',background:m.color,flexShrink:0}}/>
              <div style={{width:36,height:36,borderRadius:'50%',background:`${m.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:6}}>
                      <Badge color={m.color} bg={`${m.color}15`}>{b.type}</Badge>
                      <span style={{fontWeight:600,fontSize:14}}>{b.title}</span>
                    </div>
                    <p style={{fontSize:13,color:'var(--mist2)',lineHeight:1.6}}>{b.description}</p>
                    <div style={{fontSize:11,color:'var(--mist3)',marginTop:8}}>
                      {s&&<><span style={{color:'var(--mist2)',fontWeight:500}}>{s.first_name} {s.last_name}</span> · </>}
                      Recorded by {b.recorded_by_name} · {fmtDate(b.date||b.created_at)}
                    </div>
                  </div>
                  <button onClick={()=>del(b.id)} style={{background:'none',color:'var(--mist3)',fontSize:16,padding:'4px 8px',borderRadius:4,cursor:'pointer',transition:'all 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.color='var(--rose)';e.currentTarget.style.background='rgba(240,107,122,0.1)'}}
                    onMouseLeave={e=>{e.currentTarget.style.color='var(--mist3)';e.currentTarget.style.background='none'}}>×</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {modal && (
        <Modal title='New Behaviour Record' onClose={()=>setModal(false)}>
          <Field label='Student' value={form.student_id} onChange={f('student_id')} required options={students.map(s=>({value:s.id,label:`${s.first_name} ${s.last_name}`}))}/>
          <Field label='Record Type' value={form.type} onChange={f('type')} options={types}/>
          <Field label='Title' value={form.title} onChange={f('title')} placeholder='Brief descriptive title' required/>
          <Field label='Description' value={form.description} onChange={f('description')} rows={3} placeholder='Provide full details…'/>
          <Field label='Date' value={form.date} onChange={f('date')} type='date'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving…</>:'Save Record'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── REPORTS ────────────────────────────────────────────────────
function Reports({data,settings}) {
  const {students=[],grades=[],attendance=[],fees=[],classes=[],subjects=[]} = data
  const scale   = settings?.grading_scale||[]
  const gradeComps = getGradeComponents(settings)
  const currency = getCurrency(settings)
  const [rtype,setRtype] = useState('academic')
  const [fc,setFc]       = useState('')
  const [fp,setFp]       = useState('')
  const periods = settings?.period_type==='term'
    ? Array.from({length:settings.period_count||2},(_,i)=>`Term ${i+1}`)
    : Array.from({length:settings.period_count||2},(_,i)=>`Semester ${i+1}`)
  const academicData = students.filter(s=>!fc||s.class_id===fc).map(s=>{
    const sg=grades.filter(g=>g.student_id===s.id&&(!fp||g.period===fp))
    const tots=sg.map(g=>calcTotal(g,gradeComps))
    const avg=tots.length?Math.round(tots.reduce((a,b)=>a+b,0)/tots.length):null
    return{...s,avg,gpa:avg!==null?getGPA(avg,scale):null,count:sg.length,letter:avg!==null?getLetter(avg,scale):'—'}
  })
  const attData = students.filter(s=>!fc||s.class_id===fc).map(s=>{
    const sa=attendance.filter(a=>a.student_id===s.id)
    const pres=sa.filter(a=>a.status==='Present').length
    return{...s,total:sa.length,present:pres,absent:sa.filter(a=>a.status==='Absent').length,late:sa.filter(a=>a.status==='Late').length,rate:sa.length?Math.round(pres/sa.length*100):null}
  })
  const feeData = students.filter(s=>!fc||s.class_id===fc).map(s=>{
    const sf=fees.filter(f=>f.student_id===s.id)
    const owed=sf.reduce((a,f)=>a+Number(f.amount||0),0);const paid=sf.reduce((a,f)=>a+Number(f.paid||0),0)
    return{...s,owed,paid,balance:owed-paid,status:owed===0?'—':paid>=owed?'Paid':paid>0?'Partial':'Outstanding'}
  })
  const passRate=academicData.filter(s=>s.avg!==null).length?Math.round(academicData.filter(s=>s.avg!==null&&s.avg>=50).length/academicData.filter(s=>s.avg!==null).length*100):0
  const avgAtt=attData.filter(s=>s.rate!==null).reduce((a,s,_,arr)=>a+s.rate/arr.length,0)||0
  const totalF=feeData.reduce((a,s)=>a+s.owed,0);const totalP=feeData.reduce((a,s)=>a+s.paid,0)
  return (
    <div>
      <PageHeader title='Reports & Analytics' sub='Comprehensive school performance data'>
        <Btn variant='ghost'>⬇ Export PDF</Btn>
        <Btn variant='ghost'>⬇ Export Excel</Btn>
      </PageHeader>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        <KPI label='Pass Rate'       value={`${passRate}%`}  color='var(--emerald)' index={0}/>
        <KPI label='Avg Attendance'  value={`${Math.round(avgAtt)}%`} color='var(--sky)' index={1}/>
        <KPI label='Fee Collection'  value={`${totalF?Math.round(totalP/totalF*100):0}%`} color='var(--gold)' sub={fmtMoney(totalP,currency)} index={2}/>
        <KPI label='Total Students'  value={students.length} color='var(--amber)' index={3}/>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16,background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:4,width:'fit-content'}}>
        {['academic','attendance','fees'].map(t=>(
          <button key={t} onClick={()=>setRtype(t)} style={{padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,background:rtype===t?'var(--ink4)':'transparent',color:rtype===t?'var(--white)':'var(--mist2)',border:rtype===t?'1px solid var(--line)':'1px solid transparent',transition:'all 0.15s',cursor:'pointer',textTransform:'capitalize',fontFamily:"'Cabinet Grotesk',sans-serif"}}>{t}</button>
        ))}
      </div>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <select value={fc} onChange={e=>setFc(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:180}}>
            <option value=''>All Classes</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {rtype==='academic' && <select value={fp} onChange={e=>setFp(e.target.value)} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Periods</option>
            {periods.map(p=><option key={p}>{p}</option>)}
          </select>}
        </div>
      </Card>
      <Card>
        {rtype==='academic' && <DataTable data={academicData} columns={[
          {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
          {key:'first_name',label:'Student',render:(v,r)=><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={`${r.first_name} ${r.last_name}`} size={28}/><span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span></div>},
          {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'—'},
          {key:'count',label:'Subjects'},
          {key:'avg',label:'Avg Score',render:v=>v!==null?<span className='mono' style={{fontWeight:700}}>{v}</span>:'—'},
          {key:'letter',label:'Grade',render:v=>v!=='—'?<Badge color={LETTER_COLOR[v]||'var(--mist2)'}>{v}</Badge>:'—'},
          {key:'gpa',label:'GPA',render:v=>v!==null?<span className='mono'>{v.toFixed(1)}</span>:'—'},
          {key:'avg',label:'Status',render:v=>v===null?null:v>=50?<Badge color='var(--emerald)'>Pass</Badge>:<Badge color='var(--rose)'>Fail</Badge>},
        ]}/>}
        {rtype==='attendance' && <DataTable data={attData} columns={[
          {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
          {key:'first_name',label:'Student',render:(v,r)=><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={`${r.first_name} ${r.last_name}`} size={28}/><span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span></div>},
          {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'—'},
          {key:'total',label:'Days'},
          {key:'present',label:'Present',render:v=><span style={{color:'var(--emerald)',fontWeight:600}}>{v}</span>},
          {key:'absent',label:'Absent',render:v=><span style={{color:'var(--rose)',fontWeight:600}}>{v}</span>},
          {key:'late',label:'Late',render:v=><span style={{color:'var(--amber)',fontWeight:600}}>{v}</span>},
          {key:'rate',label:'Rate',render:v=>v!==null?<span className='mono' style={{fontWeight:700,color:v>=80?'var(--emerald)':v>=60?'var(--amber)':'var(--rose)'}}>{v}%</span>:'—'},
        ]}/>}
        {rtype==='fees' && <DataTable data={feeData} columns={[
          {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
          {key:'first_name',label:'Student',render:(v,r)=><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={`${r.first_name} ${r.last_name}`} size={28}/><span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span></div>},
          {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'—'},
          {key:'owed',label:'Owed',render:v=><span className='mono'>{fmtMoney(v,currency)}</span>},
          {key:'paid',label:'Paid',render:v=><span className='mono' style={{color:'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
          {key:'balance',label:'Balance',render:v=><span className='mono' style={{color:v>0?'var(--rose)':'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
          {key:'status',label:'Status',render:v=>v!=='—'?<Badge color={FEE_STATUS[v]?.color} bg={FEE_STATUS[v]?.bg}>{v}</Badge>:'—'},
        ]}/>}
      </Card>
    </div>
  )
}

// ── ANNOUNCEMENTS ──────────────────────────────────────────────
function Announcements({profile,data,setData,toast}) {
  const {announcements=[]} = data
  const canManage = ['superadmin','admin'].includes(profile?.role)
  const [modal,setModal] = useState(false)
  const [form,setForm]   = useState({})
  const [saving,setSaving] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const visible = announcements.filter(a=>a.active||canManage).sort((a,b)=>b.created_at?.localeCompare(a.created_at))
  const openAdd = ()=>{setForm({title:'',body:'',target_role:'all'});setModal(true)}
  const save = async ()=>{
    if(!form.title||!form.body)return
    setSaving(true)
    const {data:row,error}=await supabase.from('announcements').insert({...form,active:true,posted_by_id:profile?.id,posted_by_name:profile?.full_name}).select().single()
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,announcements:[row,...p.announcements]}));toast('Announcement posted');setModal(false)}
    setSaving(false)
  }
  const toggle = async id=>{
    const ann=announcements.find(a=>a.id===id)
    await supabase.from('announcements').update({active:!ann.active}).eq('id',id)
    setData(p=>({...p,announcements:p.announcements.map(a=>a.id===id?{...a,active:!a.active}:a)}))
  }
  const del = async id=>{
    if(!confirm('Delete this announcement?'))return
    await supabase.from('announcements').delete().eq('id',id)
    setData(p=>({...p,announcements:p.announcements.filter(a=>a.id!==id)}))
    toast('Announcement deleted')
  }
  const roleColor={all:'var(--gold)',teacher:'var(--sky)',admin:'var(--amber)'}
  return (
    <div>
      <PageHeader title='Announcements' sub={`${announcements.filter(a=>a.active).length} active`}>
        {canManage && <Btn onClick={openAdd}>+ Post Announcement</Btn>}
      </PageHeader>
      {visible.length===0 && <Card style={{textAlign:'center',padding:60}}><div style={{fontSize:32,marginBottom:12}}>◯</div><div style={{fontWeight:600,marginBottom:6}}>No announcements</div><div style={{color:'var(--mist3)',fontSize:13,marginBottom:20}}>Nothing posted yet.</div>{canManage&&<Btn onClick={openAdd}>Post First Announcement</Btn>}</Card>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {visible.map((a,i)=>(
          <div key={a.id} className={`fu fu${Math.min(i+1,6)}`} style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:'20px 24px',opacity:a.active?1:0.5,borderLeft:`3px solid ${a.active?roleColor[a.target_role]||'var(--gold)':'var(--line)'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
                  <h3 style={{fontSize:15,fontWeight:600}}>{a.title}</h3>
                  <Badge color={roleColor[a.target_role]||'var(--mist2)'}>{a.target_role==='all'?'Everyone':a.target_role==='teacher'?'Teachers':'Admins'}</Badge>
                  {!a.active && <Badge color='var(--mist3)'>Inactive</Badge>}
                </div>
                <p style={{fontSize:13,color:'var(--mist2)',lineHeight:1.7}}>{a.body}</p>
                <div style={{fontSize:11,color:'var(--mist3)',marginTop:12}}>Posted by <strong style={{color:'var(--mist2)'}}>{a.posted_by_name}</strong> · {fmtDate(a.created_at)}</div>
              </div>
              {canManage && (
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  <Btn variant='ghost' size='sm' onClick={()=>toggle(a.id)}>{a.active?'Deactivate':'Activate'}</Btn>
                  <Btn variant='danger' size='sm' onClick={()=>del(a.id)}>Delete</Btn>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title='New Announcement' onClose={()=>setModal(false)}>
          <Field label='Title' value={form.title} onChange={f('title')} required/>
          <Field label='Message' value={form.body} onChange={f('body')} rows={4} required placeholder='Full announcement text…'/>
          <Field label='Target Audience' value={form.target_role} onChange={f('target_role')} options={[{value:'all',label:'Everyone'},{value:'teacher',label:'Teachers Only'},{value:'admin',label:'Admins Only'}]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Posting…</>:'Post Announcement'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── USERS MODULE ───────────────────────────────────────────────
function Users({profile,toast}) {
  const [users,setUsers]   = useState([])
  const [loading,setLoading] = useState(true)
  const [modal,setModal]   = useState(false)
  const [edit,setEdit]     = useState(null)
  const [form,setForm]     = useState({})
  const [saving,setSaving] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  useEffect(()=>{
    supabase.from('profiles').select('*').then(({data})=>{ if(data) setUsers(data); setLoading(false) })
  },[])
  const openAdd  = ()=>{setEdit(null);setForm({full_name:'',email:'',password:'',role:'teacher'});setModal(true)}
  const openEdit = u=>{setEdit(u);setForm({full_name:u.full_name,email:u.email,role:u.role,password:''});setModal(true)}
  const save = async ()=>{
    if(!form.full_name||!form.email)return
    setSaving(true)
    if(edit){
      // Update profile fields
      const {error} = await supabase.from('profiles').update({full_name:form.full_name,email:form.email,role:form.role}).eq('id',edit.id)
      if(error){ toast(error.message,'error'); setSaving(false); return }
      setUsers(p=>p.map(u=>u.id===edit.id?{...u,full_name:form.full_name,email:form.email,role:form.role}:u))
      toast('User updated')
      setModal(false)
    } else {
      if(!form.password)return
      const {data:authData,error:authErr} = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } }
      })
      if(authErr){ toast(authErr.message,'error'); setSaving(false); return }
      const uid = authData?.user?.id
      if(!uid){ toast('User account created but could not get ID.','error'); setSaving(false); return }
      const {error:profErr} = await supabase.from('profiles').upsert({id:uid,full_name:form.full_name,email:form.email,role:form.role,locked:false})
      if(profErr){ toast(profErr.message,'error'); setSaving(false); return }
      setUsers(p=>[...p,{id:uid,full_name:form.full_name,email:form.email,role:form.role,locked:false}])
      toast('User created successfully')
      setModal(false)
    }
    setSaving(false)
  }
  const toggleLock = async id=>{
    const u=users.find(x=>x.id===id)
    await supabase.from('profiles').update({locked:!u.locked}).eq('id',id)
    setUsers(p=>p.map(x=>x.id===id?{...x,locked:!x.locked}:x))
  }
  const del = async id=>{
    if(id===profile?.id){alert('You cannot delete your own account.');return}
    if(!confirm('Delete this user?'))return
    await supabase.from('profiles').delete().eq('id',id)
    setUsers(p=>p.filter(x=>x.id!==id))
    toast('User removed')
  }
  if(loading) return <LoadingScreen msg='Loading users…'/>
  return (
    <div>
      <PageHeader title='User Management' sub={`${users.length} system users`}>
        <Btn onClick={openAdd}>+ Add User</Btn>
      </PageHeader>
      <Card>
        <DataTable data={users} columns={[
          {key:'full_name',label:'User',render:(v,r)=>(
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <Avatar name={v} size={36} color={ROLE_META[r.role]?.bg}/>
              <div>
                <div style={{fontWeight:600}}>{v}{r.id===profile?.id&&<span style={{fontSize:10,color:'var(--gold)',marginLeft:8,fontFamily:"'Clash Display',sans-serif"}}>YOU</span>}</div>
                <div style={{fontSize:11,color:'var(--mist3)'}}>{r.email}</div>
              </div>
            </div>
          )},
          {key:'role',label:'Role',render:v=>{const m=ROLE_META[v]||{};return<Badge color={m.color} bg={m.bg}>{m.label||v}</Badge>}},
          {key:'locked',label:'Status',render:v=><Badge color={v?'var(--rose)':'var(--emerald)'} bg={v?'rgba(240,107,122,0.1)':'rgba(45,212,160,0.1)'}>{v?'Locked':'Active'}</Badge>},
          {key:'id',label:'',render:(v,r)=>(
            <div style={{display:'flex',gap:8}}>
              <Btn variant='ghost' size='sm' onClick={()=>openEdit(r)}>Edit</Btn>
              {r.id!==profile?.id && r.role!=='superadmin' && <>
                <Btn variant='ghost' size='sm' onClick={()=>toggleLock(r.id)}>{r.locked?'Unlock':'Lock'}</Btn>
                <Btn variant='danger' size='sm' onClick={()=>del(r.id)}>Remove</Btn>
              </>}
            </div>
          )},
        ]}/>
      </Card>
      {modal && (
        <Modal title={edit?'Edit User':'Add New User'} subtitle={edit?`Editing ${edit.full_name}`:'Create a login account for a staff member.'} onClose={()=>setModal(false)}>
          <Field label='Full Name' value={form.full_name} onChange={f('full_name')} required/>
          <Field label='Email Address' value={form.email} onChange={f('email')} type='email' required/>
          {!edit && <Field label='Password' value={form.password} onChange={f('password')} type='password' required/>}
          <Field label='Role' value={form.role} onChange={f('role')} options={[{value:'admin',label:'Administrator'},{value:'classteacher',label:'Class Teacher'},{value:'teacher',label:'Subject Teacher'}]}/>
          {edit && <p style={{fontSize:12,color:'var(--mist3)',marginTop:-8,marginBottom:8}}>To change the password, the user must use the forgot password option on the login screen.</p>}
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving…</>:edit?'Save Changes':'Create User'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SETTINGS ───────────────────────────────────────────────────
function Settings({settings,setSettings,toast}) {
  const [form,setForm]   = useState(JSON.parse(JSON.stringify(settings||{})))
  const [saving,setSaving] = useState(false)
  const [weightWarning,setWeightWarning] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))

  // Ensure grade_components is always initialised
  const gradeComponents = form.grade_components || DEFAULT_GRADE_COMPONENTS
  const activeComps = gradeComponents.filter(c=>c.enabled)
  const totalWeight = activeComps.reduce((a,c)=>a+c.weight,0)

  const save = async () => {
    if(totalWeight!==100 && activeComps.length>0){
      setWeightWarning(true)
      setTimeout(()=>setWeightWarning(false),4000)
      // still allow saving — just warn
    }
    setSaving(true)
    const payload = {...form, grade_components: gradeComponents}
    const {error} = await supabase.from('settings').update(payload).eq('id',form.id)
    if(error) toast(error.message,'error')
    else { setSettings(payload); toast('Settings saved') }
    setSaving(false)
  }

  const updGrade = (i,k,v)=>{const g=[...form.grading_scale];g[i]={...g[i],[k]:k==='letter'?v:parseFloat(v)||0};setForm(p=>({...p,grading_scale:g}))}

  const updComponent = (i,k,v) => {
    const comps = [...gradeComponents]
    comps[i] = {...comps[i],[k]: k==='label'?v : k==='enabled'?v : parseFloat(v)||0}
    setForm(p=>({...p,grade_components:comps}))
  }

  const handleToggle = async (i) => {
    const comps = [...gradeComponents]
    const wasEnabled = comps[i].enabled
    comps[i] = {...comps[i], enabled: !wasEnabled}
    setForm(p=>({...p,grade_components:comps}))
    // If disabling, zero out all scores for this component in the database immediately
    if(wasEnabled) {
      const key = comps[i].key
      await supabase.from('grades').update({[key]:0}).neq('id','00000000-0000-0000-0000-000000000000')
      toast(`${comps[i].label} disabled — all scores cleared`)
    }
  }

  if(!form.id) return <div style={{padding:48,textAlign:'center',color:'var(--mist3)'}}>Loading settings…</div>
  return (
    <div>
      <PageHeader title='System Settings' sub='School configuration, grading scale and academic structure'>
        <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving…</>:'Save Changes'}</Btn>
      </PageHeader>

      {weightWarning && (
        <div className='fi' style={{background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>⚠</span>
          <span style={{fontSize:13,color:'var(--amber)'}}>Active component weights add up to <strong>{totalWeight}%</strong> — they should total 100% for accurate grade calculations. Settings saved anyway.</span>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
        <div>
          <Card style={{marginBottom:20}}>
            <SectionTitle>School Information</SectionTitle>
            <Field label='School Name'   value={form.school_name}   onChange={f('school_name')} required/>
            <Field label='Address'       value={form.address}       onChange={f('address')}/>
            <Field label='School Motto'  value={form.motto}         onChange={f('motto')}/>
            <Field label='Academic Year' value={form.academic_year} onChange={f('academic_year')} placeholder='e.g. 2024-2025'/>
          </Card>
          <Card style={{marginBottom:20}}>
            <SectionTitle>Currency</SectionTitle>
            <Field label='Currency' value={form.currency_code||'GHS'} onChange={f('currency_code')}
              options={CURRENCIES.map(c=>({value:c.code,label:`${c.symbol}  ${c.name} (${c.code})`}))}/>
            {(()=>{const cur=getCurrency({...form,currency_code:form.currency_code||'GHS'});return(
              <div style={{display:'flex',gap:12,alignItems:'center',marginTop:-8,marginBottom:16}}>
                <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 16px',fontSize:13}}>
                  <span style={{color:'var(--mist3)'}}>Preview: </span>
                  <span className='mono' style={{color:'var(--gold)',fontWeight:700}}>{fmtMoney(1250,cur)}</span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:12,color:'var(--mist3)'}}>Symbol position:</span>
                  {['before','after'].map(pos=>(
                    <button key={pos} onClick={()=>{
                      const comps=CURRENCIES.map(c=>c.code===cur.code?{...c,position:pos}:c)
                      // update the local currency position by saving it in form
                      setForm(p=>({...p,currency_position:pos}))
                    }}
                      style={{padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',
                        background:(form.currency_position||cur.position)===pos?'var(--ink4)':'transparent',
                        color:(form.currency_position||cur.position)===pos?'var(--white)':'var(--mist3)',
                        border:`1px solid ${(form.currency_position||cur.position)===pos?'var(--line2)':'var(--line)'}`}}>
                      {pos==='before'?'Before (₵100)':'After (100 ₵)'}
                    </button>
                  ))}
                </div>
              </div>
            )})()}
            <Field label='Decimal Places' value={form.currency_decimals??2} onChange={v=>setForm(p=>({...p,currency_decimals:parseInt(v)||0}))}
              options={[{value:0,label:'0 — No decimals (e.g. ₵100)'},{value:2,label:'2 — Standard (e.g. ₵100.00)'}]}/>
          </Card>
          <Card>
            <SectionTitle>Academic Periods</SectionTitle>
            <Field label='Period Structure' value={form.period_type} onChange={f('period_type')} options={[{value:'semester',label:'Semester-based'},{value:'term',label:'Term-based'}]}/>
            <Field label='Periods per Year' value={form.period_count} onChange={f('period_count')} options={[{value:2,label:'2 Periods'},{value:3,label:'3 Periods'}]}/>
          </Card>
        </div>
        <div>
          <Card style={{marginBottom:20}}>
            <SectionTitle>Grade Components</SectionTitle>
            <p style={{fontSize:12,color:'var(--mist2)',marginBottom:14,lineHeight:1.6}}>
              Toggle which components teachers enter grades for. Disabling a component <strong style={{color:'var(--rose)'}}>clears all existing scores</strong> for it immediately. Active weights must total <strong style={{color:'var(--white)'}}>100%</strong>.
            </p>
            <div style={{background:'var(--ink3)',borderRadius:'var(--r-sm)',padding:'10px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'var(--mist2)'}}>Active weight total</span>
              <span className='d' style={{fontSize:18,fontWeight:700,color:totalWeight===100?'var(--emerald)':totalWeight===0?'var(--mist3)':'var(--rose)'}}>{totalWeight}%</span>
            </div>
            {gradeComponents.map((c,i)=>(
              <div key={c.key} style={{marginBottom:10,padding:'12px 14px',background:c.enabled?'var(--ink3)':'var(--ink)',border:`1px solid ${c.enabled?'var(--line2)':'var(--line)'}`,borderRadius:'var(--r-sm)',transition:'all 0.15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:c.enabled?10:0}}>
                  {/* Toggle switch */}
                  <button onClick={()=>handleToggle(i)}
                    style={{width:38,height:22,borderRadius:11,background:c.enabled?'var(--emerald)':'var(--line2)',border:'none',cursor:'pointer',transition:'background 0.2s',position:'relative',flexShrink:0}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'white',position:'absolute',top:3,left:c.enabled?19:3,transition:'left 0.2s'}}/>
                  </button>
                  {/* Renameable label */}
                  <input
                    value={c.label}
                    onChange={e=>updComponent(i,'label',e.target.value)}
                    style={{flex:1,background:'transparent',border:'none',borderBottom:`1px solid ${c.enabled?'var(--line2)':'transparent'}`,color:c.enabled?'var(--white)':'var(--mist3)',fontSize:13,fontWeight:600,padding:'2px 4px',fontFamily:"'Cabinet Grotesk',sans-serif",cursor:'text'}}
                  />
                  {!c.enabled && <span style={{fontSize:11,color:'var(--mist3)'}}>Disabled</span>}
                </div>
                {c.enabled && (
                  <div style={{display:'flex',gap:12,flexWrap:'wrap',paddingLeft:48}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:11,color:'var(--mist3)',whiteSpace:'nowrap'}}>Max score</span>
                      <input type='number' value={c.max_score} onChange={e=>updComponent(i,'max_score',e.target.value)}
                        style={{width:58,background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'4px 8px',color:'var(--white)',fontSize:12,textAlign:'center'}}/>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:11,color:'var(--mist3)',whiteSpace:'nowrap'}}>Weight</span>
                      <input type='number' value={c.weight} onChange={e=>updComponent(i,'weight',e.target.value)}
                        style={{width:58,background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'4px 8px',color:'var(--white)',fontSize:12,textAlign:'center'}}/>
                      <span style={{fontSize:11,color:'var(--mist3)'}}>%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
          <Card>
            <SectionTitle>Grading Scale</SectionTitle>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--line)'}}>
                {['Min','Max','Letter','GPA'].map(h=><th key={h} style={{padding:8,textAlign:'left',fontSize:10,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:"'Clash Display',sans-serif"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(form.grading_scale||[]).map((row,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid var(--line)'}}>
                    {['min','max','letter','gpa'].map(k=>(
                      <td key={k} style={{padding:'5px 4px'}}>
                        <input type={k==='letter'?'text':'number'} value={row[k]} onChange={e=>updGrade(i,k,e.target.value)}
                          style={{width:k==='letter'?56:66,background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'6px 8px',color:'var(--white)',fontSize:12,textAlign:'center'}}/>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── CLASSES ────────────────────────────────────────────────────
function Classes({profile,data,setData,toast}) {
  const {classes=[],subjects=[],students=[]} = data
  const [allUsers,setAllUsers] = useState([])
  const [selected,setSelected] = useState(null)
  const [classModal,setClassModal] = useState(false)
  const [subjectModal,setSubjectModal] = useState(false)
  const [editC,setEditC] = useState(null)
  const [editS,setEditS] = useState(null)
  const [cf,setCf] = useState({})
  const [sf,setSf] = useState({})
  const [saving,setSaving] = useState(false)
  const fc = k=>v=>setCf(p=>({...p,[k]:v}))
  const fs = k=>v=>setSf(p=>({...p,[k]:v}))
  useEffect(()=>{ supabase.from('profiles').select('*').then(({data})=>{ if(data) setAllUsers(data) }) },[])
  const teachers = allUsers.filter(u=>['classteacher','teacher'].includes(u.role))
  const saveClass = async ()=>{
    if(!cf.name)return; setSaving(true)
    const newTeacherId = cf.class_teacher_id||null
    if(editC){
      const {error}=await supabase.from('classes').update({...cf,class_teacher_id:newTeacherId}).eq('id',editC.id)
      if(error){toast(error.message,'error');setSaving(false);return}
      // If teacher changed, clear old teacher's class_id and set new one
      const oldTeacherId = editC.class_teacher_id
      if(oldTeacherId && oldTeacherId!==newTeacherId)
        await supabase.from('profiles').update({class_id:null}).eq('id',oldTeacherId)
      if(newTeacherId)
        await supabase.from('profiles').update({class_id:editC.id}).eq('id',newTeacherId)
      setData(p=>({...p,classes:p.classes.map(c=>c.id===editC.id?{...c,...cf,class_teacher_id:newTeacherId}:c)}))
      toast('Class updated');setClassModal(false)
    } else {
      const {data:row,error}=await supabase.from('classes').insert({...cf,class_teacher_id:newTeacherId}).select().single()
      if(error){toast(error.message,'error');setSaving(false);return}
      // Set the new teacher's class_id
      if(newTeacherId && row)
        await supabase.from('profiles').update({class_id:row.id}).eq('id',newTeacherId)
      setData(p=>({...p,classes:[...p.classes,row]}))
      toast('Class created');setClassModal(false)
    }
    setSaving(false)
  }
  const saveSubject = async ()=>{
    if(!sf.name||!sf.class_id)return; setSaving(true)
    if(editS){
      const {error}=await supabase.from('subjects').update({...sf,teacher_id:sf.teacher_id||null}).eq('id',editS.id)
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,subjects:p.subjects.map(s=>s.id===editS.id?{...s,...sf,teacher_id:sf.teacher_id||null}:s)}));toast('Subject updated');setSubjectModal(false)}
    } else {
      const {data:row,error}=await supabase.from('subjects').insert({...sf,teacher_id:sf.teacher_id||null}).select().single()
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,subjects:[...p.subjects,row]}));toast('Subject created');setSubjectModal(false)}
    }
    setSaving(false)
  }
  const classSubjects = selected ? subjects.filter(s=>s.class_id===selected.id) : []
  const classStudents = selected ? students.filter(s=>s.class_id===selected.id) : []
  return (
    <div>
      <PageHeader title='Classes & Subjects' sub={`${classes.length} classes · ${subjects.length} subjects`}>
        <Btn variant='ghost' onClick={()=>{setSubjectModal(true);setEditS(null);setSf({name:'',code:'',class_id:selected?.id||'',teacher_id:''})}}>+ Subject</Btn>
        <Btn onClick={()=>{setClassModal(true);setEditC(null);setCf({name:'',level:'',section:'',class_teacher_id:''})}}>+ New Class</Btn>
      </PageHeader>
      <div style={{display:'grid',gridTemplateColumns:selected?'260px 1fr':'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
        {selected ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {classes.map(c=>{
              const ct=allUsers.find(u=>u.id===c.class_teacher_id)
              const sc=students.filter(s=>s.class_id===c.id).length
              const isS=selected?.id===c.id
              return(
                <div key={c.id} onClick={()=>setSelected(isS?null:c)}
                  style={{padding:'14px 16px',borderRadius:'var(--r)',cursor:'pointer',background:isS?'var(--ink3)':'var(--ink2)',border:`1px solid ${isS?'var(--gold)':'var(--line)'}`,boxShadow:isS?'var(--sh-gold)':undefined,transition:'all 0.15s'}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{c.name}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,color:'var(--mist3)'}}>{ct?ct.full_name:'No class teacher'}</span>
                    <Badge color='var(--mist3)'>{sc}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          classes.map(c=>{
            const ct=allUsers.find(u=>u.id===c.class_teacher_id)
            const sc=students.filter(s=>s.class_id===c.id).length
            const sj=subjects.filter(s=>s.class_id===c.id).length
            return(
              <div key={c.id} className='fu' onClick={()=>setSelected(c)}
                style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,cursor:'pointer',transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--line2)';e.currentTarget.style.background='var(--ink3)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--line)';e.currentTarget.style.background='var(--ink2)'}}>
                <div className='d' style={{fontSize:17,fontWeight:700,marginBottom:6}}>{c.name}</div>
                <div style={{fontSize:12,color:'var(--mist2)',marginBottom:14}}>{ct?`Class Teacher: ${ct.full_name}`:'No class teacher assigned'}</div>
                <div style={{display:'flex',gap:16}}>
                  <div style={{textAlign:'center'}}><div className='d' style={{fontSize:22,fontWeight:700,color:'var(--gold)'}}>{sc}</div><div style={{fontSize:10,color:'var(--mist3)'}}>Students</div></div>
                  <div style={{textAlign:'center'}}><div className='d' style={{fontSize:22,fontWeight:700,color:'var(--sky)'}}>{sj}</div><div style={{fontSize:10,color:'var(--mist3)'}}>Subjects</div></div>
                </div>
              </div>
            )
          })
        )}
        {selected && (
          <div>
            <Card style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                <div>
                  <h2 className='d' style={{fontSize:22,fontWeight:700}}>{selected.name}</h2>
                  <p style={{color:'var(--mist2)',fontSize:13,marginTop:4}}>{classStudents.length} students · {classSubjects.length} subjects</p>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Btn variant='ghost' size='sm' onClick={()=>setSelected(null)}>← Back</Btn>
                  <Btn variant='secondary' size='sm' onClick={()=>{setEditC(selected);setCf({...selected,class_teacher_id:selected.class_teacher_id||''});setClassModal(true)}}>Edit</Btn>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <SectionTitle>Subjects</SectionTitle>
                <Btn size='sm' onClick={()=>{setEditS(null);setSf({name:'',code:'',class_id:selected.id,teacher_id:''});setSubjectModal(true)}}>+ Add</Btn>
              </div>
              <DataTable data={classSubjects} columns={[
                {key:'name',label:'Subject',render:(v,r)=><div><div style={{fontWeight:600}}>{v}</div><span className='mono' style={{fontSize:11,color:'var(--mist3)'}}>{r.code}</span></div>},
                {key:'teacher_id',label:'Teacher',render:v=>v?allUsers.find(u=>u.id===v)?.full_name||'—':<span style={{color:'var(--mist3)'}}>Unassigned</span>},
                {key:'id',label:'',render:(v,r)=><Btn variant='ghost' size='sm' onClick={()=>{setEditS(r);setSf({...r,teacher_id:r.teacher_id||''});setSubjectModal(true)}}>Edit</Btn>},
              ]}/>
            </Card>
          </div>
        )}
      </div>
      {classModal && (
        <Modal title={editC?'Edit Class':'New Class'} onClose={()=>setClassModal(false)}>
          <Field label='Class Name' value={cf.name} onChange={fc('name')} placeholder='e.g. Grade 10 — Alpha' required/>
          <Field label='Level'   value={cf.level}   onChange={fc('level')}   placeholder='e.g. Grade 10'/>
          <Field label='Section' value={cf.section} onChange={fc('section')} placeholder='e.g. Alpha'/>
          <Field label='Class Teacher' value={cf.class_teacher_id} onChange={fc('class_teacher_id')} options={[{value:'',label:'None — Unassigned'},...teachers.map(t=>({value:t.id,label:t.full_name}))]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setClassModal(false)}>Cancel</Btn>
            <Btn onClick={saveClass} disabled={saving}>{saving?<><Spinner/> Saving…</>:'Save Class'}</Btn>
          </div>
        </Modal>
      )}
      {subjectModal && (
        <Modal title={editS?'Edit Subject':'New Subject'} onClose={()=>setSubjectModal(false)}>
          <Field label='Subject Name' value={sf.name} onChange={fs('name')} required/>
          <Field label='Subject Code' value={sf.code} onChange={fs('code')} placeholder='e.g. MTH-101'/>
          <Field label='Assign to Class' value={sf.class_id} onChange={fs('class_id')} required options={classes.map(c=>({value:c.id,label:c.name}))}/>
          <Field label='Assigned Teacher' value={sf.teacher_id} onChange={fs('teacher_id')} options={[{value:'',label:'Unassigned'},...teachers.map(t=>({value:t.id,label:t.full_name}))]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setSubjectModal(false)}>Cancel</Btn>
            <Btn onClick={saveSubject} disabled={saving}>{saving?<><Spinner/> Saving…</>:'Save Subject'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── ROOT APP ───────────────────────────────────────────────────
export default function App() {
  const [session,setSession]   = useState(null)
  const [profile,setProfile]   = useState(null)
  const [settings,setSettings] = useState(null)
  const [data,setData]         = useState({students:[],classes:[],subjects:[],grades:[],attendance:[],fees:[],behaviour:[],announcements:[]})
  const [page,setPage]         = useState('dashboard')
  const [collapsed,setCollapsed] = useState(false)
  const [loading,setLoading]   = useState(true)
  const [toast,setToast]       = useState(null)

  const showToast = useCallback((msg,type='success')=>{
    setToast({msg,type})
    setTimeout(()=>setToast(null),3000)
  },[])

  // Auth listener
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setSession(session) })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{ setSession(session) })
    return ()=>subscription.unsubscribe()
  },[])

  // Load profile + all data when session changes
  useEffect(()=>{
    if(!session){setProfile(null);setLoading(false);return}
    setLoading(true)
    const loadAll = async ()=>{
      const [{data:prof},{data:settingsRow},{data:students},{data:classes},{data:subjects},{data:grades},{data:attendance},{data:fees},{data:behaviour},{data:announcements}] = await Promise.all([
        supabase.from('profiles').select('*').eq('id',session.user.id).single(),
        supabase.from('settings').select('*').single(),
        supabase.from('students').select('*').order('student_id'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('grades').select('*'),
        supabase.from('attendance').select('*').order('date',{ascending:false}),
        supabase.from('fees').select('*'),
        supabase.from('behaviour').select('*').order('created_at',{ascending:false}),
        supabase.from('announcements').select('*').order('created_at',{ascending:false}),
      ])
      setProfile(prof)
      setSettings(settingsRow)
      setData({students:students||[],classes:classes||[],subjects:subjects||[],grades:grades||[],attendance:attendance||[],fees:fees||[],behaviour:behaviour||[],announcements:announcements||[]})
      // If profile row is missing (e.g. new user whose profile wasn't inserted yet), create it
      if(!prof && session?.user) {
        const {data:newProf} = await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          role: 'teacher',
          locked: false
        }).select().single()
        setProfile(newProf)
      }
      setLoading(false)
    }
    loadAll()
  },[session])

  const logout = async ()=>{ await supabase.auth.signOut(); setPage('dashboard') }

  if(loading) return <><style>{G}</style><LoadingScreen msg={session?'Loading your workspace…':'Initialising…'}/></>
  if(!session||!profile) return <><style>{G}</style><Login onLogin={p=>setProfile(p)}/></>

  const props = {profile,data,setData,toast:showToast,settings}

  const renderPage = ()=>{
    switch(page){
      case 'dashboard':    return <Dashboard    {...props} onNav={setPage}/>
      case 'students':     return <Students     {...props}/>
      case 'classes':      return <Classes      {...props}/>
      case 'grades':       return <Grades       {...props}/>
      case 'attendance':   return <Attendance   {...props}/>
      case 'fees':         return <Fees         {...props}/>
      case 'behaviour':    return <Behaviour    {...props}/>
      case 'reports':      return <Reports      {...props}/>
      case 'announcements':return <Announcements {...props}/>
      case 'users':        return <Users        {...props}/>
      case 'settings':     return <Settings     settings={settings} setSettings={setSettings} toast={showToast}/>
      default:             return <Dashboard    {...props} onNav={setPage}/>
    }
  }

  return (
    <>
      <style>{G}</style>
      <div className='grain' style={{display:'flex',height:'100vh',overflow:'hidden'}}>
        <Sidebar profile={profile} active={page} onNav={setPage} collapsed={collapsed} onToggle={()=>setCollapsed(c=>!c)} onLogout={logout}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--ink)'}}>
          {/* Topbar */}
          <div style={{height:56,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',borderBottom:'1px solid var(--line)',background:'var(--ink2)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span className='d' style={{fontSize:12,color:'var(--mist3)',fontWeight:500,letterSpacing:'0.06em'}}>{settings?.school_name||'SRMS'}</span>
              <span style={{color:'var(--line2)'}}>·</span>
              <span style={{fontSize:12,color:'var(--mist3)'}}>{settings?.academic_year||''}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Avatar name={profile?.full_name} size={30} color={ROLE_META[profile?.role]?.bg}/>
                <div>
                  <div style={{fontSize:12,fontWeight:600,lineHeight:1.2}}>{profile?.full_name}</div>
                  <div style={{fontSize:10,color:'var(--mist3)'}}>{ROLE_META[profile?.role]?.label}</div>
                </div>
              </div>
              <Btn variant='ghost' size='sm' onClick={logout}>Sign Out</Btn>
            </div>
          </div>
          {/* Content */}
          <div style={{flex:1,overflowY:'auto',padding:'32px 36px'}}>
            {renderPage()}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </>
  )
}