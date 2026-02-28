import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

/* ═══════════════════════════════════════════════════════════════
   SRMS Premium -- Fully wired to Supabase
   Auth . Real-time data . Role-based access
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
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes drawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.mob-hide{display:block}.mob-show{display:none!important}
@media(max-width:768px){
  .mob-hide{display:none!important}
  .mob-show{display:flex!important}
  .mob-pad{padding:16px!important}
}
`


// ── MOBILE HOOK ────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

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
const getGradeLetter = (t, scale) => { for(const s of scale) if(t>=s.min&&t<=s.max) return s.letter||'--'; return '--' }
const getGradeRemark = (t, scale) => { for(const s of scale) if(t>=s.min&&t<=s.max) return s.remark||''; return '' }

// ── AUDIT LOGGING ──────────────────────────────────────────────
const auditLog = async (profile, module, action, description, meta={}, before_data=null, after_data=null) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id:     profile?.id,
      user_name:   profile?.full_name || profile?.email || 'Unknown',
      module,
      action,
      description,
      meta,
      before_data,
      after_data,
    })
  } catch(e) { console.warn('Audit log failed:', e) }
}
const fmtDate   = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '--'
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

// ── GHANA PUBLIC HOLIDAYS (month/day, recurring annually) ─────
const GHANA_PUBLIC_HOLIDAYS = [
  {id:'gh01', name:"New Year's Day",          month:1,  day:1},
  {id:'gh02', name:'Constitution Day',         month:1,  day:7},
  {id:'gh03', name:'Independence Day',         month:3,  day:6},
  {id:'gh04', name:"Workers' Day",            month:5,  day:1},
  {id:'gh05', name:'Africa Unity Day',         month:5,  day:25},
  {id:'gh06', name:'Republic Day',             month:7,  day:1},
  {id:'gh07', name:"Founders' Day",           month:8,  day:4},
  {id:'gh08', name:'Kwame Nkrumah Day',        month:9,  day:21},
  {id:'gh09', name:"Farmers' Day",            month:12, day:6},
  {id:'gh10', name:'Christmas Day',            month:12, day:25},
  {id:'gh11', name:'Boxing Day',               month:12, day:26},
]
function getHolidayOnDate(dateStr, customHolidays=[]) {
  if(!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const m = d.getMonth() + 1
  const day = d.getDate()
  const custom = customHolidays.find(h => h.date === dateStr)
  if(custom) return custom.name
  const gh = GHANA_PUBLIC_HOLIDAYS.find(h => h.month === m && h.day === day)
  if(gh) return gh.name
  return null
}
function getVacationOnDate(dateStr, vacations=[], academicYear) {
  if(!dateStr) return null
  const vacs = vacations.filter(v => v.academic_year === academicYear)
  const v = vacs.find(v => dateStr >= v.start_date && dateStr <= v.end_date)
  return v ? v.name : null
}

// ── YEAR HELPERS ───────────────────────────────────────────────
function generateYears(centerYear) {
  // centerYear like "2026/2027" or "2026-2027"
  const norm = (y) => y ? y.replace('-','/') : ''
  const base = centerYear ? parseInt(centerYear.replace(/[^0-9]/,'').slice(0,4)) : new Date().getFullYear()
  const years = []
  for(let y = base-3; y <= base+3; y++) years.push(`${y}/${y+1}`)
  return years
}
function currentYearFromSettings(settings) {
  return settings?.academic_year ? settings.academic_year.replace('-','/') : `${new Date().getFullYear()}/${new Date().getFullYear()+1}`
}

const NAV_ITEMS = {
  superadmin:  ['dashboard','students','classes','grades','attendance','fees','behaviour','reports','announcements','users','settings','auditlog'],
  admin:       ['dashboard','students','classes','grades','attendance','fees','behaviour','reports','announcements'],
  classteacher:['dashboard','students','grades','attendance','behaviour','reports','announcements'],
  teacher:     ['dashboard','students','grades','reports','announcements'],
}
const NAV_META = {
  dashboard:    {icon:'▦', label:'Dashboard'},
  students:     {icon:'◈', label:'Students'},
  classes:      {icon:'[=]', label:'Classes'},
  grades:       {icon:'◎', label:'Grades'},
  attendance:   {icon:'◉', label:'Attendance'},
  fees:         {icon:'◈', label:'Fees'},
  behaviour:    {icon:'◐', label:'Behaviour'},
  reports:      {icon:'⊞', label:'Reports'},
  announcements:{icon:'◯', label:'Announcements'},
  users:        {icon:'◈', label:'Users'},
  settings:     {icon:'◧', label:'Settings'},
  auditlog:     {icon:'◫', label:'Audit Log'},
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
  const isMobile = useIsMobile()
  const base = {width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding: isMobile ? '12px 14px' : '9px 14px',color:'var(--white)',fontSize: isMobile ? 16 : 13,transition:'border-color 0.15s',lineHeight:1.5}
  const [foc,setFoc] = useState(false)
  const fs = foc ? {borderColor:'var(--gold)',boxShadow:'0 0 0 3px rgba(232,184,75,0.08)'} : {}
  return (
    <div style={{marginBottom:16,...style}}>
      {label && <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>{label}{required&&<span style={{color:'var(--gold)',marginLeft:3}}>*</span>}</label>}
      {options ? (
        <select value={value||''} onChange={e=>onChange(e.target.value)} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={{...base,...fs,cursor:'pointer'}}>
          <option value=''>-- Select --</option>
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
  const isMobile = useIsMobile()
  if(isMobile) return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}}
      style={{position:'fixed',inset:0,background:'rgba(5,5,10,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:1000}}>
      <div style={{width:'100%',background:'var(--ink2)',borderTop:'1px solid var(--line)',borderRadius:'20px 20px 0 0',maxHeight:'92vh',overflow:'auto',boxShadow:'0 -8px 48px rgba(0,0,0,0.6)',animation:'slideUp 0.3s cubic-bezier(.16,1,.3,1) both'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'12px 0 4px'}}>
          <div style={{width:40,height:4,borderRadius:2,background:'var(--line2)'}}/>
        </div>
        <div style={{padding:'12px 20px 16px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
          <div>
            <h3 className='d' style={{fontSize:16,fontWeight:600}}>{title}</h3>
            {subtitle && <p style={{fontSize:12,color:'var(--mist2)',marginTop:3}}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{background:'var(--ink4)',border:'1px solid var(--line)',color:'var(--mist2)',width:30,height:30,borderRadius:'50%',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>×</button>
        </div>
        <div style={{padding:'20px'}}>{children}</div>
      </div>
    </div>
  )
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

function Avatar({name,size=32,color,photo}) {
  const initials = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('')
  if(photo) return (
    <img src={photo} alt={name} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--line)',flexShrink:0}}/>
  )
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:color||'var(--ink5)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.35,fontWeight:700,color:'var(--mist)',flexShrink:0}}>
      {initials}
    </div>
  )
}

function PageHeader({title,sub,children}) {
  const isMobile = useIsMobile()
  return (
    <div className='fu' style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom: isMobile?20:28,flexWrap:'wrap',gap:12}}>
      <div>
        <h1 className='d' style={{fontSize: isMobile?20:26,fontWeight:700,letterSpacing:'-0.02em'}}>{title}</h1>
        {sub && <p style={{color:'var(--mist2)',fontSize: isMobile?12:13,marginTop:4}}>{sub}</p>}
      </div>
      {children && <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>{children}</div>}
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
                  {c.render ? c.render(row[c.key],row) : (row[c.key]??'--')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Toast({msg,type='success',isMobile}) {
  const color = type==='error' ? 'var(--rose)' : 'var(--emerald)'
  const pos = isMobile
    ? {bottom:20,left:16,right:16,transform:'none'}
    : {bottom:28,right:28}
  return (
    <div className='fi' style={{position:'fixed',zIndex:2000,background:'var(--ink2)',border:`1px solid ${color}40`,borderRadius:'var(--r)',padding:'12px 20px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',...pos}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
      <span style={{fontSize:13,fontWeight:500}}>{msg}</span>
    </div>
  )
}

// ── LOADING SCREEN ─────────────────────────────────────────────
function LoadingScreen({msg='Loading...'}) {
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

  const [schoolName,setSchoolName] = useState('Kandit Standard School')
  const [schoolLogo,setSchoolLogo] = useState(null)
  const [acadYear,setAcadYear]     = useState('2026–2027')

  useEffect(()=>{
    supabase.from('settings').select('school_name,school_logo,academic_year').limit(1).single()
      .then(({data})=>{
        if(data?.school_name) setSchoolName(data.school_name)
        if(data?.school_logo) setSchoolLogo(data.school_logo)
        if(data?.academic_year) setAcadYear(data.academic_year)
      })
  },[])

  const attempt = async () => {
    if(!email||!password){setError('Please enter your email and password.');return}
    setLoading(true);setError('')
    const {data,error:err} = await supabase.auth.signInWithPassword({email,password})
    if(err){setError(err.message);setLoading(false);return}
    // fetch profile
    const {data:profile} = await supabase.from('profiles').select('*').eq('id',data.user.id).single()
    if(profile?.locked){
      await supabase.auth.signOut()
      setError('Your account has been locked. Please contact your administrator.')
      setLoading(false)
      return
    }
    onLogin({...data.user,...profile})
    setLoading(false)
  }


  const isMobile = useIsMobile()
  const features = [
    {icon:'🎓', title:'Grades & Assessments', desc:'Flexible components, weighted scoring, term reports'},
    {icon:'📋', title:'Attendance Tracking', desc:'Daily batch entry with real-time class summaries'},
    {icon:'💳', title:'Fees Management', desc:'Multi-currency invoicing and payment tracking'},
    {icon:'📊', title:'Reports & Analytics', desc:'PDF & Excel exports, per-student report cards'},
  ]

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'var(--ink)',position:'relative',overflow:'hidden'}}>
      {/* Left -- login form */}
      <div
        style={{flex: isMobile ? '1' : '0 0 520px',display:'flex',flexDirection:'column',justifyContent:'center',padding: isMobile ? '40px 28px' : '60px',position:'relative',zIndex:1,minHeight:'100vh'}}
        onKeyDown={e=>{if(e.key==='Enter')attempt()}}
      >
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
          <Field label='Password' value={password} onChange={setPassword} type='password' placeholder='********' required/>
          {error && <div className='fi' style={{background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:'var(--r-sm)',padding:'11px 14px',fontSize:13,color:'var(--rose)',marginBottom:16}}>{error}</div>}
          <Btn onClick={attempt} disabled={loading} style={{width:'100%',justifyContent:'center',padding:13,fontSize:14,boxShadow:loading?'none':'0 4px 20px rgba(232,184,75,0.25)'}}>
            {loading ? <><Spinner/> Signing in...</> : 'Sign In >'}
          </Btn>
          <p style={{fontSize:12,color:'var(--mist3)',marginTop:20,textAlign:'center'}}>Contact your administrator if you cannot access your account.</p>
        </div>
      </div>

      {/* Right -- branding panel -- hidden on mobile */}
      {!isMobile && <div style={{flex:1,background:'var(--ink2)',borderLeft:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 80px',position:'relative',overflow:'hidden',minHeight:'100vh'}}>
        {/* Grid background */}
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)',backgroundSize:'60px 60px',opacity:0.35}}/>


        <div className='fu fu2' style={{position:'relative',textAlign:'center',maxWidth:400,width:'100%'}}>

          {/* School logo -- only shown if uploaded */}
          {schoolLogo && (
            <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
              <div style={{width:80,height:80,borderRadius:'50%',border:'2px solid rgba(232,184,75,0.4)',boxShadow:'0 0 32px rgba(232,184,75,0.2)',overflow:'hidden',background:'var(--ink)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <img src={schoolLogo} alt='School logo' style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
            </div>
          )}

          {/* Graduation cap icon */}
          <div style={{display:'flex',justifyContent:'center',marginBottom:schoolLogo?20:32}}>
            <div style={{width:schoolLogo?72:96,height:schoolLogo?72:96,borderRadius:'50%',background:'rgba(232,184,75,0.06)',border:'1.5px solid rgba(232,184,75,0.55)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 0 5px rgba(232,184,75,0.05), 0 0 24px rgba(232,184,75,0.35)',transition:'all 0.3s'}}>
              <svg width={schoolLogo?38:52} height={schoolLogo?38:52} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 10L4 24L32 38L60 24L32 10Z" fill="rgba(232,184,75,0.9)" stroke="rgba(232,184,75,1)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M16 31V46C16 46 22 52 32 52C42 52 48 46 48 46V31" stroke="rgba(232,184,75,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M60 24V38" stroke="rgba(232,184,75,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="60" cy="40" r="3" fill="rgba(232,184,75,0.7)"/>
              </svg>
            </div>
          </div>

          {/* School name -- live from settings */}
          <div className='d' style={{fontSize:11,fontWeight:600,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'0.18em',marginBottom:10}}>{schoolName}</div>
          <h2 className='d' style={{fontSize:28,fontWeight:700,letterSpacing:'-0.02em',lineHeight:1.15,marginBottom:10}}>Student Record<br/>Management System</h2>
          <p style={{fontSize:13,color:'var(--mist3)',marginBottom:44,lineHeight:1.6}}>Empowering education through<br/>smart, secure record keeping.</p>

          {/* Divider */}
          <div style={{width:'100%',height:1,background:'linear-gradient(90deg,transparent,var(--line),transparent)',marginBottom:36}}/>

          {/* Feature list */}
          <div style={{display:'flex',flexDirection:'column',gap:0,textAlign:'left'}}>
            {features.map(({icon,title,desc},i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:16,padding:'14px 0',borderBottom:i<features.length-1?'1px solid var(--line)':'none'}}>
                <div style={{width:38,height:38,borderRadius:10,background:'rgba(232,184,75,0.08)',border:'1px solid rgba(232,184,75,0.18)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0,marginTop:1}}>
                  {icon}
                </div>
                <div>
                  <div className='d' style={{fontSize:13,fontWeight:600,color:'var(--white)',marginBottom:3}}>{title}</div>
                  <div style={{fontSize:12,color:'var(--mist2)',lineHeight:1.5}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Version + academic year -- live from settings */}
          <div style={{marginTop:36,fontSize:11,color:'var(--mist3)',letterSpacing:'0.05em'}}>v1.0.0 . Academic Year {acadYear}</div>
          <div style={{marginTop:10,fontSize:11,color:'var(--mist3)',letterSpacing:'0.06em'}}>Built by <span style={{color:'var(--gold)',fontWeight:600,letterSpacing:'0.12em'}}>ZELVA STUDIOS</span></div>
        </div>
      </div>}
    </div>
  )
}

// ── SIDEBAR ────────────────────────────────────────────────────
function Sidebar({profile,active,onNav,collapsed,onToggle,onLogout,isMobile,drawerOpen,onDrawerClose}) {
  const items = NAV_ITEMS[profile?.role] || []
  const rm    = ROLE_META[profile?.role] || {}

  const navContent = (
    <>
      <div style={{padding:'18px 16px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',minHeight:64}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(232,184,75,0.3)'}}>
            <span className='d' style={{fontSize:15,fontWeight:700,color:'var(--ink)'}}>S</span>
          </div>
          <span className='d' style={{fontWeight:700,fontSize:15}}>SRMS</span>
        </div>
        {isMobile ? (
          <button onClick={onDrawerClose} style={{background:'var(--ink4)',border:'1px solid var(--line)',color:'var(--mist2)',width:30,height:30,borderRadius:'50%',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
        ) : (
          <button onClick={onToggle} style={{background:'none',color:'var(--mist3)',fontSize:18,padding:'2px 6px',borderRadius:4,transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.color='var(--mist)';e.currentTarget.style.background='var(--ink4)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='var(--mist3)';e.currentTarget.style.background='none'}}>‹</button>
        )}
      </div>
      <nav style={{flex:1,padding:'10px 8px',overflowY:'auto'}}>
        <div style={{fontSize:9,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.12em',padding:'8px 8px 6px',fontFamily:"'Clash Display',sans-serif"}}>Navigation</div>
        {items.map(key=>{
          const m=NAV_META[key]; const isAct=active===key
          return (
            <button key={key} onClick={()=>{onNav(key);if(isMobile)onDrawerClose()}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 10px',borderRadius:'var(--r-sm)',marginBottom:2,background:isAct?'rgba(232,184,75,0.1)':'transparent',color:isAct?'var(--gold)':'var(--mist2)',fontSize:14,fontWeight:isAct?600:400,transition:'all 0.15s',justifyContent:'flex-start',borderLeft:isAct?'2px solid var(--gold)':'2px solid transparent'}}
              onMouseEnter={e=>{if(!isAct){e.currentTarget.style.background='var(--ink3)';e.currentTarget.style.color='var(--white)'}}}
              onMouseLeave={e=>{if(!isAct){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--mist2)'}}}>
              <span style={{fontSize:16,flexShrink:0,opacity:isAct?1:0.7}}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          )
        })}
      </nav>
      <div style={{borderTop:'1px solid var(--line)',padding:'14px 12px'}}>
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
      </div>
    </>
  )

  if(isMobile) return (
    <>
      {drawerOpen && (
        <div onClick={onDrawerClose} style={{position:'fixed',inset:0,background:'rgba(5,5,10,0.7)',zIndex:200,backdropFilter:'blur(4px)'}}/>
      )}
      <div style={{position:'fixed',top:0,left:0,width:280,height:'100vh',background:'var(--ink2)',borderRight:'1px solid var(--line)',display:'flex',flexDirection:'column',zIndex:201,transform:drawerOpen?'translateX(0)':'translateX(-100%)',transition:'transform 0.3s cubic-bezier(.16,1,.3,1)',boxShadow:drawerOpen?'8px 0 48px rgba(0,0,0,0.6)':'none'}}>
        {navContent}
      </div>
    </>
  )

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
function Dashboard({profile,data,settings,onNav,activeYear,isViewingPast}) {
  const isMobile = useIsMobile()
  const {students=[],classes=[],fees=[],attendance=[],grades=[],announcements=[],subjects=[],enrolments=[]} = data
  // When viewing past year, use enrolment records to know which students were enrolled
  const enrolledStudentIds = enrolments.length>0 ? new Set(enrolments.map(e=>e.student_id)) : null
  const yearStudents = enrolledStudentIds
    ? students.filter(s=>enrolledStudentIds.has(s.id))
    : students.filter(s=>!s.archived)
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

  // Attendance rate calculations
  const schoolAttTotal   = attendance.length
  const schoolAttPresent = attendance.filter(a=>a.status==='Present').length
  const schoolAttRate    = schoolAttTotal ? Math.round(schoolAttPresent/schoolAttTotal*100) : 0
  const myClassAtt       = myClass ? attendance.filter(a=>a.class_id===myClass.id) : []
  const myClassPresent   = myClassAtt.filter(a=>a.status==='Present').length
  const myClassAttRate   = myClassAtt.length ? Math.round(myClassPresent/myClassAtt.length*100) : 0

  const unassignedClasses = profile?.role==='superadmin'
    ? classes.filter(c=>!c.class_teacher_id)
    : []

  return (
    <div>
      {profile?.role==='superadmin' && unassignedClasses.length>0 && (
        <div style={{marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
          {unassignedClasses.map(cls=>(
            <div key={cls.id} style={{background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:'var(--r)',padding:'14px 20px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(240,107,122,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>(!)</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:'var(--rose)'}}>No Teacher Assigned</div>
                <div style={{fontSize:12,color:'var(--mist2)',marginTop:2}}><strong>{cls.name}</strong> has no class teacher. Assign one to restore full functionality.</div>
              </div>
              <Btn size='sm' onClick={()=>onNav('classes')}>Assign Teacher &rarr;</Btn>
            </div>
          ))}
        </div>
      )}
      {profile?.role==='classteacher' && !todayMarked && (
        <div className='fu' style={{background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.25)',borderRadius:'var(--r)',padding:'14px 20px',marginBottom:24,display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(251,159,58,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>(!)</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--amber)'}}>Attendance Not Marked Today</div>
            <div style={{fontSize:12,color:'var(--mist2)',marginTop:2}}>{myClass?.name} . {fmtDate(today)}</div>
          </div>
          <Btn size='sm' onClick={()=>onNav('attendance')}>Mark Now &rarr;</Btn>
        </div>
      )}
      {isViewingPast && (
        <div style={{background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:16}}>(!)</span>
          <span style={{fontSize:13,color:'var(--amber)'}}>You are viewing <strong>{activeYear}</strong> -- this is a read-only archive. Switch to the current year in the topbar to make changes.</span>
        </div>
      )}
      <PageHeader title={`Good ${new Date().getHours()<12?'morning':'afternoon'}, ${profile?.full_name?.split(' ')[0]||'there'}.`} sub={`${settings?.school_name||'SRMS'} . ${activeYear}`}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom: isMobile?20:28}}>
        {isAdmin && <>
          <KPI label='Total Students'   value={yearStudents.length}      color='var(--gold)'    sub={`${classes.length} classes`} index={0}/>
          <KPI label='Attendance Rate'  value={`${schoolAttRate}%`}  color='var(--emerald)' sub={`${schoolAttPresent} of ${schoolAttTotal} records`} index={1}/>
          <KPI label='Average Score'    value={avgScore}             color='var(--sky)'     sub={`Pass rate: ${passRate}%`} index={2}/>
          <KPI label='Fee Collection'   value={`${totalFees?Math.round(totalPaid/totalFees*100):0}%`} color='var(--amber)' sub={`${fmtMoney(totalPaid,currency)} collected`} index={3}/>
        </>}
        {profile?.role==='classteacher' && <>
          <KPI label='My Class'         value={myClass?.name||'--'}   color='var(--gold)'    sub='Your assigned class' index={0}/>
          <KPI label='Students'         value={myClassStudents.length} color='var(--sky)'   sub='In your class' index={1}/>
          <KPI label='Attendance Rate'  value={myClassAtt.length?`${myClassAttRate}%`:'--'} color='var(--emerald)' sub={todayMarked?'Today marked':'Not marked today'} index={2}/>
          <KPI label='Pass Rate'        value={`${passRate}%`}       color='var(--amber)'   sub='This semester' index={3}/>
        </>}
        {profile?.role==='teacher' && <>
          <KPI label='Subjects'        value={subjects.filter(s=>s.teacher_id===profile.id).length} color='var(--gold)'  sub='Assigned to you' index={0}/>
          <KPI label='Grades Entered'  value={grades.filter(g=>subjects.some(s=>s.id===g.subject_id&&s.teacher_id===profile.id)).length} color='var(--sky)' sub='Total records' index={1}/>
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
                <div style={{fontSize:11,color:'var(--mist3)',marginTop:8}}>Posted by {a.posted_by_name} . {fmtDate(a.created_at)}</div>
              </div>
              <div style={{fontSize:11,color:'var(--mist3)',whiteSpace:'nowrap'}}>{fmtDate(a.created_at)}</div>
            </div>
          </div>
        ))}
        <Btn variant='ghost' size='sm' onClick={()=>onNav('announcements')} style={{marginTop:4}}>View all &rarr;</Btn>
      </Card>
      <div style={{marginTop:40,paddingTop:20,borderTop:'1px solid var(--line)',textAlign:'center'}}>
        <div style={{fontSize:12,color:'var(--mist3)'}}>Designed &amp; developed by <span style={{color:'var(--white)',fontWeight:600}}>Prince William Kofi Anquandah</span></div>
        <div style={{fontSize:11,color:'var(--mist3)',marginTop:5,letterSpacing:'0.08em'}}><span style={{color:'var(--gold)',fontWeight:600,letterSpacing:'0.12em'}}>ZELVA STUDIOS</span> . {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}

// ── STUDENTS ───────────────────────────────────────────────────
function Students({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
  const {students=[],classes=[]} = data
  const [search,setSearch] = useState('')
  const [fc,setFc]         = useState('')
  const [modal,setModal]   = useState(false)
  const [edit,setEdit]     = useState(null)
  const [form,setForm]     = useState({})
  const [saving,setSaving] = useState(false)
  const [showArchived,setShowArchived]     = useState(false)
  const [fyear,setFyear]                   = useState('')
  const [unarchiveModal,setUnarchiveModal] = useState(null) // student to unarchive
  const [unarchiveClass,setUnarchiveClass] = useState('')
  const f = k => v => setForm(p=>({...p,[k]:v}))
  const [viewStudent, setViewStudent] = useState(null)
  const canEdit = ['superadmin','admin'].includes(profile?.role) && !isViewingPast

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if(!file) return
    if(!file.type.startsWith('image/')) { toast('Please upload an image file','error'); return }
    if(file.size > 2*1024*1024) { toast('Image must be under 2MB','error'); return }
    const reader = new FileReader()
    reader.onload = ev => setForm(p=>({...p, photo: ev.target.result}))
    reader.readAsDataURL(file)
  }
  const activeStudents   = students.filter(s=>!s.archived)
  const archivedStudents = students.filter(s=>s.archived)
  const graduationYears  = [...new Set(archivedStudents.map(s=>s.graduation_year).filter(Boolean))].sort((a,b)=>b.localeCompare(a))
  // Subject teacher: view students in classes they teach
  const teacherSubjectClassIds = profile?.role==='teacher'
    ? [...new Set(data.subjects?.filter(s=>s.teacher_id===profile?.id).map(s=>s.class_id)||[])]
    : []
  const pool = showArchived
    ? archivedStudents
    : profile?.role==='classteacher'
      ? activeStudents.filter(s=>s.class_id===profile.class_id)
      : profile?.role==='teacher'
        ? activeStudents.filter(s=>teacherSubjectClassIds.includes(s.class_id))
        : activeStudents
  const filtered = pool.filter(s=>{
    const q=search.toLowerCase()
    if(!(`${s.first_name} ${s.last_name} ${s.student_id}`).toLowerCase().includes(q)) return false
    if(showArchived && fyear && s.graduation_year!==fyear) return false
    if(!showArchived && fc && s.class_id!==fc) return false
    return true
  })
  const unarchive = async (student, classId) => {
    if(!classId){ toast('Please select a class to re-enrol the student into','error'); return }
    setSaving(true)
    const {error} = await supabase.from('students').update({archived:false, class_id:classId, graduation_year:null}).eq('id',student.id)
    if(error){ toast(error.message,'error'); setSaving(false); return }
    setData(p=>({...p, students:p.students.map(s=>s.id===student.id?{...s,archived:false,class_id:classId,graduation_year:null}:s)}))
    auditLog(profile,'Students','Unarchived',`${student.first_name} ${student.last_name} → ${classes.find(c=>c.id===classId)?.name}`,{},{...student},{archived:false,class_id:classId})
    toast(`${student.first_name} ${student.last_name} re-enrolled`)
    setUnarchiveModal(null)
    setUnarchiveClass('')
    setSaving(false)
  }
  const openAdd = ()=>{setEdit(null);setForm({first_name:'',last_name:'',class_id:'',dob:'',gender:'',phone:'',email:'',address:'',medical_info:'',guardian_name:'',guardian_relation:'',guardian_phone:'',guardian_email:''});setModal(true)}
  const openEdit = s=>{setEdit(s);setForm({...s});setModal(true)}
  const save = async ()=>{
    if(!form.first_name||!form.last_name||!form.class_id)return
    if(!form.guardian_name||!form.guardian_phone){toast('Please add at least one parent or guardian with a name and phone number','error');return}
    setSaving(true)
    if(edit){
      const {error} = await supabase.from('students').update({...form,updated_at:new Date()}).eq('id',edit.id)
      if(error){toast(error.message,'error')}else{setData(p=>({...p,students:p.students.map(s=>s.id===edit.id?{...s,...form}:s)}));auditLog(profile,'Students','Updated',`${form.first_name} ${form.last_name}`,{},{...edit},{...form});toast('Student updated');setModal(false)}
    } else {
      const sid = genSID(students)
      const {data:row,error} = await supabase.from('students').insert({...form,student_id:sid,created_at:new Date(),entry_year:activeYear}).select().single()
      if(error){toast(error.message,'error')}else{setData(p=>({...p,students:[...p.students,row]}));auditLog(profile,'Students','Created',`${form.first_name} ${form.last_name}`,{},null,row);toast('Student added');setModal(false)}
    }
    setSaving(false)
  }
  const del = async id=>{
    if(!confirm('Remove this student?'))return
    const {error} = await supabase.from('students').delete().eq('id',id)
    if(error)toast(error.message,'error')
    else{const s=students.find(x=>x.id===id);setData(p=>({...p,students:p.students.filter(s=>s.id!==id)}));auditLog(profile,'Students','Deleted',`${s?.first_name} ${s?.last_name}`,{},s||null,null);toast('Student removed')}
  }
  return (
    <div>
      <PageHeader
        title={showArchived?'Alumni Register':'Students'}
        sub={showArchived
          ? `${filtered.length} of ${archivedStudents.length} alumni${fyear?' · '+fyear:''}`
          : `${filtered.length} of ${activeStudents.length} students`}>
        {canEdit && !showArchived && <Btn onClick={openAdd}>+ New Student</Btn>}
        {canEdit && (
          <Btn variant='ghost' onClick={()=>{setShowArchived(v=>!v);setSearch('');setFc('');setFyear('')}}>
            {showArchived?'← Back to Students':'⊡ Alumni Register'}
          </Btn>
        )}
      </PageHeader>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:'1 1 240px'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:14}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={showArchived?'Search alumni by name or ID...':'Search by name or ID...'}
              style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
          </div>
          {showArchived ? (
            <select value={fyear} onChange={e=>setFyear(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
              <option value=''>All Years</option>
              {graduationYears.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          ) : (
            (canEdit || profile?.role==='teacher') && (
              <select value={fc} onChange={e=>setFc(e.target.value)}
                style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
                <option value=''>All Classes</option>
                {(profile?.role==='teacher' ? classes.filter(c=>teacherSubjectClassIds.includes(c.id)) : classes).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )
          )}
        </div>
      </Card>
      <Card>
        <DataTable onRow={s=>setViewStudent(s)} data={filtered} columns={[
          {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
          {key:'first_name',label:'Student',render:(v,r)=>(
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Avatar name={`${r.first_name} ${r.last_name}`} size={30} photo={r.photo}/>
              <div>
                <div style={{fontWeight:600}}>{r.first_name} {r.last_name}</div>
                <div style={{fontSize:11,color:'var(--mist3)'}}>{r.email||'--'}</div>
              </div>
            </div>
          )},
          showArchived
            ? {key:'graduation_year',label:'Graduated',render:v=>v
                ? <span style={{fontSize:12,fontWeight:600,color:'var(--sky)',background:'rgba(91,168,245,0.1)',border:'1px solid rgba(91,168,245,0.2)',borderRadius:4,padding:'2px 8px'}}>{v}</span>
                : <span style={{color:'var(--mist3)'}}>--</span>}
            : {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'--'},
          {key:'gender',label:'Gender'},
          {key:'dob',label:'Date of Birth',render:v=>fmtDate(v)},
          {key:'medical_info',label:'Medical',render:v=>v&&v!=='None'?<Badge color='var(--rose)'>{v}</Badge>:<span style={{color:'var(--mist3)'}}>None</span>},
          showArchived
            ? profile?.role==='superadmin'
              ? {key:'id',label:'',render:(v,r)=>(
                  <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                    <Btn variant='ghost' size='sm' onClick={()=>{setUnarchiveModal(r);setUnarchiveClass('')}}>Re-enrol</Btn>
                  </div>
                )}
              : {key:'id',label:'',render:()=>null}
            : canEdit&&!isViewingPast
              ? {key:'id',label:'',render:(v,r)=>(
                  <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                    <Btn variant='ghost' size='sm' onClick={()=>openEdit(r)}>Edit</Btn>
                    <Btn variant='danger' size='sm' onClick={()=>del(r.id)}>Remove</Btn>
                  </div>
                )}
              : {key:'id',label:'',render:()=>null},
        ]}/>
      </Card>
      {modal && (
        <Modal title={edit?'Edit Student':'New Student'} subtitle={edit?`ID: ${edit.student_id}`:'A Student ID will be generated automatically.'} onClose={()=>setModal(false)} width={580}>
          {/* Photo upload */}
          <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 16px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:20,border:'1px solid var(--line)'}}>
            <div style={{position:'relative',flexShrink:0}}>
              <Avatar name={`${form.first_name||'?'} ${form.last_name||''}`} size={56} photo={form.photo}/>
              {form.photo && (
                <button onClick={()=>setForm(p=>({...p,photo:null}))}
                  style={{position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'50%',background:'var(--rose)',color:'white',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none'}}>×</button>
              )}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--white)',marginBottom:2}}>Student Photo</div>
              <div style={{fontSize:11,color:'var(--mist3)',marginBottom:8}}>JPG or PNG, max 2MB</div>
              <label style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',cursor:'pointer',fontSize:12,color:'var(--mist)',fontWeight:500}}>
                ⬆ Upload Photo
                <input type='file' accept='.jpg,.jpeg,.png' onChange={handlePhotoUpload} style={{display:'none'}}/>
              </label>
            </div>
          </div>
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
          <Field label='Medical Information' value={form.medical_info} onChange={f('medical_info')} placeholder='Known conditions, allergies...'/>
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
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Student'}</Btn>
          </div>
        </Modal>
      )}

      {/* Unarchive / Re-enrol Modal */}
      {unarchiveModal && (
        <Modal title='Re-enrol Student' onClose={()=>{setUnarchiveModal(null);setUnarchiveClass('')}} width={420}>
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:20,border:'1px solid var(--line)'}}>
            <Avatar name={`${unarchiveModal.first_name} ${unarchiveModal.last_name}`} size={44} photo={unarchiveModal.photo}/>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{unarchiveModal.first_name} {unarchiveModal.last_name}</div>
              <div style={{fontSize:12,color:'var(--mist3)',marginTop:2}}>ID: {unarchiveModal.student_id} · Graduated {unarchiveModal.graduation_year||'--'}</div>
            </div>
          </div>
          <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
            This will restore the student as active and assign them to a class. Their full history (grades, fees, attendance) is preserved.
          </p>
          <Field label='Assign to Class' value={unarchiveClass} onChange={setUnarchiveClass} required
            options={[{value:'',label:'Select a class...'},...classes.map(c=>({value:c.id,label:c.name}))]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
            <Btn variant='ghost' onClick={()=>{setUnarchiveModal(null);setUnarchiveClass('')}}>Cancel</Btn>
            <Btn onClick={()=>unarchive(unarchiveModal,unarchiveClass)} disabled={!unarchiveClass||saving}>
              {saving?<><Spinner/> Re-enrolling...</>:'Confirm Re-enrolment'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Student Profile View */}
      {viewStudent && (() => {
        const s = viewStudent
        const cls = classes.find(c=>c.id===s.class_id)
        const subjectsForClass = data.subjects?.filter(sub=>sub.class_id===s.class_id)||[]
        const studentGrades = data.grades?.filter(g=>g.student_id===s.id)||[]
        const gradeComps = getGradeComponents(settings)
        const scale = settings?.grading_scale||[]
        const attRecs = data.attendance?.filter(a=>a.student_id===s.id)||[]
        const present = attRecs.filter(a=>a.status==='Present').length
        const absent  = attRecs.filter(a=>a.status==='Absent').length
        const late    = attRecs.filter(a=>a.status==='Late').length
        const attRate = attRecs.length ? Math.round(present/attRecs.length*100) : null
        return (
          <Modal title='' onClose={()=>setViewStudent(null)} width={780}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'flex-start',gap:20,marginBottom:24,paddingBottom:20,borderBottom:'1px solid var(--line)'}}>
              <div style={{position:'relative',flexShrink:0}}>
                <Avatar name={`${s.first_name} ${s.last_name}`} size={80} photo={s.photo}/>
                <div style={{position:'absolute',bottom:4,right:4,width:12,height:12,borderRadius:'50%',background:s.archived?'var(--mist3)':'var(--emerald)',border:'2px solid var(--ink3)'}}/>
              </div>
              <div style={{flex:1}}>
                <h2 className='d' style={{fontSize:22,fontWeight:700,letterSpacing:'-0.02em',marginBottom:8}}>{s.first_name} {s.last_name}</h2>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <span className='mono' style={{fontSize:12,color:'var(--gold)',background:'rgba(232,184,75,0.1)',border:'1px solid rgba(232,184,75,0.25)',borderRadius:4,padding:'2px 8px'}}>{s.student_id}</span>
                  {s.archived
                    ? <span style={{fontSize:12,color:'var(--rose)',background:'rgba(240,107,122,0.1)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:4,padding:'2px 8px'}}>Alumni · {s.graduation_year||'--'}</span>
                    : cls && <span style={{fontSize:12,color:'var(--sky)',background:'rgba(91,168,245,0.1)',border:'1px solid rgba(91,168,245,0.2)',borderRadius:4,padding:'2px 8px'}}>{cls.name}</span>
                  }
                  {s.gender && <span style={{fontSize:12,color:'var(--mist2)'}}>{s.gender}</span>}
                </div>
              </div>
              {canEdit && (
                <button onClick={()=>{setViewStudent(null);openEdit(s)}}
                  style={{width:34,height:34,borderRadius:'50%',background:'rgba(232,184,75,0.12)',border:'1px solid rgba(232,184,75,0.3)',color:'var(--gold)',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>✎</button>
              )}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              {/* Left col */}
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Personal Details</div>
                {[
                  ['Date of Birth', fmtDate(s.dob)],
                  ['Gender', s.gender||'--'],
                  ['Phone', s.phone||'--'],
                  ['Email', s.email||'--'],
                  ['Address', s.address||'--'],
                  ['Entry Year', s.entry_year||'--'],
                  ...(s.archived ? [['Graduation Year', s.graduation_year||'--']] : []),
                ].map(([label,value])=>(
                  <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--line)'}}>
                    <span style={{fontSize:12,color:'var(--mist3)'}}>{label}</span>
                    <span style={{fontSize:12,color:'var(--mist)',textAlign:'right',maxWidth:'60%'}}>{value}</span>
                  </div>
                ))}
                {(s.guardian_name||s.guardian_phone) && <>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:20,marginBottom:12}}>Parent / Guardian</div>
                  {[
                    ['Name', s.guardian_name||'--'],
                    ['Relationship', s.guardian_relation||'--'],
                    ['Phone', s.guardian_phone||'--'],
                    ['Email', s.guardian_email||'--'],
                  ].map(([label,value])=>(
                    <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--line)'}}>
                      <span style={{fontSize:12,color:'var(--mist3)'}}>{label}</span>
                      <span style={{fontSize:12,color:'var(--mist)',textAlign:'right',maxWidth:'60%'}}>{value}</span>
                    </div>
                  ))}
                </>}
                {s.medical_info && s.medical_info!=='None' && (
                  <div style={{marginTop:12,padding:'10px 14px',background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--rose)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Medical Info</div>
                    <div style={{fontSize:12,color:'var(--mist2)'}}>{s.medical_info}</div>
                  </div>
                )}
              </div>

              {/* Right col */}
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Academic Summary</div>
                {subjectsForClass.length===0
                  ? <div style={{fontSize:13,color:'var(--mist3)',padding:'12px 0'}}>No subjects for this class.</div>
                  : subjectsForClass.map(sub=>{
                      const g = studentGrades.find(g=>g.subject_id===sub.id)
                      const total = g ? calcTotal(g, gradeComps) : null
                      const grade = total!==null ? (scale.find(s=>total>=s.min&&total<=s.max)?.letter||'--') : '--'
                      const gradeColor = LETTER_COLOR[grade]||'var(--mist3)'
                      return (
                        <div key={sub.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:6,border:'1px solid var(--line)'}}>
                          <span style={{fontSize:13,color:'var(--mist)'}}>{sub.name}</span>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <span style={{fontSize:13,fontWeight:700,color:'var(--white)'}}>{total!==null?total:'--'}</span>
                            <span style={{fontSize:11,fontWeight:700,color:gradeColor,background:`${gradeColor}20`,border:`1px solid ${gradeColor}40`,borderRadius:4,padding:'1px 6px'}}>{grade}</span>
                          </div>
                        </div>
                      )
                    })
                }

                <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:20,marginBottom:12}}>Attendance</div>
                {attRecs.length===0
                  ? <div style={{fontSize:13,color:'var(--mist3)'}}>No attendance records yet.</div>
                  : <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      {[['Present',present,'var(--emerald)'],['Absent',absent,'var(--rose)'],['Late',late,'var(--amber)']].map(([label,count,color])=>(
                        <div key={label} style={{flex:1,minWidth:70,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${color}30`,textAlign:'center'}}>
                          <div style={{fontSize:18,fontWeight:700,color}}>{count}</div>
                          <div style={{fontSize:10,color:'var(--mist3)',marginTop:2}}>{label}</div>
                        </div>
                      ))}
                      {attRate!==null && (
                        <div style={{flex:1,minWidth:70,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:'1px solid var(--line)',textAlign:'center'}}>
                          <div style={{fontSize:18,fontWeight:700,color:'var(--sky)'}}>{attRate}%</div>
                          <div style={{fontSize:10,color:'var(--mist3)',marginTop:2}}>Rate</div>
                        </div>
                      )}
                    </div>
                }
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}

// ── GRADES ─────────────────────────────────────────────────────
function Grades({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
  const {grades=[],students=[],subjects=[]} = data
  const scale = settings?.grading_scale || []
  const allComps = getGradeComponents(settings)
  const activeComps = allComps.filter(c=>c.enabled)
  const isAdminGrades      = ['superadmin','admin'].includes(profile?.role)
  const isClassTeacherGrades = profile?.role==='classteacher'
  // Subjects this user can EDIT grades for
  const mySubjects = isAdminGrades
    ? subjects
    : subjects.filter(s=>s.teacher_id===profile?.id)

  // All class IDs this user can access in grades
  // Class teacher: their own class + any other class where they're a subject teacher
  // Subject teacher: all classes where they teach a subject
  const myClassIds = isAdminGrades
    ? null
    : [...new Set(mySubjects.map(s=>s.class_id))]

  // Class teacher also views all subjects in their own class (read-only for others)
  const viewSubjects = isClassTeacherGrades
    ? subjects.filter(s=>s.class_id===profile?.class_id || s.teacher_id===profile?.id)
    : mySubjects

  // Classes available in the filter for non-admins
  const teacherClasses = myClassIds
    ? data.classes?.filter(c=>myClassIds.includes(c.id))||[]
    : data.classes||[]

  // Default fc to class teacher's own class
  const [fc,setFc] = useState(isClassTeacherGrades ? (profile?.class_id||'') : '')
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

  // Subjects scoped to selected class in filter
  const fcSubjects = fc
    ? viewSubjects.filter(s=>s.class_id===fc)
    : viewSubjects

  // Students scoped to selected class (or all teaching classes if no class selected)
  const myStudents = fc
    ? students.filter(s=>s.class_id===fc)
    : myClassIds===null
      ? students
      : students.filter(s=>myClassIds.includes(s.class_id))

  // Grades visible in table
  const myGrades = isAdminGrades
    ? grades
    : grades.filter(g=>viewSubjects.some(s=>s.id===g.subject_id))

  const filtered = myGrades.filter(g=>{
    // Scope to active year — skip only if year is explicitly set to a different year
    if(g.year && g.year !== activeYear) return false
    // Filter by class: match the student's CURRENT class, not the subject's class
    // This ensures promoted students don't appear under their old class
    if(fc) {
      const student = students.find(s=>s.id===g.student_id)
      if(!student || student.class_id !== fc) return false
    }
    return (!fs||g.subject_id===fs)&&(!fp||g.period===fp)
  })

  // Score limit warnings
  const scoreWarnings = allComps.filter(c=>c.enabled && +form[c.key] > c.max_score && c.max_score>0)

  const openAdd = () => {
    const emptyScores = ALL_COMPONENTS.reduce((acc,k)=>({...acc,[k]:''}),{})
    const defaultSubject = fc
      ? fcSubjects[0]?.id||''
      : mySubjects[0]?.id||''
    setEdit(null)
    setForm({student_id:'',subject_id:defaultSubject,...emptyScores,period:periods[0],year:activeYear})
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
      else{
        setData(p=>({...p,grades:p.grades.map(x=>x.id===edit.id?{...x,...g}:x)}))
        const student=students.find(s=>s.id===g.student_id)
        const subject=subjects.find(s=>s.id===g.subject_id)
        auditLog(profile,'Grades','Updated',`${student?.first_name} ${student?.last_name} · ${subject?.name} · ${g.period}`,{},{...edit},{...g})
        toast('Grade updated');setModal(false)
      }
    } else {
      const {data:row,error}=await supabase.from('grades').insert(g).select().single()
      if(error)toast(error.message,'error')
      else{
        setData(p=>({...p,grades:[...p.grades,row]}))
        const student=students.find(s=>s.id===g.student_id)
        const subject=subjects.find(s=>s.id===g.subject_id)
        auditLog(profile,'Grades','Created',`${student?.first_name} ${student?.last_name} · ${subject?.name} · ${g.period}`,{},null,{...g})
        toast('Grade recorded');setModal(false)
      }
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
        {isViewingPast
          ? <span style={{fontSize:12,color:'var(--amber)',padding:'8px 16px',background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.2)',borderRadius:'var(--r-sm)'}}>Read only -- viewing {activeYear}</span>
          : activeComps.length===0
            ? <span style={{fontSize:12,color:'var(--rose)',padding:'8px 16px',background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)'}}>(!) No grade components active. Configure in Settings.</span>
            : <Btn onClick={openAdd}>+ Record Grades</Btn>
        }
      </PageHeader>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {/* Class filter — admin sees all classes, teachers see only their teaching classes */}
          <select value={fc} onChange={e=>{setFc(e.target.value);setFs('')}}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
            {isAdminGrades
              ? <option value=''>All Classes</option>
              : <option value=''>All My Classes</option>
            }
            {teacherClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={fs} onChange={e=>setFs(e.target.value)}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
            <option value=''>All Subjects</option>
            {fcSubjects.map(s=><option key={s.id} value={s.id}>{s.name}{!mySubjects.some(m=>m.id===s.id)?' (view only)':''}</option>)}
          </select>
          <select value={fp} onChange={e=>setFp(e.target.value)}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Periods</option>
            {periods.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
      </Card>
      <Card>
        <DataTable onRow={isViewingPast?null:(g=>mySubjects.some(s=>s.id===g.subject_id)?openEdit(g):null)} data={filtered} columns={[
          {key:'student_id',label:'Student',render:v=>{const s=students.find(x=>x.id===v);return s?(<div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={`${s.first_name} ${s.last_name}`} size={28}/><span style={{fontWeight:600}}>{s.first_name} {s.last_name}</span></div>):'--'}},
          {key:'subject_id',label:'Subject',render:v=>subjects.find(s=>s.id===v)?.name||'--'},
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
            <Field label='Student' value={form.student_id} onChange={f('student_id')} required options={myStudents.map(s=>({value:s.id,label:`${s.first_name} ${s.last_name} · ${data.classes?.find(c=>c.id===s.class_id)?.name||''}`}))}/>
            <Field label='Subject' value={form.subject_id} onChange={f('subject_id')} required options={fcSubjects.length>0?fcSubjects.map(s=>({value:s.id,label:s.name})):mySubjects.map(s=>({value:s.id,label:s.name}))}/>
            <Field label='Period'        value={form.period} onChange={f('period')} options={periods}/>
            <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>Academic Year</div><div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',fontSize:13,color:'var(--mist3)'}}>{form.year||settings?.academic_year||'--'}</div></div>
          </div>
          <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:18,marginBottom:16}}>
            <SectionTitle>Score Entry</SectionTitle>
            {/* Active components -- editable */}
            {activeComps.length>0 && (
              <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(activeComps.length,4)},1fr)`,gap:'8px 12px',marginBottom:12}}>
                {activeComps.map(c=>{
                  const over = c.max_score>0 && +form[c.key] > c.max_score
                  return (
                    <div key={c.key}>
                      <Field label={`${c.label} /${c.max_score}`} value={form[c.key]||''} onChange={f(c.key)} type='number'
                        style={{marginBottom:0,borderColor:over?'var(--rose)':undefined}}/>
                      {over && <div style={{fontSize:10,color:'var(--rose)',marginTop:2,fontWeight:600}}>Max is {c.max_score}</div>}
                    </div>
                  )
                })}
              </div>
            )}
            {/* Score limit warning banner */}
            {scoreWarnings.length>0 && (
              <div style={{background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.3)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:16}}>⚠</span>
                <span style={{fontSize:12,color:'var(--rose)',fontWeight:600}}>
                  {scoreWarnings.map(c=>`${c.label} exceeds max (${c.max_score})`).join(' · ')}
                </span>
              </div>
            )}
            {/* Cross-period reference -- show other periods' scores for same student+subject */}
            {form.student_id && form.subject_id && (() => {
              const otherPeriods = grades.filter(g=>
                g.student_id===form.student_id &&
                g.subject_id===form.subject_id &&
                g.period !== form.period &&
                (!edit || g.id !== edit.id)
              )
              if(!otherPeriods.length) return null
              return (
                <div style={{background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:12}}>
                  <div style={{fontSize:10,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Previous period scores for reference</div>
                  <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                    {otherPeriods.map(g=>{
                      const tot=calcTotal(g,allComps), let_=getLetter(tot,scale)
                      return (
                        <div key={g.id} style={{background:'var(--ink3)',borderRadius:'var(--r-sm)',padding:'8px 12px',minWidth:100}}>
                          <div style={{fontSize:10,color:'var(--mist3)',marginBottom:4,fontWeight:600}}>{g.period}</div>
                          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                            <span className='mono' style={{fontSize:18,fontWeight:700,color:LETTER_COLOR[let_]||'var(--white)'}}>{tot}</span>
                            <Badge color={LETTER_COLOR[let_]||'var(--mist2)'}>{let_}</Badge>
                          </div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                            {allComps.filter(c=>c.enabled).map(c=>(
                              <div key={c.key} style={{fontSize:10,color:'var(--mist3)'}}>
                                {c.label}: <span style={{color:'var(--mist)'}}>{g[c.key]||0}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
            {/* Disabled components with existing scores -- read-only */}
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
            <div style={{marginTop:14,display:'flex',alignItems:'center',gap:20,background:'var(--ink4)',borderRadius:'var(--r-sm)',padding:'14px 18px',border:`1px solid ${scoreWarnings.length?'var(--rose)':LETTER_COLOR[prevL]||'var(--line)'}20`}}>
              <div>
                <div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Total Score</div>
                <div className='d' style={{fontSize:28,fontWeight:700,color:scoreWarnings.length?'var(--rose)':LETTER_COLOR[prevL]||'var(--mist)',lineHeight:1}}>{prev}<span style={{fontSize:14,color:'var(--mist3)'}}>/100</span></div>
              </div>
              <div style={{width:1,height:40,background:'var(--line)'}}/>
              <div>
                <div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Grade</div>
                <Badge color={LETTER_COLOR[prevL]||'var(--mist2)'}>{prevL}</Badge>
              </div>
              <div style={{width:1,height:40,background:'var(--line)'}}/>
              <div>
                <div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Remark</div>
                <div className='d' style={{fontSize:13,color:'var(--mist2)',fontWeight:600}}>{getGradeRemark(prev,scale)||'--'}</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving||activeComps.length===0}>{saving?<><Spinner/> Saving...</>:'Save Grade'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── ATTENDANCE ─────────────────────────────────────────────────
function Attendance({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
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
  // Calendar blocking
  const vacations    = settings?.vacations    || []
  const customHols   = settings?.custom_holidays || []
  const holidayName  = getHolidayOnDate(date, customHols)
  const vacationName = getVacationOnDate(date, vacations, activeYear)
  const isBlocked    = !!(holidayName || vacationName)
  const blockReason  = vacationName
    ? { icon: '🏖', title: 'School is on Vacation', sub: vacationName, color: 'var(--sky)', bg: 'rgba(91,168,245,0.06)', border: 'rgba(91,168,245,0.2)' }
    : holidayName
    ? { icon: '🎉', title: 'Public Holiday', sub: holidayName, color: 'var(--emerald)', bg: 'rgba(45,212,160,0.06)', border: 'rgba(45,212,160,0.2)' }
    : null

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
        .map(s=>({student_id:s.id,class_id:cid,date,status:getStatus(s.id)||null,marked_by:profile?.id,academic_year:activeYear}))
        .filter(m=>m.status)
      if(allMarks.length===0){toast('No students marked -- nothing to save','error');setSaving(false);return}
      const {error:delErr} = await supabase.from('attendance').delete().eq('class_id',cid).eq('date',date)
      if(delErr) throw delErr
      const {data:rows,error:insErr} = await supabase.from('attendance').insert(allMarks).select()
      if(insErr) throw insErr
      setData(p=>({...p,attendance:[...p.attendance.filter(a=>!(a.class_id===cid&&a.date===date)),...(rows||[])]}))
      setPendingMarks({})
      setHasUnsaved(false)
      auditLog(profile,'Attendance','Marked',`${cls?.name} · ${date} · ${allMarks.length} students`,{class:cls?.name,date,count:allMarks.length},null,null)
      toast(`Attendance saved -- ${allMarks.length} student${allMarks.length!==1?'s':''} recorded done`)
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
          {tab==='mark'&&cls&&!isBlocked&&(
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
      {isBlocked && tab==='mark' && (
        <div className='fi' style={{background:blockReason.bg,border:'1px solid '+blockReason.border,borderRadius:'var(--r)',padding:'28px 24px',marginBottom:16,textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:10}}>{blockReason.icon}</div>
          <div style={{fontSize:16,fontWeight:700,color:blockReason.color,marginBottom:6}}>{blockReason.title}</div>
          <div style={{fontSize:13,color:'var(--mist2)'}}>{blockReason.sub}</div>
          <div style={{fontSize:12,color:'var(--mist3)',marginTop:8}}>Attendance marking is not available on this date.</div>
        </div>
      )}
      {tab==='mark' ? (
        <div>
          {!cls ? (
            <Card><div style={{padding:60,textAlign:'center',color:'var(--mist3)',fontSize:13}}>Select a class to begin marking attendance.</div></Card>
          ) : (
            <>
              {!hasUnsaved && alreadyMarkedToday && (
                <div className='fi' style={{background:'rgba(45,212,160,0.06)',border:'1px solid rgba(45,212,160,0.2)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16}}>done</span>
                  <span style={{fontSize:13,color:'var(--emerald)'}}>Attendance already marked for today. You can still edit and save again.</span>
                </div>
              )}
              {!hasUnsaved && !alreadyMarkedToday && savedRecs.length===0 && date===today && (
                <div className='fi' style={{background:'rgba(251,159,58,0.06)',border:'1px solid rgba(251,159,58,0.2)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16}}>(!)</span>
                  <span style={{fontSize:13,color:'var(--amber)'}}>Attendance has not been marked yet today for <strong>{cls.name}</strong>.</span>
                </div>
              )}
              {hasUnsaved && unmarkedCount>0 && (
                <div className='fi' style={{background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16,color:'var(--rose)'}}>●</span>
                  <span style={{fontSize:13,color:'var(--rose)'}}><strong>{unmarkedCount} student{unmarkedCount!==1?'s':''}</strong> not yet marked -- they won't be recorded.</span>
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
                    ? <><span style={{fontWeight:600,color:'var(--amber)'}}>(!) Unsaved changes</span><span style={{color:'var(--mist2)'}}> -- click Save to record attendance</span></>
                    : <span style={{color:'var(--mist3)'}}>All changes saved</span>
                  }
                </div>
                {!isViewingPast && !isBlocked && <Btn onClick={saveAttendance} disabled={saving||!hasUnsaved} style={{minWidth:160,justifyContent:'center',boxShadow:hasUnsaved?'0 4px 20px rgba(232,184,75,0.25)':'none'}}>
                  {saving?<><Spinner/> Saving...</>:(unmarkedCount>0?`Save Attendance (${unmarkedCount} unmarked)`:'Save Attendance')}
                </Btn>}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card>
          <DataTable data={histRecs.slice(0,100)} columns={[
            {key:'date',label:'Date',render:v=>fmtDate(v)},
            {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'--'},
            {key:'student_id',label:'Student',render:v=>{const s=students.find(x=>x.id===v);return s?`${s.first_name} ${s.last_name}`:'--'}},
            {key:'status',label:'Status',render:v=><Badge color={STATUS_META[v]?.color} bg={STATUS_META[v]?.bg}>{v}</Badge>},
          ]}/>
        </Card>
      )}
    </div>
  )
}

// ── RECEIPT PRINTER ────────────────────────────────────────────
function printReceipt({fee, feePayments, student, cls, settings, currency}) {
  const schoolName  = settings?.school_name  || 'School'
  const schoolMotto = settings?.motto         || ''
  const schoolLogo  = settings?.school_logo   || null
  const totalPaid   = feePayments.reduce((a,p)=>a+Number(p.amount||0),0)
  // legacy: any paid amount on fee record not covered by payments table
  const legacyPaid  = Math.max(0, Number(fee.paid||0) - totalPaid)
  const allPaid     = legacyPaid + totalPaid
  const balance     = Number(fee.amount||0) - allPaid
  const isPaidFull  = balance <= 0
  const lastPayment = [...feePayments].sort((a,b)=>b.created_at?.localeCompare(a.created_at))[0]
  const receiptNo   = lastPayment?.receipt_no || fee.receipt_no || '--'
  const fmtD        = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '--'
  const fmtT        = d => d ? new Date(d).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : ''

  const logoTag = schoolLogo
    ? `<img src="${schoolLogo}" style="width:52px;height:52px;object-fit:contain;border-radius:6px;" />`
    : `<div style="width:52px;height:52px;border-radius:10px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-family:'Arial Black',sans-serif;font-size:22px;font-weight:900;color:#e8b84b;flex-shrink:0;">S</div>`

  const paymentRows = feePayments.length > 0
    ? feePayments.map((p,i) => `
        <tr>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#444;">${fmtD(p.created_at)} ${fmtT(p.created_at)}</td>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#444;font-family:monospace;">${p.receipt_no||'--'}</td>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#444;">${p.recorded_by_name||'--'}</td>
          <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#1a7a4a;text-align:right;">${fmtMoney(p.amount,currency)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="padding:10px 0;font-size:12px;color:#aaa;text-align:center;">No payment transactions recorded</td></tr>`

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Receipt ${receiptNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e8e8e8;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:32px 16px}
  .card{width:420px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.18)}
  @media print{
    body{background:#fff;padding:0;display:block}
    .card{width:100%;box-shadow:none;border-radius:0}
    .no-print{display:none!important}
  }
</style>
</head>
<body>
<div class="card">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#0f2027 100%);padding:24px 24px 0 24px;position:relative;overflow:hidden;">
    <!-- Decorative circles -->
    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(232,184,75,0.08);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;border-radius:50%;background:rgba(232,184,75,0.05);pointer-events:none;"></div>

    <!-- Logo + school info -->
    <div style="display:flex;align-items:flex-start;gap:14px;position:relative;z-index:1;">
      ${logoTag}
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2;">${schoolName}</div>
        ${schoolMotto ? `<div style="font-size:10px;color:#e8b84b;margin-top:3px;font-style:italic;opacity:0.9;">"${schoolMotto}"</div>` : ''}
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">Official Payment Receipt</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="background:rgba(232,184,75,0.15);border:1px solid rgba(232,184,75,0.4);border-radius:8px;padding:6px 10px;">
          <div style="font-size:9px;color:rgba(232,184,75,0.7);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px;">Receipt No.</div>
          <div style="font-size:13px;font-weight:800;color:#e8b84b;font-family:monospace;letter-spacing:0.05em;">${receiptNo}</div>
        </div>
      </div>
    </div>

    <!-- Gold divider wave -->
    <div style="margin-top:20px;height:3px;background:linear-gradient(90deg,transparent,#e8b84b,#f5d07a,#e8b84b,transparent);border-radius:2px;"></div>

    <!-- Status ribbon -->
    <div style="background:${isPaidFull?'rgba(45,212,160,0.12)':'rgba(251,159,58,0.12)'};padding:10px 0;text-align:center;margin-top:0;">
      <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${isPaidFull?'#2dd4a0':'#fb9f3a'};">
        ${isPaidFull ? '✓ Fully Paid' : `Balance Remaining: ${fmtMoney(balance,currency)}`}
      </span>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:20px 24px;">

    <!-- Student info -->
    <div style="background:#f8f8fc;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Student Information</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Full Name</div>
          <div style="font-size:13px;font-weight:700;color:#111;">${student?.first_name||''} ${student?.last_name||''}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Student ID</div>
          <div style="font-size:13px;font-weight:700;color:#111;font-family:monospace;">${student?.student_id||'--'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Class</div>
          <div style="font-size:13px;font-weight:600;color:#111;">${cls?.name||'--'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#999;margin-bottom:2px;">Academic Year</div>
          <div style="font-size:13px;font-weight:600;color:#111;">${fee.academic_year||'--'}</div>
        </div>
      </div>
    </div>

    <!-- Fee details -->
    <div style="margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Fee Details</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8f8fc;border-radius:8px;margin-bottom:6px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:#111;">${fee.fee_type||'Fee'}</div>
          ${fee.period?`<div style="font-size:11px;color:#888;margin-top:2px;">${fee.period}</div>`:''}
        </div>
        <div style="font-size:15px;font-weight:800;color:#111;">${fmtMoney(fee.amount,currency)}</div>
      </div>

      <!-- Balance breakdown -->
      <div style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
        ${[
          ['Total Fee', fmtMoney(fee.amount,currency), '#111', false],
          ['Total Paid', fmtMoney(allPaid,currency), '#1a7a4a', false],
          ['Balance', fmtMoney(Math.max(0,balance),currency), isPaidFull?'#1a7a4a':'#c0392b', true],
        ].map(([l,v,c,bold])=>`
          <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #f5f5f5;">
            <span style="font-size:12px;color:#666;">${l}</span>
            <span style="font-size:13px;font-weight:${bold?800:600};color:${c};">${v}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Payment history -->
    <div style="margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Payment History</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8f8fc;">
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Date</th>
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Receipt</th>
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Recorded By</th>
            <th style="padding:7px 0;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>

    ${isPaidFull ? `
    <!-- PAID watermark -->
    <div style="text-align:center;margin-bottom:14px;">
      <div style="display:inline-block;border:3px solid #2dd4a0;border-radius:8px;padding:6px 20px;transform:rotate(-2deg);">
        <span style="font-size:22px;font-weight:900;color:#2dd4a0;letter-spacing:0.2em;">PAID</span>
      </div>
    </div>` : ''}

    <!-- Footer -->
    <div style="border-top:1px solid #eee;padding-top:12px;text-align:center;">
      <div style="font-size:10px;color:#bbb;">Generated ${fmtD(new Date())} ${fmtT(new Date())}</div>
      <div style="font-size:10px;color:#ccc;margin-top:3px;letter-spacing:0.06em;">${schoolName} · SRMS</div>
    </div>
  </div>

  <!-- Print button -->
  <div class="no-print" style="padding:0 24px 20px;text-align:center;">
    <button onclick="window.print()" style="width:100%;padding:12px;background:linear-gradient(135deg,#e8b84b,#f5d07a);border:none;border-radius:10px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;letter-spacing:0.02em;">
      ⎙ Print Receipt
    </button>
  </div>
</div>
</body>
</html>`

  const w = window.open('','_blank','width=500,height=800')
  if(w){ w.document.write(html); w.document.close() }
}

// ── FEES ───────────────────────────────────────────────────────
function Fees({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
  const {fees=[],students=[],classes=[],payments=[]} = data
  const currency = getCurrency(settings)
  const isMobile = useIsMobile()
  const canBulk = ['superadmin','admin'].includes(profile?.role)

  // ── Single add / pay state ──
  const [search,setSearch]     = useState('')
  const [fstatus,setFstatus]   = useState('')
  const [modal,setModal]       = useState(false)
  const [payModal,setPayModal] = useState(false)
  const [editFee,setEditFee]   = useState(null)
  const [form,setForm]         = useState({})
  const [payForm,setPayForm]   = useState({})
  const [saving,setSaving]     = useState(false)
  const f  = k=>v=>setForm(p=>({...p,[k]:v}))
  const pf = k=>v=>setPayForm(p=>({...p,[k]:v}))

  // ── Bulk add state ──
  const [bulkModal,setBulkModal]   = useState(false)
  const [bulkStep,setBulkStep]     = useState(1)
  const [bulkSaving,setBulkSaving] = useState(false)
  const BULK_INIT = {fee_type:'',period:'Semester 1',default_amount:'',selected_classes:[]}
  const [bulk,setBulk]             = useState(BULK_INIT)
  // Per-class amounts: { classId: amount string }
  const [classAmounts,setClassAmounts] = useState({})
  const bf = k=>v=>setBulk(p=>({...p,[k]:v}))

  // ── Derived: eligible classes (have at least 1 active non-withdrawn student) ──
  const activeStudents = students.filter(s=>!s.archived)
  const classesWithStudents = classes.filter(c=>activeStudents.some(s=>s.class_id===c.id))
  const hiddenClassCount = classes.length - classesWithStudents.length

  // ── Toggle class pill ──
  const toggleClass = cid => {
    setBulk(p=>{
      const sel = p.selected_classes.includes(cid)
        ? p.selected_classes.filter(x=>x!==cid)
        : [...p.selected_classes, cid]
      return {...p, selected_classes: sel}
    })
  }

  // ── Go to step 2: seed classAmounts with default ──
  const goToStep2 = () => {
    if(!bulk.fee_type||!bulk.period||!bulk.default_amount||bulk.selected_classes.length===0) return
    const init = {}
    bulk.selected_classes.forEach(cid=>{ init[cid] = bulk.default_amount })
    setClassAmounts(init)
    setBulkStep(2)
  }

  // ── Step 2 totals ──
  const step2Rows = bulk.selected_classes.map(cid=>{
    const cls = classes.find(c=>c.id===cid)
    const count = activeStudents.filter(s=>s.class_id===cid).length
    return {cid, cls, count, amount: classAmounts[cid]||''}
  })
  const step2TotalStudents = step2Rows.reduce((a,r)=>a+r.count,0)
  const step2TotalAmount   = step2Rows.reduce((a,r)=>a+(parseFloat(r.amount)||0)*r.count,0)

  // ── Step 3: compute duplicates ──
  const computeBulkPreview = () => {
    let toCreate = 0, toSkip = 0
    bulk.selected_classes.forEach(cid=>{
      activeStudents.filter(s=>s.class_id===cid).forEach(s=>{
        const already = fees.some(f=>
          f.student_id===s.id &&
          f.fee_type===bulk.fee_type &&
          f.period===bulk.period &&
          f.academic_year===activeYear
        )
        if(already) toSkip++; else toCreate++
      })
    })
    return {toCreate, toSkip}
  }

  // ── Confirm bulk add ──
  const confirmBulk = async () => {
    setBulkSaving(true)
    try {
      const rows = []
      bulk.selected_classes.forEach(cid=>{
        const amount = parseFloat(classAmounts[cid])||0
        activeStudents.filter(s=>s.class_id===cid).forEach(s=>{
          const already = fees.some(f=>
            f.student_id===s.id &&
            f.fee_type===bulk.fee_type &&
            f.period===bulk.period &&
            f.academic_year===activeYear
          )
          if(!already) rows.push({
            student_id: s.id,
            fee_type:   bulk.fee_type,
            amount,
            paid:       0,
            period:     bulk.period,
            academic_year: activeYear,
          })
        })
      })
      if(rows.length===0){
        toast('All selected students already have this fee — nothing to add.','error')
        setBulkSaving(false)
        return
      }
      const {data:inserted,error} = await supabase.from('fees').insert(rows).select()
      if(error) throw error
      setData(p=>({...p, fees:[...p.fees,...(inserted||[])]}))
      const {toSkip} = computeBulkPreview()
      const skippedNote = toSkip>0 ? ` (${toSkip} skipped — already existed)` : ''
      toast(`${rows.length} fee record${rows.length!==1?'s':''} added${skippedNote}`)
      setBulkModal(false)
      setBulkStep(1)
      setBulk(BULK_INIT)
      setClassAmounts({})
    } catch(err) {
      toast(err.message,'error')
    }
    setBulkSaving(false)
  }

  const closeBulk = () => { setBulkModal(false); setBulkStep(1); setBulk(BULK_INIT); setClassAmounts({}) }

  // ── Existing fee helpers ──
  const enriched = fees.map(fee=>{
    const s=students.find(x=>x.id===fee.student_id)
    const feePayments = payments.filter(p=>p.fee_id===fee.id)
    const paymentsPaid = feePayments.reduce((a,p)=>a+Number(p.amount||0),0)
    // Use whichever is higher — payments table total or legacy fee.paid
    const effectivePaid = Math.max(Number(fee.paid||0), paymentsPaid)
    const bal=Number(fee.amount||0)-effectivePaid
    const status=bal<=0?'Paid':effectivePaid>0?'Partial':'Outstanding'
    return{...fee,student_name:s?`${s.first_name} ${s.last_name}`:'--',balance:bal,effectivePaid,status,hasPayments:feePayments.length>0||effectivePaid>0}
  })
  const filtered = enriched.filter(r=>r.student_name.toLowerCase().includes(search.toLowerCase())&&(!fstatus||r.status===fstatus))
  const totalOwed = fees.reduce((s,f)=>s+Number(f.amount||0),0)
  const totalPaid = fees.reduce((s,f)=>s+Number(f.paid||0),0)
  const openAdd = ()=>{setForm({student_id:'',fee_type:'',amount:'',due_date:'',period:''});setModal(true)}
  const openPay = fee=>{setEditFee(fee);setPayForm({amount:fee.balance>0?fee.balance:''});setPayModal(true)}

  const saveFee = async ()=>{
    if(!form.student_id||!form.amount)return
    setSaving(true)
    const {data:row,error}=await supabase.from('fees').insert({student_id:form.student_id,fee_type:form.fee_type,amount:parseFloat(form.amount),paid:0,due_date:form.due_date,period:form.period||null,academic_year:activeYear}).select().single()
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,fees:[...p.fees,row]}));const s=students.find(x=>x.id===form.student_id);auditLog(profile,'Fees','Created',`${s?.first_name} ${s?.last_name} · ${form.fee_type} · ${fmtMoney(parseFloat(form.amount),currency)}`,{},null,row);toast('Fee record added');setModal(false)}
    setSaving(false)
  }

  const delFee = async id=>{
    if(!confirm('Remove this fee record? This cannot be undone.'))return
    const {error}=await supabase.from('fees').delete().eq('id',id)
    if(error)toast(error.message,'error')
    else{const fee=fees.find(x=>x.id===id);const s=students.find(x=>x.id===fee?.student_id);setData(p=>({...p,fees:p.fees.filter(f=>f.id!==id),payments:p.payments.filter(p=>p.fee_id!==id)}));auditLog(profile,'Fees','Deleted',`${s?.first_name} ${s?.last_name} · ${fee?.fee_type}`,{},fee,null);toast('Fee record removed')}
  }

  const recordPayment = async () => {
    if(!editFee) return
    const feePayments = payments.filter(p=>p.fee_id===editFee.id)
    const alreadyPaid = feePayments.reduce((a,p)=>a+Number(p.amount||0),0)
    const legacyPaid  = Math.max(0, Number(editFee.paid||0) - alreadyPaid)
    const currentPaid = alreadyPaid + legacyPaid
    const currentBalance = Number(editFee.amount||0) - currentPaid
    const amt = Math.min(parseFloat(payForm.amount)||0, currentBalance)
    if(amt<=0){ toast('Amount must be greater than zero','error'); return }
    const newCumPaid = currentPaid + amt
    const rcpt = genRCP([...fees, ...payments])
    // Insert payment record
    const {data:payRow, error:payErr} = await supabase.from('payments').insert({
      fee_id:          editFee.id,
      student_id:      editFee.student_id,
      amount:          amt,
      receipt_no:      rcpt,
      recorded_by_id:  profile?.id,
      recorded_by_name:profile?.full_name,
    }).select().single()
    if(payErr){ toast(payErr.message,'error'); return }
    // Update cumulative paid on fee record
    const {error:feeErr} = await supabase.from('fees').update({paid:newCumPaid, receipt_no:rcpt}).eq('id',editFee.id)
    if(feeErr){ toast(feeErr.message,'error'); return }
    const updatedFee = {...editFee, paid:newCumPaid, receipt_no:rcpt}
    setData(p=>({
      ...p,
      fees:     p.fees.map(f=>f.id===editFee.id ? updatedFee : f),
      payments: [payRow, ...p.payments],
    }))
    const pStudent=students.find(s=>s.id===editFee.student_id);auditLog(profile,'Fees','Payment',`${pStudent?.first_name} ${pStudent?.last_name} · ${fmtMoney(amt,currency)} · ${editFee.fee_type}`,{amount:amt,receipt:rcpt},null,null)
    toast('Payment recorded')
    setPayModal(false)
    // Auto-open receipt
    const student = students.find(s=>s.id===editFee.student_id)
    const cls     = classes.find(c=>c.id===student?.class_id)
    printReceipt({
      fee:         updatedFee,
      feePayments: [payRow, ...feePayments],
      student, cls, settings, currency,
    })
  }

  const openReceipt = (fee) => {
    const feePayments = payments.filter(p=>p.fee_id===fee.id)
    const student = students.find(s=>s.id===fee.student_id)
    const cls     = classes.find(c=>c.id===student?.class_id)
    printReceipt({fee, feePayments, student, cls, settings, currency})
  }

  // ── Step 3 preview values ──
  const {toCreate, toSkip} = bulkStep===3 ? computeBulkPreview() : {toCreate:0,toSkip:0}
  const step3TotalAmount = step2Rows.reduce((a,r)=>a+(parseFloat(r.amount)||0)*activeStudents.filter(s=>s.class_id===r.cid).filter(s=>{
    return !fees.some(f=>f.student_id===s.id&&f.fee_type===bulk.fee_type&&f.period===bulk.period&&f.academic_year===activeYear)
  }).length, 0)

  const step1Valid = bulk.fee_type && bulk.period && bulk.default_amount && bulk.selected_classes.length>0
  const step2Valid = step2Rows.every(r=>r.amount!==''&&parseFloat(r.amount)>0)

  return (
    <div>
      <PageHeader title='Fee Management' sub='Track payments, balances and receipts'>
        {!isViewingPast && canBulk && (
          <Btn variant='secondary' onClick={()=>{setBulkModal(true);setBulkStep(1);setBulk(BULK_INIT)}}>⊞ Bulk Add Fee</Btn>
        )}
        {!isViewingPast && <Btn onClick={openAdd}>+ Add Fee Record</Btn>}
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
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search student...' style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
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
          {key:'fee_type',label:'Fee Type',render:(v,r)=>(<div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}><span>{v}</span>{r.period&&<Badge color='var(--sky)' bg='rgba(91,168,245,0.08)'>{r.period}</Badge>}{r.is_arrear&&<Badge color='var(--amber)' bg='rgba(251,159,58,0.1)'>Arrear from {r.arrear_from_year}</Badge>}</div>)},
          {key:'amount', label:'Amount',  render:v=><span className='mono'>{fmtMoney(v,currency)}</span>},
          {key:'paid',   label:'Paid',    render:(_,r)=><span className='mono' style={{color:'var(--emerald)'}}>{fmtMoney(r.effectivePaid,currency)}</span>},
          {key:'balance',label:'Balance', render:v=><span className='mono' style={{color:v>0?'var(--rose)':'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
          {key:'status', label:'Status',  render:v=><Badge color={FEE_STATUS[v]?.color} bg={FEE_STATUS[v]?.bg}>{v}</Badge>},
          {key:'receipt_no',label:'Receipt',render:v=>v?<span className='mono' style={{fontSize:12,color:'var(--mist2)'}}>{v}</span>:'--'},
          {key:'id',label:'',render:(_,r)=>isViewingPast?null:(
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
              {r.balance>0 && <Btn size='sm' onClick={()=>openPay(r)}>Record Payment</Btn>}
              {r.hasPayments && <Btn variant='ghost' size='sm' onClick={()=>openReceipt(r)}>⎙ Receipt</Btn>}
              {r.balance<=0 && !r.hasPayments && <Badge color='var(--emerald)'>Paid</Badge>}
              {canBulk && <Btn variant='danger' size='sm' onClick={()=>delFee(r.id)}>Remove</Btn>}
            </div>
          )},
        ]}/>
      </Card>

      {/* ── Single Add Fee Modal ── */}
      {modal && (
        <Modal title='Add Fee Record' onClose={()=>setModal(false)}>
          <Field label='Student' value={form.student_id} onChange={f('student_id')} required options={students.filter(s=>!s.archived).map(s=>({value:s.id,label:`${s.first_name} ${s.last_name}`}))}/>
          <Field label='Fee Type' value={form.fee_type} onChange={f('fee_type')} placeholder='e.g. Tuition, Activity Fee' required/>
          <Field label='Period' value={form.period} onChange={f('period')} options={[{value:'Semester 1',label:'Semester 1'},{value:'Semester 2',label:'Semester 2'}]}/>
          <Field label='Amount' value={form.amount} onChange={f('amount')} type='number' required/>
          <Field label='Due Date' value={form.due_date} onChange={f('due_date')} type='date'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={saveFee} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Record Payment Modal ── */}
      {payModal && editFee && (
        <Modal title='Record Payment' subtitle={`${editFee.student_name} · ${editFee.fee_type}${editFee.period?' · '+editFee.period:''}`} onClose={()=>setPayModal(false)}>
          <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:18,marginBottom:20,display:'flex',gap:24,flexWrap:'wrap'}}>
            {[['Total',fmtMoney(editFee.amount,currency),'var(--mist)'],['Paid',fmtMoney(editFee.effectivePaid,currency),'var(--emerald)'],['Balance',fmtMoney(editFee.balance,currency),'var(--rose)']].map(([l,v,c])=>(
              <div key={l}><div className='d' style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>{l}</div><div className='d' style={{fontSize:20,fontWeight:700,color:c}}>{v}</div></div>
            ))}
          </div>
          <Field label='Payment Amount' value={payForm.amount} onChange={pf('amount')} type='number'/>
          <p style={{fontSize:11,color:'var(--mist3)',marginTop:-10,marginBottom:16}}>A receipt will open automatically after saving.</p>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setPayModal(false)}>Cancel</Btn>
            <Btn onClick={recordPayment}>Confirm Payment</Btn>
          </div>
        </Modal>
      )}

      {/* ── Bulk Add Fee Modal ── */}
      {bulkModal && (
        <Modal title='Bulk Add Fee' subtitle={`Step ${bulkStep} of 3`} onClose={closeBulk} width={560}>

          {/* ── STEP 1 ── */}
          {bulkStep===1 && (
            <div>
              <Field label='Fee Type' value={bulk.fee_type} onChange={bf('fee_type')} placeholder='e.g. Tuition, Feeding Fee, Books' required/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <Field label='Semester' value={bulk.period} onChange={bf('period')}
                  options={[{value:'Semester 1',label:'Semester 1'},{value:'Semester 2',label:'Semester 2'}]}/>
                <Field label='Default Amount' value={bulk.default_amount} onChange={bf('default_amount')} type='number' placeholder='0.00' required/>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,fontFamily:"'Clash Display',sans-serif"}}>
                  Select Classes <span style={{color:'var(--gold)',marginLeft:3}}>*</span>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {classesWithStudents.map(c=>{
                    const sel = bulk.selected_classes.includes(c.id)
                    const cnt = activeStudents.filter(s=>s.class_id===c.id).length
                    return (
                      <button key={c.id} onClick={()=>toggleClass(c.id)}
                        style={{
                          padding:'7px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',
                          transition:'all 0.15s',fontFamily:"'Cabinet Grotesk',sans-serif",
                          background: sel ? 'rgba(232,184,75,0.15)' : 'var(--ink4)',
                          color:      sel ? 'var(--gold)'           : 'var(--mist2)',
                          border:     `1px solid ${sel ? 'var(--gold)' : 'var(--line)'}`,
                          boxShadow:  sel ? '0 0 0 1px rgba(232,184,75,0.2)' : 'none',
                        }}>
                        {c.name}
                        <span style={{fontSize:10,marginLeft:6,opacity:0.7,fontWeight:400}}>({cnt})</span>
                      </button>
                    )
                  })}
                </div>
                {hiddenClassCount>0 && (
                  <div style={{marginTop:10,fontSize:11,color:'var(--mist3)'}}>
                    {hiddenClassCount} class{hiddenClassCount!==1?'es':''} hidden — no active students.
                  </div>
                )}
                {bulk.selected_classes.length>0 && (
                  <div style={{marginTop:10,fontSize:12,color:'var(--mist2)'}}>
                    <strong style={{color:'var(--white)'}}>{bulk.selected_classes.length}</strong> class{bulk.selected_classes.length!==1?'es':''} selected
                    {' · '}<strong style={{color:'var(--white)'}}>{activeStudents.filter(s=>bulk.selected_classes.includes(s.class_id)).length}</strong> students
                  </div>
                )}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={closeBulk}>Cancel</Btn>
                <Btn onClick={goToStep2} disabled={!step1Valid}>Next — Set Amounts &rarr;</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {bulkStep===2 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
                Each class has been pre-filled with your default amount. Adjust any that differ.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                {step2Rows.map(({cid,cls,count,amount})=>(
                  <div key={cid} style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap: isMobile?'wrap':'nowrap'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:14}}>{cls?.name||'--'}</div>
                        <div style={{fontSize:12,color:'var(--mist3)',marginTop:2}}>{count} active student{count!==1?'s':''}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                        <span style={{fontSize:12,color:'var(--mist3)',whiteSpace:'nowrap'}}>{currency.position==='before'?currency.symbol:''}</span>
                        <input
                          type='number'
                          value={amount}
                          onChange={e=>setClassAmounts(p=>({...p,[cid]:e.target.value}))}
                          style={{width:120,background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--white)',fontSize:14,textAlign:'right',fontFamily:"'Cabinet Grotesk',sans-serif"}}
                          onFocus={e=>{e.target.style.borderColor='var(--gold)';e.target.style.boxShadow='0 0 0 3px rgba(232,184,75,0.08)'}}
                          onBlur={e=>{e.target.style.borderColor='var(--line)';e.target.style.boxShadow='none'}}
                        />
                        {currency.position==='after'&&<span style={{fontSize:12,color:'var(--mist3)'}}>{currency.symbol}</span>}
                      </div>
                    </div>
                    {amount&&parseFloat(amount)>0&&(
                      <div style={{marginTop:8,fontSize:11,color:'var(--mist3)'}}>
                        Subtotal: <span style={{color:'var(--mist)'}}>{fmtMoney(parseFloat(amount)*count,currency)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Running total */}
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'14px 18px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontSize:11,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2,fontFamily:"'Clash Display',sans-serif"}}>Total Obligation</div>
                  <div className='d' style={{fontSize:22,fontWeight:700,color:'var(--gold)'}}>{fmtMoney(step2TotalAmount,currency)}</div>
                </div>
                <div style={{fontSize:12,color:'var(--mist3)',textAlign:'right'}}>
                  <div><strong style={{color:'var(--white)'}}>{step2TotalStudents}</strong> students</div>
                  <div><strong style={{color:'var(--white)'}}>{step2Rows.length}</strong> classes</div>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setBulkStep(1)}>&larr; Back</Btn>
                <Btn onClick={()=>setBulkStep(3)} disabled={!step2Valid}>Next — Preview &rarr;</Btn>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {bulkStep===3 && (
            <div>
              {/* Summary card */}
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14,fontFamily:"'Clash Display',sans-serif"}}>Summary</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px'}}>
                  {[
                    ['Fee Type',   bulk.fee_type],
                    ['Semester',   bulk.period],
                    ['Year',       activeYear],
                    ['Classes',    `${bulk.selected_classes.length} selected`],
                  ].map(([l,v])=>(
                    <div key={l}>
                      <div style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--line)',display:'flex',gap:24,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4,fontFamily:"'Clash Display',sans-serif"}}>Records to Create</div>
                    <div className='d' style={{fontSize:26,fontWeight:700,color:'var(--emerald)'}}>{toCreate}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4,fontFamily:"'Clash Display',sans-serif"}}>Total Amount</div>
                    <div className='d' style={{fontSize:26,fontWeight:700,color:'var(--gold)'}}>{fmtMoney(step3TotalAmount,currency)}</div>
                  </div>
                </div>
              </div>

              {/* Per-class breakdown */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8,fontFamily:"'Clash Display',sans-serif"}}>Per Class</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {step2Rows.map(({cid,cls,count,amount})=>(
                    <div key={cid} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--ink3)',borderRadius:'var(--r-sm)',fontSize:13}}>
                      <span style={{fontWeight:500}}>{cls?.name}</span>
                      <span style={{color:'var(--mist3)'}}>{count} students · <span style={{color:'var(--mist)'}}>{fmtMoney(parseFloat(amount)||0,currency)} each</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate warning */}
              {toSkip>0 && (
                <div style={{background:'rgba(251,159,58,0.06)',border:'1px solid rgba(251,159,58,0.25)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--amber)',display:'flex',gap:8,alignItems:'flex-start'}}>
                  <span style={{flexShrink:0}}>(!)</span>
                  <span><strong>{toSkip} student{toSkip!==1?'s':''}</strong> already have <em>{bulk.fee_type}</em> for {bulk.period} and will be skipped.</span>
                </div>
              )}

              {toCreate===0 && (
                <div style={{background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.25)',borderRadius:'var(--r-sm)',padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--rose)',display:'flex',gap:8}}>
                  <span>(!)</span>
                  <span>All selected students already have this fee. Nothing will be created.</span>
                </div>
              )}

              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setBulkStep(2)}>&larr; Back</Btn>
                <Btn onClick={confirmBulk} disabled={bulkSaving||toCreate===0}>
                  {bulkSaving?<><Spinner/> Adding...</>:`Confirm — Add ${toCreate} Record${toCreate!==1?'s':''}`}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

// ── BEHAVIOUR ──────────────────────────────────────────────────
function Behaviour({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
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
    const {data:row,error}=await supabase.from('behaviour').insert({...form,recorded_by_id:profile?.id,recorded_by_name:profile?.full_name,academic_year:activeYear}).select().single()
    if(error)toast(error.message,'error')
    else{setData(p=>({...p,behaviour:[row,...p.behaviour]}));const s=students.find(x=>x.id===form.student_id);auditLog(profile,'Behaviour','Created',`${s?.first_name} ${s?.last_name} · ${form.type} · ${form.title}`,{},null,row);toast('Record added');setModal(false)}
    setSaving(false)
  }
  const del = async id=>{
    if(!confirm('Remove this record?'))return
    const {error}=await supabase.from('behaviour').delete().eq('id',id)
    if(error)toast(error.message,'error')
    else{const rec=behaviour.find(x=>x.id===id);const s=students.find(x=>x.id===rec?.student_id);setData(p=>({...p,behaviour:p.behaviour.filter(b=>b.id!==id)}));auditLog(profile,'Behaviour','Deleted',`${s?.first_name} ${s?.last_name} · ${rec?.type} · ${rec?.title}`,{},rec,null);toast('Record removed')}
  }
  return (
    <div>
      <PageHeader title='Behaviour & Extracurricular' sub='Discipline, achievements and co-curricular records'>
        {!isViewingPast && <Btn onClick={openAdd}>+ Add Record</Btn>}
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
                      {s&&<><span style={{color:'var(--mist2)',fontWeight:500}}>{s.first_name} {s.last_name}</span> . </>}
                      Recorded by {b.recorded_by_name} . {fmtDate(b.date||b.created_at)}
                    </div>
                  </div>
                  {!isViewingPast && <button onClick={()=>del(b.id)} style={{background:'none',color:'var(--mist3)',fontSize:16,padding:'4px 8px',borderRadius:4,cursor:'pointer',transition:'all 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.color='var(--rose)';e.currentTarget.style.background='rgba(240,107,122,0.1)'}}
                    onMouseLeave={e=>{e.currentTarget.style.color='var(--mist3)';e.currentTarget.style.background='none'}}>×</button>}
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
          <Field label='Description' value={form.description} onChange={f('description')} rows={3} placeholder='Provide full details...'/>
          <Field label='Date' value={form.date} onChange={f('date')} type='date'/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Record'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── ORDINAL HELPER ─────────────────────────────────────────────
const ordinal = n => {
  const s=['th','st','nd','rd'], v=n%100
  return n+(s[(v-20)%10]||s[v]||s[0])
}
// Auto-abbreviate subject names: multi-word → initials, single-word → first 4 chars
const abbrSubject = name => {
  if(!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if(words.length>=2) return words.map(w=>w[0].toUpperCase()).join('')
  return name.slice(0,4).toUpperCase()
}

// ── REPORTS ────────────────────────────────────────────────────
function Reports({profile,data,settings,activeYear,isViewingPast}) {
  const {students=[],grades=[],attendance=[],fees=[],classes=[],subjects=[],enrolments=[]} = data
  const scale      = settings?.grading_scale||[]
  const gradeComps = getGradeComponents(settings)
  const currency   = getCurrency(settings)
  const schoolLogo = settings?.school_logo||null
  const schoolName = settings?.school_name||'SRMS'
  const schoolMotto= settings?.motto||''

  const [rtype,setRtype]         = useState('academic')
  const [fc,setFc]               = useState('')
  const [fp,setFp]               = useState('')
  // Year is controlled globally via activeYear prop (topbar switcher)
  const [studentSearch,setStudentSearch] = useState('')
  const [selectedStudent,setSelectedStudent] = useState(null)
  const [showDropdown,setShowDropdown]   = useState(false)
  const [fsub,setFsub]                   = useState('') // subject filter for teacher

  // Role-based scoping
  const isClassTeacher = profile?.role === 'classteacher'
  const isTeacher      = profile?.role === 'teacher'
  const isAdmin        = ['superadmin','admin'].includes(profile?.role)
  // Allowed report tabs
  const allowedTabs = isClassTeacher
    ? ['academic','attendance','reportcards']
    : isTeacher
      ? ['academic','reportcards']
      : ['academic','attendance','fees','reportcards']

  // Report cards state
  const [rcClass,setRcClass]         = useState(isClassTeacher ? profile?.class_id||'' : isTeacher ? (subjects.filter(s=>s.teacher_id===profile?.id)[0]?.class_id||'') : '')
  const [rcPeriod,setRcPeriod]       = useState('')
  const [rcType,setRcType]           = useState('broadsheet')
  const [rcSubject,setRcSubject]     = useState('')
  const [rcStudent,setRcStudent]     = useState('')
  const [rcRemarks,setRcRemarks]     = useState({}) // {studentId: remark}
  const [rcHeadRemark,setRcHeadRemark] = useState('')
  const [rcResumption,setRcResumption] = useState('')
  const [rcHeadTeacher,setRcHeadTeacher] = useState('')
  const [rcStamp,setRcStamp]         = useState(false)
  const [rcClassTeacherName,setRcClassTeacherName] = useState('')
  // Pre-filter class teacher to their class; subject teacher to their teaching classes
  const teacherClassIds = isTeacher ? [...new Set(subjects.filter(s=>s.teacher_id===profile?.id).map(s=>s.class_id))] : null

  const periodLabel = settings?.period_type==='term'?'Term':'Semester'
  const periods = Array.from({length:settings?.period_count||2},(_,i)=>`${periodLabel} ${i+1}`)

  // Student autofill -- restrict pool by role
  const roleBasePool = isClassTeacher
    ? students.filter(s=>s.class_id===profile?.class_id)
    : isTeacher && teacherClassIds
      ? students.filter(s=>teacherClassIds.includes(s.class_id))
      : students
  const searchPool = fc ? roleBasePool.filter(s=>s.class_id===fc) : roleBasePool
  const matchedStudents = studentSearch.length>0
    ? searchPool.filter(s=>`${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())).slice(0,8)
    : []

  const selectStudent = s => {
    setSelectedStudent(s)
    setStudentSearch(`${s.first_name} ${s.last_name}`)
    setShowDropdown(false)
    setFc('') // student overrides class filter
  }
  const clearStudent = () => { setSelectedStudent(null); setStudentSearch(''); setShowDropdown(false) }

  // Scope: use enrolment records for past years so students show in their year's class
  const enrolmentMap = enrolments.reduce((acc,e)=>{acc[e.student_id]=e.class_id;return acc},{})
  const studentsWithYearClass = enrolments.length>0
    ? roleBasePool.filter(s=>enrolmentMap[s.id]).map(s=>({...s,class_id:enrolmentMap[s.id]}))
    : roleBasePool.filter(s=>!s.archived)
  const scopedStudents = selectedStudent
    ? studentsWithYearClass.filter(s=>s.id===selectedStudent.id)
    : studentsWithYearClass.filter(s=>!fc||s.class_id===fc)

  // ── Academic data ──
  // For trend: compare the two most recent periods that have data for each student
  const allPeriods = Array.from({length:settings?.period_count||2},(_,i)=>`${periodLabel} ${i+1}`)
  const getTrendArrow = (studentId) => {
    if(allPeriods.length < 2) return null
    // Find periods that actually have grade data for this student
    const periodsWithData = allPeriods.filter(p=>grades.some(g=>g.student_id===studentId&&g.period===p))
    if(periodsWithData.length < 2) return null
    // Use the two most recent
    const p1 = periodsWithData[periodsWithData.length-2]
    const p2 = periodsWithData[periodsWithData.length-1]
    const g1 = grades.filter(g=>g.student_id===studentId&&g.period===p1)
    const g2 = grades.filter(g=>g.student_id===studentId&&g.period===p2)
    const t1 = g1.map(g=>calcTotal(g,gradeComps)).reduce((a,b)=>a+b,0)
    const t2 = g2.map(g=>calcTotal(g,gradeComps)).reduce((a,b)=>a+b,0)
    const diff = t2 - t1
    if(diff > 0) return {arrow:'↑', color:'var(--emerald)', diff:`+${diff} vs ${p1}`, p1, p2}
    if(diff < 0) return {arrow:'↓', color:'var(--rose)', diff:`${diff} vs ${p1}`, p1, p2}
    return {arrow:'→', color:'var(--mist3)', diff:`No change vs ${p1}`, p1, p2}
  }
  const academicData = scopedStudents.map(s=>{
    const sg = grades.filter(g=>g.student_id===s.id&&(!fp||g.period===fp))
    // Per-subject scores
    const subjectScores = {}
    sg.forEach(g=>{ subjectScores[g.subject_id] = calcTotal(g,gradeComps) })
    const tots = Object.values(subjectScores)
    const total = tots.length ? tots.reduce((a,b)=>a+b,0) : null
    const avg   = tots.length ? Math.round(total/tots.length) : null
    const remark= avg!==null ? getGradeRemark(avg,scale) : '--'
    const trend = !fp ? getTrendArrow(s.id) : null
    return {...s, subjectScores, total: total||0, avg, remark, trend, count:sg.length, letter:avg!==null?getLetter(avg,scale):'--', pass:avg!==null?avg>=50:null}
  })
  // Sort by total descending for ranking
  const sortedAcademic = [...academicData].sort((a,b)=>(b.total||0)-(a.total||0))
  // Assign positions (shared rank for ties)
  let pos=1
  const rankedAcademic = sortedAcademic.map((s,i)=>{
    if(i>0 && s.total===sortedAcademic[i-1].total) return {...s,position:sortedAcademic[i-1].position}
    const p=pos; pos=i+2; return {...s,position:p}
  })
  // If single student, show their rank in class
  const studentRankInClass = selectedStudent
    ? (() => {
        const classStudents = students.filter(s=>s.class_id===selectedStudent.class_id)
        const allAcad = classStudents.map(s=>{
          const sg=grades.filter(g=>g.student_id===s.id&&(!fp||g.period===fp))
          const tots=sg.map(g=>calcTotal(g,gradeComps))
          const total=tots.length?tots.reduce((a,b)=>a+b,0):0
          return {id:s.id,total}
        }).sort((a,b)=>b.total-a.total)
        let rpos=1
        const ranked=allAcad.map((s,i)=>{
          if(i>0&&s.total===allAcad[i-1].total) return {...s,pos:allAcad[i-1].pos}
          const p=rpos; rpos=i+2; return {...s,pos:p}
        })
        return ranked.find(s=>s.id===selectedStudent.id)?.pos||null
      })()
    : null

  // Class subjects for ranked table
  // For class teacher: use their assigned class_id when no fc or selectedStudent
  const effectiveClassId = fc || (selectedStudent?.class_id) || (isClassTeacher ? profile?.class_id : null)
  const allClassSubjects = effectiveClassId
    ? subjects.filter(s=>s.class_id===effectiveClassId)
    : []
  // Subject teacher only sees their own subjects; optionally filtered further by fsub
  const teacherSubjects = isTeacher
    ? allClassSubjects.filter(s=>s.teacher_id===profile?.id)
    : allClassSubjects
  const classSubjects = fsub
    ? teacherSubjects.filter(s=>s.id===fsub)
    : teacherSubjects

  // ── Attendance data ──
  const attData = scopedStudents.map(s=>{
    const sa=attendance.filter(a=>a.student_id===s.id)
    const pres=sa.filter(a=>a.status==='Present').length
    return{...s,total:sa.length,present:pres,absent:sa.filter(a=>a.status==='Absent').length,late:sa.filter(a=>a.status==='Late').length,excused:sa.filter(a=>a.status==='Excused').length,rate:sa.length?Math.round(pres/sa.length*100):null}
  })

  // ── Fee data ──
  const feeData = scopedStudents.map(s=>{
    const sf=fees.filter(f=>f.student_id===s.id)
    const owed=sf.reduce((a,f)=>a+Number(f.amount||0),0)
    const paid=sf.reduce((a,f)=>a+Number(f.paid||0),0)
    return{...s,owed,paid,balance:owed-paid,feeStatus:owed===0?'--':paid>=owed?'Paid':paid>0?'Partial':'Outstanding'}
  })

  // ── Summary KPIs ──
  const withAvg   = academicData.filter(s=>s.avg!==null)
  const passRate  = withAvg.length?Math.round(withAvg.filter(s=>s.pass).length/withAvg.length*100):0
  const withRate  = attData.filter(s=>s.rate!==null)
  const avgAtt    = withRate.length?Math.round(withRate.reduce((a,s)=>a+s.rate,0)/withRate.length):0
  const totalF    = feeData.reduce((a,s)=>a+s.owed,0)
  const totalP    = feeData.reduce((a,s)=>a+s.paid,0)

  // ── Excel Export ──
  const exportExcel = () => {
    try {
      let csv='', filename=''
      const scope=selectedStudent?`${selectedStudent.first_name}_${selectedStudent.last_name}`:fc?classes.find(c=>c.id===fc)?.name?.replace(/\s+/g,'_'):'All'

      if(rtype==='reportcards'){
        // Export broadsheet data for selected class
        if(!rcClass) { return }
        const rcClassSubjects = subjects.filter(s=>s.class_id===rcClass)
        const rcClassStudents = students.filter(s=>s.class_id===rcClass&&!s.archived)
        const rcRanked = [...rcClassStudents]
          .map(s=>{
            const sg=grades.filter(g=>g.student_id===s.id&&(!rcPeriod||g.period===rcPeriod))
            const scores={}
            sg.forEach(g=>{ scores[g.subject_id]=calcTotal(g,gradeComps) })
            const tots=Object.values(scores)
            const total=tots.length?tots.reduce((a,b)=>a+b,0):null
            const avg=tots.length?Math.round(total/tots.length):null
            return {...s,scores,total:total||0,avg,letter:avg!==null?getLetter(avg,scale):'--',remark:avg!==null?getGradeRemark(avg,scale):'',pass:avg!==null?avg>=50:null}
          })
          .sort((a,b)=>(b.total||0)-(a.total||0))
          .map((s,i)=>({...s,position:i+1}))
        csv='Position,Student ID,Student,'+rcClassSubjects.map(s=>`"${s.name}"`).join(',')+',Total,Average,Grade,Remark,Status\n'
        rcRanked.forEach(s=>{
          csv+=`${ordinal(s.position)},"${s.student_id}","${s.first_name} ${s.last_name}",`
          csv+=rcClassSubjects.map(sub=>s.scores[sub.id]??'--').join(',')
          csv+=`,${s.total||0},${s.avg??0},${s.letter},"${s.remark}",${s.pass===null?'--':s.pass?'Pass':'Fail'}\n`
        })
        const cls=classes.find(c=>c.id===rcClass)
        filename=`SRMS_Broadsheet_${cls?.name?.replace(/\s+/g,'_')||'Class'}_${rcPeriod||'AllPeriods'}.csv`
      } else if(rtype==='academic'){
        if(selectedStudent){
          csv='Subject,'+gradeComps.filter(c=>c.enabled).map(c=>c.label).join(',')+',Total,Grade,Remark,Status\n'
          grades.filter(g=>g.student_id===selectedStudent.id&&(!fp||g.period===fp)).forEach(g=>{
            const subj=subjects.find(s=>s.id===g.subject_id)
            const tot=calcTotal(g,gradeComps), let_=getLetter(tot,scale), rem=getGradeRemark(tot,scale)
            csv+=`"${subj?.name||'--'}",${gradeComps.filter(c=>c.enabled).map(c=>g[c.key]||0).join(',')},${tot},${let_},"${rem}",${tot>=50?'Pass':'Fail'}\n`
          })
        } else {
          const visSubjects=classSubjects.length>0?classSubjects:subjects
          csv='Position,Student ID,Student,'+visSubjects.map(s=>`"${s.name}"`).join(',')
          // Add component columns per subject
          visSubjects.forEach(sub=>{
            gradeComps.filter(c=>c.enabled).forEach(c=>{ csv+=`,"${sub.name} - ${c.label}"` })
          })
          csv+=',Total,Average,Grade,Remark,Status\n'
          rankedAcademic.forEach(s=>{
            let row=`${ordinal(s.position)},"${s.student_id}","${s.first_name} ${s.last_name}"`
            visSubjects.forEach(sub=>{
              const g=grades.find(gr=>gr.student_id===s.id&&gr.subject_id===sub.id&&(!fp||gr.period===fp))
              gradeComps.filter(c=>c.enabled).forEach(c=>{ row+=`,${g?g[c.key]||0:'--'}` })
            })
            row+=`,${s.total||0},${s.avg??0},${s.letter},"${s.remark||''}",${s.pass===null?'--':s.pass?'Pass':'Fail'}\n`
            csv+=row
          })
        }
        filename=`SRMS_Academic_${scope}_${fp||'AllPeriods'}.csv`
      } else if(rtype==='attendance'){
        csv='Student ID,Student,Class,Total Days,Present,Absent,Late,Excused,Rate\n'
        attData.forEach(s=>{csv+=`"${s.student_id}","${s.first_name} ${s.last_name}","${classes.find(c=>c.id===s.class_id)?.name||'--'}",${s.total},${s.present},${s.absent},${s.late},${s.excused},${s.rate!==null?s.rate+'%':'--'}\n`})
        filename=`SRMS_Attendance_${scope}.csv`
      } else {
        csv='Student ID,Student,Class,Total Owed,Paid,Balance,Status\n'
        feeData.forEach(s=>{csv+=`"${s.student_id}","${s.first_name} ${s.last_name}","${classes.find(c=>c.id===s.class_id)?.name||'--'}","${fmtMoney(s.owed,currency)}","${fmtMoney(s.paid,currency)}","${fmtMoney(s.balance,currency)}",${s.feeStatus}\n`})
        filename=`SRMS_Fees_${scope}.csv`
      }
      const blob=new Blob([csv],{type:'text/csv'})
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a'); a.href=url; a.download=filename; a.click()
      URL.revokeObjectURL(url)
    } catch(e){ console.error(e) }
  }

  const scopeLabel = selectedStudent
    ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
    : fc ? classes.find(c=>c.id===fc)?.name : 'All Students'

  return (
    <div>
      <PageHeader title='Reports & Analytics' sub={`Viewing: ${scopeLabel}`}>
        {isAdmin && rtype!=='reportcards' && <Btn variant='ghost' onClick={exportExcel}>⬇ Export Excel</Btn>}
      </PageHeader>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16,marginBottom:24}}>
        {/* Admin/superadmin — full KPIs */}
        {isAdmin && <>
          <KPI label='Pass Rate'      value={`${passRate}%`}   color='var(--emerald)' index={0}/>
          <KPI label='Avg Attendance' value={`${avgAtt}%`}     color='var(--sky)'     index={1}/>
          <KPI label='Fee Collection' value={`${totalF?Math.round(totalP/totalF*100):0}%`} color='var(--gold)' sub={fmtMoney(totalP,currency)} index={2}/>
          <KPI label='Students'       value={scopedStudents.length} color='var(--amber)' index={3}/>
        </>}
        {/* Class teacher — class-scoped, no fees */}
        {isClassTeacher && <>
          <KPI label='Pass Rate'      value={`${passRate}%`}   color='var(--emerald)' index={0}/>
          <KPI label='Avg Attendance' value={`${avgAtt}%`}     color='var(--sky)'     index={1}/>
          <KPI label='Students'       value={scopedStudents.length} color='var(--amber)' index={2}/>
        </>}
        {/* Subject teacher — academic only */}
        {isTeacher && <>
          <KPI label='Pass Rate'      value={`${passRate}%`}   color='var(--emerald)' index={0}/>
          <KPI label='Students'       value={scopedStudents.length} color='var(--sky)'  index={1}/>
        </>}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:4,width:'fit-content'}}>
        {allowedTabs.map(t=>(
          <button key={t} onClick={()=>setRtype(t)} style={{padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,background:rtype===t?'var(--ink4)':'transparent',color:rtype===t?'var(--white)':'var(--mist2)',border:rtype===t?'1px solid var(--line)':'1px solid transparent',transition:'all 0.15s',cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif"}}>
            {t==='reportcards'?'Report Cards':t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters + Tables — hidden on report cards tab */}
      {rtype!=='reportcards' && <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          {/* Student search with autofill */}
          <div style={{position:'relative',flex:'1 1 220px'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--mist3)',fontSize:14,zIndex:1}}>⌕</span>
            <input
              value={studentSearch}
              onChange={e=>{setStudentSearch(e.target.value);setShowDropdown(true);if(!e.target.value)clearStudent()}}
              onFocus={()=>studentSearch&&setShowDropdown(true)}
              onBlur={()=>setTimeout(()=>setShowDropdown(false),200)}
              placeholder='Search student...'
              style={{width:'100%',background:'var(--ink3)',border:`1px solid ${selectedStudent?'var(--gold)':'var(--line)'}`,borderRadius:'var(--r-sm)',padding:'8px 14px 8px 36px',color:'var(--white)',fontSize:13}}/>
            {selectedStudent && (
              <button onClick={clearStudent} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',color:'var(--mist3)',fontSize:16,cursor:'pointer'}}>×</button>
            )}
            {showDropdown && matchedStudents.length>0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',zIndex:100,marginTop:4,boxShadow:'0 8px 24px rgba(0,0,0,0.4)',overflow:'hidden'}}>
                {matchedStudents.map(s=>(
                  <div key={s.id} onMouseDown={()=>selectStudent(s)}
                    style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <Avatar name={`${s.first_name} ${s.last_name}`} size={26}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{s.first_name} {s.last_name}</div>
                      <div style={{fontSize:11,color:'var(--mist3)'}}>{classes.find(c=>c.id===s.class_id)?.name||'--'} . {s.student_id}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Class filter -- disabled when student selected */}
          {!selectedStudent && !isClassTeacher && (
            <select value={fc} onChange={e=>setFc(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:180}}>
              <option value=''>All Classes</option>
              {(isTeacher && teacherClassIds ? classes.filter(c=>teacherClassIds.includes(c.id)) : classes).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {rtype==='academic' && (
            <select value={fp} onChange={e=>setFp(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
              <option value=''>All Periods</option>
              {periods.map(p=><option key={p}>{p}</option>)}
            </select>
          )}
          {rtype==='academic' && isTeacher && effectiveClassId && (
            <select value={fsub} onChange={e=>setFsub(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
              <option value=''>All My Subjects</option>
              {teacherSubjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)'}}>
            <span style={{fontSize:11,color:'var(--mist3)'}}>Year:</span>
            <span style={{fontSize:13,fontWeight:600,color:'var(--gold)'}}>{activeYear}</span>
            {isViewingPast && <span style={{fontSize:10,color:'var(--amber)'}}>Switch year in topbar</span>}
          </div>
        </div>

        {/* Active scope indicators */}
        {(selectedStudent||fc) && (
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            {selectedStudent && <Badge color='var(--gold)' bg='rgba(232,184,75,0.1)'>Student: {selectedStudent.first_name} {selectedStudent.last_name}</Badge>}
            {fc && !selectedStudent && <Badge color='var(--sky)' bg='rgba(91,168,245,0.1)'>Class: {classes.find(c=>c.id===fc)?.name}</Badge>}
            {selectedStudent && rtype==='academic' && studentRankInClass && (
              <Badge color='var(--emerald)' bg='rgba(45,212,160,0.1)'>Class Position: {ordinal(studentRankInClass)}</Badge>
            )}
          </div>
        )}
      </Card>}

      {/* Prompt if no class selected on academic tab */}
      {rtype!=='reportcards' && rtype==='academic' && !selectedStudent && !fc && !isClassTeacher && (
        <div style={{background:'rgba(232,184,75,0.04)',border:'1px solid rgba(232,184,75,0.15)',borderRadius:'var(--r)',padding:'32px 20px',marginBottom:16,fontSize:13,color:'var(--mist2)',display:'flex',flexDirection:'column',alignItems:'center',gap:8,textAlign:'center'}}>
          <span style={{fontSize:28}}>📊</span>
          <span style={{fontWeight:600,color:'var(--mist)'}}>Select a class to view the academic report</span>
          <span style={{fontSize:12,color:'var(--mist3)'}}>Use the class filter above, or search for a specific student</span>
        </div>
      )}
      {rtype!=='reportcards' && rtype!=='academic' && !selectedStudent && !fc && (
        <div style={{background:'rgba(232,184,75,0.04)',border:'1px solid rgba(232,184,75,0.15)',borderRadius:'var(--r)',padding:'14px 20px',marginBottom:16,fontSize:13,color:'var(--mist2)',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:16}}>💡</span>
          Select a class or search for a student to filter. Showing all students.
        </div>
      )}

      {/* Tables */}
      {rtype!=='reportcards' && <Card>
        {rtype==='academic' && (
          <>
            {!selectedStudent && (effectiveClassId || academicData.length>0) && (
              <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>Ranked by total score</span>
                {classSubjects.length>0 && <span style={{fontSize:11,color:'var(--mist3)'}}>. {classSubjects.length} subjects</span>}
              </div>
            )}
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:selectedStudent?400:600}}>
                <thead>
                  <tr style={{borderBottom:'1px solid var(--line)'}}>
                    {!selectedStudent && <th style={thStyle}>Position</th>}
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Student</th>
                    {!selectedStudent && !isClassTeacher && <th style={thStyle}>Class</th>}
                    {selectedStudent
                      ? <><th style={thStyle}>Subject</th>{gradeComps.filter(c=>c.enabled).map(c=><th key={c.key} style={thStyle}>{c.label}</th>)}</>
                      : classSubjects.map(s=>(
                          <th key={s.id} style={{...thStyle,maxWidth:70,textAlign:'center'}} title={s.name}>
                            {abbrSubject(s.name)}
                          </th>
                        ))
                    }
                    <th style={thStyle}>Total</th>
                    {!selectedStudent && <th style={thStyle}>Avg</th>}
                    <th style={thStyle}>Grade</th>
                    <th style={thStyle}>Remark</th>
                    {!selectedStudent && !fp && <th style={thStyle}>Trend</th>}
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudent ? (
                    grades.filter(g=>g.student_id===selectedStudent.id&&(!fp||g.period===fp)).length===0
                      ? <tr><td colSpan={20} style={{padding:48,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No grade records found for this student.</td></tr>
                      : grades.filter(g=>g.student_id===selectedStudent.id&&(!fp||g.period===fp)).map((g,i)=>{
                          const subj=subjects.find(s=>s.id===g.subject_id)
                          const tot=calcTotal(g,gradeComps), let_=getLetter(tot,scale)
                          return (
                            <tr key={g.id} style={{borderBottom:'1px solid var(--line)',background:i%2===0?'transparent':'var(--ink3)'}}>
                              <td style={tdStyle}><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{selectedStudent.student_id}</span></td>
                              <td style={tdStyle}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={`${selectedStudent.first_name} ${selectedStudent.last_name}`} size={24} photo={selectedStudent.photo}/><span style={{fontWeight:600}}>{selectedStudent.first_name} {selectedStudent.last_name}</span></div></td>
                              <td style={tdStyle}>{subj?.name||'--'}</td>
                              {gradeComps.filter(c=>c.enabled).map(c=><td key={c.key} style={tdStyle}><span className='mono'>{g[c.key]||0}</span></td>)}
                              <td style={tdStyle}><span className='mono' style={{fontWeight:700,fontSize:14}}>{tot}</span></td>
                              <td style={tdStyle}><Badge color={LETTER_COLOR[let_]||'var(--mist2)'}>{let_}</Badge></td>
                              <td style={tdStyle}><span style={{fontSize:12,color:'var(--mist2)'}}>{getGradeRemark(tot,scale)||'--'}</span></td>
                              <td style={tdStyle}>{tot>=50?<Badge color='var(--emerald)'>Pass</Badge>:<Badge color='var(--rose)'>Fail</Badge>}</td>
                            </tr>
                          )
                        })
                  ) : (
                    !fc && !selectedStudent && !isClassTeacher
                      ? <tr><td colSpan={20} style={{padding:48,textAlign:'center',color:'var(--mist3)',fontSize:13}}>Select a class to view the academic report.</td></tr>
                      : rankedAcademic.length===0
                        ? <tr><td colSpan={20} style={{padding:48,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No grade records found for this class.</td></tr>
                        : rankedAcademic.map((s,i)=>(
                            <tr key={s.id} style={{borderBottom:'1px solid var(--line)',background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                              <td style={tdStyle}>
                                <span style={{fontWeight:700,color:s.position<=3?'var(--gold)':'var(--mist2)',fontSize:13}}>{ordinal(s.position)}</span>
                              </td>
                              <td style={tdStyle}><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{s.student_id}</span></td>
                              <td style={tdStyle}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={`${s.first_name} ${s.last_name}`} size={26} photo={s.photo}/><span style={{fontWeight:600}}>{s.first_name} {s.last_name}</span></div></td>
                              {!isClassTeacher && <td style={tdStyle}>{classes.find(c=>c.id===s.class_id)?.name||'--'}</td>}
                              {classSubjects.map(sub=>{
                                const score=s.subjectScores[sub.id]
                                const scoreColor=score!==undefined?(score<50?'var(--rose)':score>=75?'var(--emerald)':'var(--white)'):'var(--mist3)'
                                return <td key={sub.id} style={{...tdStyle,textAlign:'center'}}><span className='mono' style={{color:scoreColor,fontWeight:score!==undefined?600:400}}>{score??'--'}</span></td>
                              })}
                              <td style={tdStyle}><span className='mono' style={{fontWeight:700}}>{s.total||'--'}</span></td>
                              <td style={tdStyle}><span className='mono'>{s.avg??'--'}</span></td>
                              <td style={tdStyle}>{s.letter!=='--'?<Badge color={LETTER_COLOR[s.letter]||'var(--mist2)'}>{s.letter}</Badge>:'--'}</td>
                              <td style={tdStyle}><span style={{fontSize:12,color:'var(--mist2)'}}>{s.remark||'--'}</span></td>
                              {!fp && <td style={tdStyle}>{s.trend ? <span style={{fontWeight:700,color:s.trend.color,fontSize:14}} title={s.trend.diff}>{s.trend.arrow}</span> : <span style={{color:'var(--mist3)'}}>--</span>}</td>}
                              <td style={tdStyle}>{s.pass===null?'--':s.pass?<Badge color='var(--emerald)'>Pass</Badge>:<Badge color='var(--rose)'>Fail</Badge>}</td>
                            </tr>
                          ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        {rtype==='attendance' && (
          <DataTable data={attData} columns={[
            {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
            {key:'first_name',label:'Student',render:(v,r)=><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={`${r.first_name} ${r.last_name}`} size={28}/><span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span></div>},
            {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'--'},
            {key:'total',label:'Days'},
            {key:'present',label:'Present',render:v=><span style={{color:'var(--emerald)',fontWeight:600}}>{v}</span>},
            {key:'absent',label:'Absent',render:v=><span style={{color:'var(--rose)',fontWeight:600}}>{v}</span>},
            {key:'late',label:'Late',render:v=><span style={{color:'var(--amber)',fontWeight:600}}>{v}</span>},
            {key:'excused',label:'Excused',render:v=><span style={{color:'var(--sky)',fontWeight:600}}>{v}</span>},
            {key:'rate',label:'Rate',render:v=>v!==null?<span className='mono' style={{fontWeight:700,color:v>=80?'var(--emerald)':v>=60?'var(--amber)':'var(--rose)'}}>{v}%</span>:'--'},
          ]}/>
        )}
        {rtype==='fees' && (
          <DataTable data={feeData} columns={[
            {key:'student_id',label:'ID',render:v=><span className='mono' style={{color:'var(--gold2)',fontSize:12}}>{v}</span>},
            {key:'first_name',label:'Student',render:(v,r)=><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={`${r.first_name} ${r.last_name}`} size={28}/><span style={{fontWeight:600}}>{r.first_name} {r.last_name}</span></div>},
            {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'--'},
            {key:'owed',label:'Owed',render:v=><span className='mono'>{fmtMoney(v,currency)}</span>},
            {key:'paid',label:'Paid',render:v=><span className='mono' style={{color:'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
            {key:'balance',label:'Balance',render:v=><span className='mono' style={{color:v>0?'var(--rose)':'var(--emerald)'}}>{fmtMoney(v,currency)}</span>},
            {key:'feeStatus',label:'Status',render:v=>v!=='--'?<Badge color={FEE_STATUS[v]?.color} bg={FEE_STATUS[v]?.bg}>{v}</Badge>:'--'},
          ]}/>
        )}
      </Card>}

      {/* ── REPORT CARDS TAB ── */}
      {rtype==='reportcards' && (
        <ReportCards
          profile={profile}
          data={data}
          settings={settings}
          activeYear={activeYear}
          rcClass={rcClass} setRcClass={setRcClass}
          rcPeriod={rcPeriod} setRcPeriod={setRcPeriod}
          rcType={rcType} setRcType={setRcType}
          rcSubject={rcSubject} setRcSubject={setRcSubject}
          rcStudent={rcStudent} setRcStudent={setRcStudent}
          rcRemarks={rcRemarks} setRcRemarks={setRcRemarks}
          rcHeadRemark={rcHeadRemark} setRcHeadRemark={setRcHeadRemark}
          rcResumption={rcResumption} setRcResumption={setRcResumption}
          rcHeadTeacher={rcHeadTeacher} setRcHeadTeacher={setRcHeadTeacher}
          rcStamp={rcStamp} setRcStamp={setRcStamp}
          rcClassTeacherName={rcClassTeacherName} setRcClassTeacherName={setRcClassTeacherName}
          exportExcel={exportExcel}
        />
      )}
    </div>
  )
}
// Table cell styles used in reports
const thStyle={padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',whiteSpace:'nowrap',fontFamily:"'Clash Display',sans-serif",background:'var(--ink3)'}
const tdStyle={padding:'11px 12px',fontSize:13,color:'var(--white)',verticalAlign:'middle'}

// ── REPORT CARDS ───────────────────────────────────────────────
function ReportCards({profile,data,settings,activeYear,rcClass,setRcClass,rcPeriod,setRcPeriod,rcType,setRcType,rcSubject,setRcSubject,rcStudent,setRcStudent,rcRemarks,setRcRemarks,rcHeadRemark,setRcHeadRemark,rcResumption,setRcResumption,rcHeadTeacher,setRcHeadTeacher,rcStamp,setRcStamp,rcClassTeacherName,setRcClassTeacherName,exportExcel}) {
  const {students=[],grades=[],attendance=[],behaviour=[],classes=[],subjects=[],users=[]} = data
  const scale      = settings?.grading_scale||[]
  const gradeComps = getGradeComponents(settings)
  const schoolLogo = settings?.school_logo||null
  const schoolName = settings?.school_name||'SRMS'
  const schoolMotto= settings?.motto||''
  const periodLabel= settings?.period_type==='term'?'Term':'Semester'
  const periods    = Array.from({length:settings?.period_count||2},(_,i)=>`${periodLabel} ${i+1}`)
  const isLastPeriod = rcPeriod === periods[periods.length-1]

  const isClassTeacher = profile?.role==='classteacher'
  const isTeacher      = profile?.role==='teacher'
  const isAdmin        = ['superadmin','admin'].includes(profile?.role)

  // Available classes for this user
  const availableClasses = isClassTeacher
    ? classes.filter(c=>c.id===profile?.class_id)
    : isTeacher
      ? classes.filter(c=>subjects.some(s=>s.class_id===c.id&&s.teacher_id===profile?.id))
      : classes

  // Subjects for selected class
  const classSubjects = rcClass ? subjects.filter(s=>s.class_id===rcClass) : []
  // For teacher: only their subjects
  const mySubjects = isTeacher
    ? classSubjects.filter(s=>s.teacher_id===profile?.id)
    : classSubjects

  // Students in selected class
  const classStudents = rcClass
    ? students.filter(s=>s.class_id===rcClass&&!s.archived).sort((a,b)=>a.last_name.localeCompare(b.last_name))
    : []

  // Helper: get total for a student/subject combo
  const getTotal = (studentId, subjectId) => {
    const g = grades.find(g=>g.student_id===studentId&&g.subject_id===subjectId&&(!rcPeriod||g.period===rcPeriod))
    return g ? calcTotal(g, gradeComps) : null
  }

  // Helper: get overall total for a student (sum across all subjects)
  const getStudentTotal = (studentId) => {
    const tots = classSubjects.map(s=>getTotal(studentId,s.id)).filter(t=>t!==null)
    return tots.length ? tots.reduce((a,b)=>a+b,0) : null
  }

  // Rank students by total
  const rankedStudents = [...classStudents]
    .map(s=>({...s, total: getStudentTotal(s.id)}))
    .sort((a,b)=>(b.total||0)-(a.total||0))
    .map((s,i)=>({...s, position: i+1}))

  // Attendance helper
  const getAttendance = (studentId) => {
    const recs = attendance.filter(a=>a.student_id===studentId)
    const total   = recs.length
    const present = recs.filter(a=>a.status==='Present').length
    const absent  = recs.filter(a=>a.status==='Absent').length
    const late    = recs.filter(a=>a.status==='Late').length
    const rate    = total ? Math.round(present/total*100) : null
    return {total,present,absent,late,rate}
  }

  // Behaviour helper
  const getBehaviour = (studentId) => {
    const recs = behaviour.filter(b=>b.student_id===studentId)
    const achievements = recs.filter(b=>b.type==='Achievement').length
    const discipline   = recs.filter(b=>b.type==='Discipline').length
    return {achievements, discipline, total: recs.length}
  }

  // ── PRINT FUNCTIONS ────────────────────────────────────────────

  const logoTag = schoolLogo
    ? `<img src="${schoolLogo}" style="width:56px;height:56px;object-fit:contain;" />`
    : `<div style="width:56px;height:56px;border-radius:50%;background:#e8b84b20;border:2px solid #e8b84b40;display:flex;align-items:center;justify-content:center;font-size:18px;color:#e8b84b;font-weight:700;">${schoolName.charAt(0)}</div>`

  const printStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&family=Playfair+Display:wght@600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lato',sans-serif;background:#fff;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @media print{
      @page{margin:12mm}
      .no-print{display:none!important}
      .page-break{page-break-after:always}
    }
    @media screen{
      body{padding:20px;background:#f0f0f0}
      .card{max-width:800px;margin:0 auto 24px;box-shadow:0 4px 24px rgba(0,0,0,0.12)}
    }
  `

  // ── BROADSHEET ─────────────────────────────────────────────────
  const printBroadsheet = () => {
    if(!rcClass||!rcPeriod) return
    const cls = classes.find(c=>c.id===rcClass)
    // class teacher name comes from rcClassTeacherName input

    const subjectCols = classSubjects.map(s=>`<th style="padding:8px 6px;text-align:center;font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#f8f8fc;max-width:60px;word-break:break-word;">${s.name}</th>`).join('')

    const rows = rankedStudents.map((s,i)=>{
      const subjectCells = classSubjects.map(sub=>{
        const t = getTotal(s.id, sub.id)
        const letter = t!==null ? getGradeLetter(t, scale) : '--'
        const color = t!==null&&t<50?'#c0392b':t!==null&&t>=75?'#1a7a4a':'#1a1a2e'
        return `<td style="padding:7px 6px;text-align:center;font-size:12px;font-weight:600;border:1px solid #eee;color:${color};">${t!==null?t:'--'}</td>`
      }).join('')
      const total = s.total
      const avg   = classSubjects.length ? (total!==null?Math.round(total/classSubjects.length):null) : null
      const letter= total!==null ? getGradeLetter(Math.round(total/Math.max(classSubjects.length,1)),scale) : '--'
      const remark= total!==null ? getGradeRemark(Math.round(total/Math.max(classSubjects.length,1)),scale) : '--'
      const rowBg = i%2===0?'#fff':'#fafafa'
      return `<tr style="background:${rowBg};">
        <td style="padding:7px 10px;font-size:12px;font-weight:700;text-align:center;border:1px solid #eee;color:#e8b84b;">${s.position}</td>
        <td style="padding:7px 10px;font-size:11px;font-family:monospace;border:1px solid #eee;color:#555;">${s.student_id}</td>
        <td style="padding:7px 10px;font-size:13px;font-weight:600;border:1px solid #eee;">${s.last_name}, ${s.first_name}</td>
        ${subjectCells}
        <td style="padding:7px 8px;text-align:center;font-size:12px;font-weight:700;border:1px solid #eee;background:#f0f8ff;">${total!==null?total:'--'}</td>
        <td style="padding:7px 8px;text-align:center;font-size:12px;font-weight:700;border:1px solid #eee;background:#f0f8ff;">${avg!==null?avg:'--'}</td>
        <td style="padding:7px 8px;text-align:center;font-size:12px;font-weight:700;border:1px solid #eee;color:#e8b84b;">${letter}</td>
        <td style="padding:7px 10px;font-size:11px;border:1px solid #eee;color:#555;">${remark}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Broadsheet — ${cls?.name} — ${rcPeriod}</title>
    <style>${printStyles}
    body{font-size:12px}
    @media print{
      @page{size:A4 landscape;margin:8mm}
      table{font-size:9px!important}
      th,td{padding:4px 5px!important}
      .card{box-shadow:none!important;border-radius:0!important}
    }
    @media screen{
      .card{overflow-x:auto}
    }
    </style></head><body>
    <div class="card" style="background:#fff;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);padding:20px 28px;display:flex;align-items:center;gap:16px;">
        ${logoTag}
        <div style="flex:1;">
          <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.01em;">${schoolName}</div>
          ${schoolMotto?`<div style="font-size:10px;color:#e8b84b;margin-top:2px;font-style:italic;">"${schoolMotto}"</div>`:''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;">Class Broadsheet</div>
          <div style="font-size:16px;font-weight:700;color:#e8b84b;margin-top:4px;">${cls?.name||'--'}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">${rcPeriod} &nbsp;·&nbsp; ${activeYear}</div>
        </div>
      </div>
      <!-- Table -->
      <div style="padding:20px 16px;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;min-width:600px;">
          <thead>
            <tr>
              <th style="padding:8px 10px;text-align:center;font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#f8f8fc;">Pos</th>
              <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#f8f8fc;">ID</th>
              <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#f8f8fc;">Student Name</th>
              ${subjectCols}
              <th style="padding:8px 8px;text-align:center;font-size:9px;font-weight:700;color:#0f3460;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#e8f0fe;">Total</th>
              <th style="padding:8px 8px;text-align:center;font-size:9px;font-weight:700;color:#0f3460;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#e8f0fe;">Avg</th>
              <th style="padding:8px 8px;text-align:center;font-size:9px;font-weight:700;color:#0f3460;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#e8f0fe;">Grade</th>
              <th style="padding:8px 10px;font-size:9px;font-weight:700;color:#0f3460;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #ddd;background:#e8f0fe;">Remark</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <!-- Signatures -->
      <div style="padding:16px 28px 24px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;">
        <div style="font-size:10px;color:#888;">Total Students: ${rankedStudents.length} &nbsp;·&nbsp; ${rcPeriod} &nbsp;·&nbsp; ${activeYear}</div>
        <div style="display:flex;gap:40px;">
          <div style="text-align:center;">
            <div style="width:160px;border-bottom:1px solid #aaa;height:32px;"></div>
            <div style="font-size:10px;color:#555;margin-top:4px;">Class Teacher</div>
            <div style="font-size:10px;color:#888;margin-top:1px;">${rcClassTeacherName||'_________________________'}</div>
          </div>
          <div style="text-align:center;">
            <div style="width:160px;border-bottom:1px solid #aaa;height:32px;"></div>
            <div style="font-size:10px;color:#555;margin-top:4px;">Head Teacher</div>
            <div style="font-size:10px;color:#888;margin-top:1px;">${rcHeadTeacher||'_________________________'}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="no-print" style="max-width:800px;margin:0 auto;text-align:center;padding:12px;">
      <button onclick="window.print()" style="padding:12px 32px;background:#e8b84b;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print Broadsheet</button>
    </div>
    </body></html>`
    const w = window.open('','_blank','width=1100,height=800')
    if(w){w.document.write(html);w.document.close()}
  }

  // ── SUBJECT REPORT ─────────────────────────────────────────────
  const printSubjectReport = () => {
    if(!rcClass||!rcPeriod||!rcSubject) return
    const cls = classes.find(c=>c.id===rcClass)
    const sub = subjects.find(s=>s.id===rcSubject)
    const subTeacher = sub?.teacher_id ? users.find(u=>u.id===sub.teacher_id) : null

    const rankedBySub = [...classStudents]
      .map(s=>{
        const t = getTotal(s.id, rcSubject)
        return {...s, score: t}
      })
      .sort((a,b)=>(b.score||0)-(a.score||0))
      .map((s,i)=>({...s, position: s.score!==null ? i+1 : '--'}))

    const rows = rankedBySub.map((s,i)=>{
      const letter = s.score!==null ? getGradeLetter(s.score, scale) : '--'
      const remark = s.score!==null ? getGradeRemark(s.score, scale) : '--'
      const color  = s.score!==null&&s.score<50?'#c0392b':s.score!==null&&s.score>=75?'#1a7a4a':'#1a1a2e'
      return `<tr style="background:${i%2===0?'#fff':'#fafafa'};">
        <td style="padding:10px 14px;font-size:13px;font-weight:700;text-align:center;border-bottom:1px solid #f0f0f0;color:#e8b84b;">${s.position}</td>
        <td style="padding:10px 14px;font-size:11px;font-family:monospace;border-bottom:1px solid #f0f0f0;color:#888;">${s.student_id}</td>
        <td style="padding:10px 14px;font-size:14px;font-weight:600;border-bottom:1px solid #f0f0f0;">${s.last_name}, ${s.first_name}</td>
        <td style="padding:10px 14px;text-align:center;font-size:16px;font-weight:700;border-bottom:1px solid #f0f0f0;color:${color};">${s.score!==null?s.score:'--'}</td>
        <td style="padding:10px 14px;text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid #f0f0f0;color:#e8b84b;">${letter}</td>
        <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #f0f0f0;color:#555;">${remark}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Subject Report — ${sub?.name}</title>
    <style>${printStyles}
    @media print{@page{size:A4 portrait;margin:12mm}}
    </style></head><body>
    <div class="card" style="background:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);padding:20px 28px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
          ${logoTag}
          <div>
            <div style="font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#fff;">${schoolName}</div>
            ${schoolMotto?`<div style="font-size:10px;color:#e8b84b;font-style:italic;">"${schoolMotto}"</div>`:''}
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;">Subject Performance Report</div>
            <div style="font-size:20px;font-weight:700;color:#e8b84b;margin-top:4px;">${sub?.name||'--'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:rgba(255,255,255,0.7);">${cls?.name||'--'} &nbsp;·&nbsp; ${rcPeriod} &nbsp;·&nbsp; ${activeYear}</div>
            ${subTeacher?`<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Teacher: ${subTeacher.full_name}</div>`:''}
          </div>
        </div>
      </div>
      <div style="padding:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #1a1a2e;">
              ${['Pos','ID','Student Name','Score','Grade','Remark'].map(h=>`<th style="padding:10px 14px;text-align:${h==='Score'||h==='Grade'||h==='Pos'?'center':'left'};font-size:10px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.08em;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:16px 28px 24px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="font-size:10px;color:#888;">Students: ${rankedBySub.length} &nbsp;·&nbsp; Pass rate: ${rankedBySub.length?Math.round(rankedBySub.filter(s=>s.score!==null&&s.score>=50).length/rankedBySub.filter(s=>s.score!==null).length*100||0):0}%</div>
        <div style="text-align:center;">
          <div style="width:160px;border-bottom:1px solid #aaa;height:32px;"></div>
          <div style="font-size:10px;color:#555;margin-top:4px;">Subject Teacher</div>
        </div>
      </div>
    </div>
    <div class="no-print" style="max-width:700px;margin:0 auto;text-align:center;padding:12px;">
      <button onclick="window.print()" style="padding:12px 32px;background:#e8b84b;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print Subject Report</button>
    </div>
    </body></html>`
    const w = window.open('','_blank','width=800,height=900')
    if(w){w.document.write(html);w.document.close()}
  }

  // ── INDIVIDUAL REPORT CARD ─────────────────────────────────────
  const buildReportCard = (student) => {
    const cls = classes.find(c=>c.id===student.class_id)
    const att = getAttendance(student.id)
    const beh = getBehaviour(student.id)
    const sPos = rankedStudents.find(s=>s.id===student.id)?.position||'--'
    const teacherRemark = rcRemarks[student.id]||''

    const subjectRows = classSubjects.map(sub=>{
      const g = grades.find(gr=>gr.student_id===student.id&&gr.subject_id===sub.id&&(!rcPeriod||gr.period===rcPeriod))
      const total  = g ? calcTotal(g, gradeComps) : null
      const letter = total!==null ? getGradeLetter(total, scale) : '--'
      const remark = total!==null ? getGradeRemark(total, scale) : '--'
      const subTeacherUser = sub.teacher_id ? `<!-- teacher -->` : ''
      const scoreColor = total!==null&&total<50?'#c0392b':total!==null&&total>=75?'#1a7a4a':'#1a1a2e'
      return `<tr>
        <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f0f0f0;">${sub.name}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center;font-weight:700;border-bottom:1px solid #f0f0f0;color:${scoreColor};">${total!==null?total:'--'}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center;font-weight:700;border-bottom:1px solid #f0f0f0;color:#e8b84b;">${letter}</td>
        <td style="padding:9px 14px;font-size:12px;border-bottom:1px solid #f0f0f0;color:#555;">${remark}</td>
      </tr>`
    }).join('')

    const photoTag = student.photo
      ? `<img src="${student.photo}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #e8b84b;" />`
      : `<div style="width:72px;height:72px;border-radius:50%;background:#e8b84b20;border:3px solid #e8b84b40;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#e8b84b;font-family:'Playfair Display',serif;">${student.first_name[0]}${student.last_name[0]}</div>`

    const promotionLine = isLastPeriod
      ? `<div style="margin-top:12px;padding:10px 16px;background:#f8f8fc;border-radius:8px;border-left:3px solid #e8b84b;font-size:12px;color:#555;">
          <span style="font-weight:700;color:#1a1a2e;">Next Class:</span> _______________________________
        </div>` : ''

    const stampBox = rcStamp
      ? `<div style="width:90px;height:90px;border:2px dashed #ccc;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#bbb;text-align:center;">OFFICIAL<br>STAMP</div>`
      : ''

    return `
    <div class="card" style="background:#fff;border-radius:12px;overflow:hidden;page-break-after:always;">
      <!-- Top accent bar -->
      <div style="height:5px;background:linear-gradient(90deg,#e8b84b,#f5d07a,#e8b84b);"></div>

      <!-- Header -->
      <div style="padding:20px 28px;display:flex;align-items:center;gap:16px;border-bottom:1px solid #f0f0f0;">
        ${logoTag}
        <div style="flex:1;text-align:center;">
          <div style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:#1a1a2e;letter-spacing:-0.01em;">${schoolName}</div>
          ${schoolMotto?`<div style="font-size:10px;color:#888;margin-top:2px;font-style:italic;">"${schoolMotto}"</div>`:''}
          <div style="font-size:11px;font-weight:700;color:#e8b84b;text-transform:uppercase;letter-spacing:0.12em;margin-top:6px;">Student Report Card</div>
        </div>
        ${photoTag}
      </div>

      <!-- Student info bar -->
      <div style="background:#f8f8fc;padding:14px 28px;display:flex;gap:28px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #eee;">
        <div>
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Student</div>
          <div style="font-size:16px;font-weight:700;color:#1a1a2e;font-family:'Playfair Display',serif;">${student.first_name} ${student.last_name}</div>
        </div>
        <div style="width:1px;height:32px;background:#ddd;"></div>
        <div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">ID</div><div style="font-size:13px;font-weight:600;color:#555;font-family:monospace;">${student.student_id}</div></div>
        <div style="width:1px;height:32px;background:#ddd;"></div>
        <div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Class</div><div style="font-size:13px;font-weight:600;color:#1a1a2e;">${cls?.name||'--'}</div></div>
        <div style="width:1px;height:32px;background:#ddd;"></div>
        <div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Period</div><div style="font-size:13px;font-weight:600;color:#1a1a2e;">${rcPeriod}</div></div>
        <div style="width:1px;height:32px;background:#ddd;"></div>
        <div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Year</div><div style="font-size:13px;font-weight:600;color:#1a1a2e;">${activeYear}</div></div>
        <div style="margin-left:auto;text-align:center;background:#e8b84b15;border:1px solid #e8b84b30;border-radius:8px;padding:8px 16px;">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Position</div>
          <div style="font-size:18px;font-weight:900;color:#e8b84b;">${sPos!=='--'?ordinal(sPos):'--'}</div>
          <div style="font-size:10px;color:#888;">of ${classStudents.length}</div>
        </div>
      </div>

      <!-- Body: 2 cols -->
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:0;padding:0;">

        <!-- Academics -->
        <div style="padding:20px 20px 20px 28px;border-right:1px solid #f0f0f0;">
          <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Academic Performance</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid #1a1a2e;">
                <th style="padding:7px 14px;text-align:left;font-size:9px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.08em;">Subject</th>
                <th style="padding:7px 10px;text-align:center;font-size:9px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.08em;">Score</th>
                <th style="padding:7px 10px;text-align:center;font-size:9px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.08em;">Grade</th>
                <th style="padding:7px 14px;text-align:left;font-size:9px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.08em;">Remark</th>
              </tr>
            </thead>
            <tbody>${subjectRows}</tbody>
          </table>
        </div>

        <!-- Right col: attendance + behaviour + remarks -->
        <div style="padding:20px 28px 20px 20px;">

          <!-- Attendance -->
          <div style="margin-bottom:18px;">
            <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Attendance</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
              <div style="flex:1;height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;">
                <div style="width:${att.rate!==null?att.rate:0}%;height:100%;background:${att.rate!==null&&att.rate>=80?'#2dd4a0':att.rate!==null&&att.rate>=60?'#fb9f3a':'#f06b7a'};border-radius:3px;"></div>
              </div>
              <span style="font-size:15px;font-weight:800;color:${att.rate!==null&&att.rate>=80?'#1a7a4a':att.rate!==null&&att.rate>=60?'#c05a00':'#c0392b'};">${att.rate!==null?att.rate+'%':'--'}</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${[['Present',att.present,'#2dd4a0'],['Absent',att.absent,'#f06b7a'],['Late',att.late,'#fb9f3a']].map(([l,v,c])=>`
              <div style="flex:1;min-width:52px;text-align:center;padding:6px 8px;background:${c}15;border-radius:6px;border:1px solid ${c}30;">
                <div style="font-size:15px;font-weight:800;color:${c};">${v}</div>
                <div style="font-size:9px;color:#888;margin-top:1px;">${l}</div>
              </div>`).join('')}
            </div>
          </div>

          <!-- Behaviour -->
          <div style="margin-bottom:18px;">
            <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Conduct</div>
            <div style="display:flex;gap:8px;">
              <div style="flex:1;padding:8px 10px;background:#2dd4a015;border-radius:6px;border:1px solid #2dd4a030;text-align:center;">
                <div style="font-size:15px;font-weight:800;color:#2dd4a0;">🏆 ${beh.achievements}</div>
                <div style="font-size:9px;color:#888;margin-top:1px;">Achievement${beh.achievements!==1?'s':''}</div>
              </div>
              <div style="flex:1;padding:8px 10px;background:#f06b7a15;border-radius:6px;border:1px solid #f06b7a30;text-align:center;">
                <div style="font-size:15px;font-weight:800;color:#f06b7a;">⚡ ${beh.discipline}</div>
                <div style="font-size:9px;color:#888;margin-top:1px;">Discipline note${beh.discipline!==1?'s':''}</div>
              </div>
            </div>
          </div>

          <!-- Class Teacher Remark -->
          <div style="margin-bottom:14px;">
            <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Class Teacher's Remark</div>
            <div style="padding:10px 12px;background:#f8f8fc;border-radius:6px;border-left:3px solid #e8b84b;font-size:12px;color:#333;min-height:40px;line-height:1.5;">${teacherRemark||'<span style="color:#bbb;font-style:italic;">No remark entered</span>'}</div>
          </div>

          <!-- Head Teacher Remark -->
          ${rcHeadRemark?`<div style="margin-bottom:14px;">
            <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Head Teacher's Remark</div>
            <div style="padding:10px 12px;background:#f8f8fc;border-radius:6px;border-left:3px solid #0f3460;font-size:12px;color:#333;line-height:1.5;">${rcHeadRemark}</div>
          </div>`:''}

          ${promotionLine}

          ${rcResumption?`<div style="margin-top:10px;font-size:11px;color:#555;"><span style="font-weight:700;">Next Term Resumes:</span> ${rcResumption}</div>`:''}
        </div>
      </div>

      <!-- Signatures -->
      <div style="padding:16px 28px 20px;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
        <div style="font-size:10px;color:#aaa;">Generated ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
        <div style="display:flex;gap:32px;align-items:flex-end;">
          <div style="text-align:center;">
            <div style="width:140px;border-bottom:1px solid #aaa;height:28px;"></div>
            <div style="font-size:10px;color:#555;margin-top:4px;">Class Teacher</div>
            <div style="font-size:10px;color:#888;margin-top:1px;">${rcClassTeacherName||'_________________'}</div>
          </div>
          <div style="text-align:center;">
            <div style="width:140px;border-bottom:1px solid #aaa;height:28px;"></div>
            <div style="font-size:10px;color:#555;margin-top:4px;">Head Teacher</div>
            <div style="font-size:10px;color:#888;margin-top:1px;">${rcHeadTeacher||'_________________'}</div>
          </div>
          ${stampBox}
        </div>
      </div>
      <!-- Bottom accent -->
      <div style="height:3px;background:linear-gradient(90deg,#e8b84b,#f5d07a,#e8b84b);"></div>
    </div>`
  }

  const printOneCard = () => {
    if(!rcStudent) return
    const student = classStudents.find(s=>s.id===rcStudent)
    if(!student) return
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report Card — ${student.first_name} ${student.last_name}</title>
    <style>${printStyles}@media print{@page{size:A4 portrait;margin:8mm}}</style></head>
    <body>${buildReportCard(student)}
    <div class="no-print" style="max-width:700px;margin:0 auto;text-align:center;padding:12px;">
      <button onclick="window.print()" style="padding:12px 32px;background:#e8b84b;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print Report Card</button>
    </div></body></html>`
    const w = window.open('','_blank','width=800,height=900')
    if(w){w.document.write(html);w.document.close()}
  }

  const printAllCards = () => {
    if(!rcClass) return
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report Cards — ${classes.find(c=>c.id===rcClass)?.name}</title>
    <style>${printStyles}@media print{@page{size:A4 portrait;margin:8mm}}</style></head>
    <body>${classStudents.map(s=>buildReportCard(s)).join('')}
    <div class="no-print" style="max-width:700px;margin:0 auto;text-align:center;padding:12px;">
      <button onclick="window.print()" style="padding:12px 32px;background:#e8b84b;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print All Cards (${classStudents.length})</button>
    </div></body></html>`
    const w = window.open('','_blank','width=800,height=900')
    if(w){w.document.write(html);w.document.close()}
  }

  // ── UI ─────────────────────────────────────────────────────────
  const [previewStudent, setPreviewStudent] = useState('')
  const [showPreview,    setShowPreview]    = useState(false)

  const openPreview = () => {
    const sid = previewStudent || (classStudents[0]?.id||'')
    if(!sid) return
    const student = classStudents.find(s=>s.id===sid)
    if(!student) return
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title>
    <style>${printStyles}@media print{@page{size:A4 portrait;margin:8mm}}</style></head>
    <body style="background:#f0f0f0;padding:20px;">${buildReportCard(student)}
    <div class="no-print" style="max-width:700px;margin:0 auto;text-align:center;padding:12px;">
      <button onclick="window.print()" style="padding:12px 32px;background:#e8b84b;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer;">⎙ Print This Card</button>
    </div></body></html>`
    const w = window.open('','_blank','width=860,height=960')
    if(w){w.document.write(html);w.document.close()}
  }

  const canPrintBroadsheet = rcClass&&rcPeriod
  const canPrintSubject    = rcClass&&rcPeriod&&rcSubject
  const canPrintOne        = rcClass&&rcPeriod&&rcStudent
  const canPrintAll        = rcClass&&rcPeriod

  return (
    <div>
      {/* Controls */}
      <Card style={{marginBottom:16}}>
        <SectionTitle>Report Setup</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:16}}>
          <Field label='Class' value={rcClass} onChange={v=>{setRcClass(v);setRcSubject('');setRcStudent('')}}
            options={[{value:'',label:'Select class'},...availableClasses.map(c=>({value:c.id,label:c.name}))]}/>
          <Field label='Period' value={rcPeriod} onChange={setRcPeriod}
            options={[{value:'',label:'Select period'},...periods.map(p=>({value:p,label:p}))]}/>
          <Field label='Report Type' value={rcType} onChange={setRcType}
            options={[
              ...(isAdmin||isClassTeacher?[{value:'broadsheet',label:'Class Broadsheet'}]:[]),
              ...(isAdmin||isTeacher||isClassTeacher?[{value:'subject',label:'Subject Report'}]:[]),
              ...(isAdmin||isClassTeacher?[{value:'individual',label:'Individual Card'}]:[]),
            ]}/>
          {rcType==='subject' && rcClass && (
            <Field label='Subject' value={rcSubject} onChange={setRcSubject}
              options={[{value:'',label:'Select subject'},...(isTeacher?mySubjects:classSubjects).map(s=>({value:s.id,label:s.name}))]}/>
          )}
          {rcType==='individual' && rcClass && (
            <Field label='Student' value={rcStudent} onChange={setRcStudent}
              options={[{value:'',label:'All students'},...classStudents.map(s=>({value:s.id,label:`${s.first_name} ${s.last_name}`}))]}/>
          )}
        </div>

        {/* Print details */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,paddingTop:12,borderTop:'1px solid var(--line)'}}>
          <Field label='Class Teacher Name' value={rcClassTeacherName} onChange={setRcClassTeacherName} placeholder='For signature line'/>
          <Field label='Head Teacher Name'  value={rcHeadTeacher}      onChange={setRcHeadTeacher}      placeholder='For signature line'/>
          {rcType==='individual' && <>
            <Field label='Head Teacher Remark (optional)' value={rcHeadRemark} onChange={setRcHeadRemark} placeholder='Overall comment...'/>
            <Field label='Next Term Resumption Date' value={rcResumption} onChange={setRcResumption} placeholder='e.g. Jan 13, 2026'/>
          </>}
          <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:8}}>
            <button onClick={()=>setRcStamp(v=>!v)}
              style={{width:36,height:20,borderRadius:10,background:rcStamp?'var(--emerald)':'var(--line2)',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s'}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:'white',position:'absolute',top:3,left:rcStamp?19:3,transition:'left 0.2s'}}/>
            </button>
            <span style={{fontSize:12,color:'var(--mist2)'}}>Include stamp space</span>
          </div>
        </div>
      </Card>

      {/* Per-student remarks for individual cards */}
      {rcType==='individual' && rcClass && (
        <Card style={{marginBottom:16}}>
          <SectionTitle>Class Teacher Remarks</SectionTitle>
          <p style={{fontSize:12,color:'var(--mist2)',marginBottom:14}}>Enter a remark for each student. These will appear on their report cards.</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {classStudents.map(s=>(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8,width:180,flexShrink:0}}>
                  <Avatar name={`${s.first_name} ${s.last_name}`} size={26} photo={s.photo}/>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--mist)'}}>{s.first_name} {s.last_name}</span>
                </div>
                <input
                  value={rcRemarks[s.id]||''}
                  onChange={e=>setRcRemarks(p=>({...p,[s.id]:e.target.value}))}
                  placeholder='Enter remark...'
                  style={{flex:1,background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'7px 12px',color:'var(--white)',fontSize:12,fontFamily:"'Cabinet Grotesk',sans-serif"}}/>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Print actions */}
      <Card>
        <SectionTitle>Generate & Print</SectionTitle>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {rcType==='broadsheet' && (
            <Btn onClick={printBroadsheet} disabled={!canPrintBroadsheet}>
              ⎙ Print Broadsheet
            </Btn>
          )}
          {rcType==='broadsheet' && isAdmin && (
            <Btn variant='ghost' onClick={exportExcel} disabled={!canPrintBroadsheet}>
              ⬇ Export Excel
            </Btn>
          )}
          {rcType==='subject' && (
            <Btn onClick={printSubjectReport} disabled={!canPrintSubject}>
              ⎙ Print Subject Report
            </Btn>
          )}
          {rcType==='individual' && <>
            <Btn onClick={printOneCard} disabled={!canPrintOne} variant='secondary'>
              ⎙ Print Selected Card
            </Btn>
            <Btn onClick={printAllCards} disabled={!canPrintAll}>
              ⎙ Print All Cards ({classStudents.length})
            </Btn>
            <Btn variant='ghost' disabled={!canPrintAll} onClick={()=>{
              if(!previewStudent&&classStudents.length>0) setPreviewStudent(classStudents[0].id)
              openPreview()
            }}>
              👁 Preview Card
            </Btn>
          </>}
        </div>
        {rcType==='individual'&&rcClass&&rcPeriod&&(
          <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--line)',display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:12,color:'var(--mist3)'}}>Preview student:</span>
            <select value={previewStudent||classStudents[0]?.id||''} onChange={e=>setPreviewStudent(e.target.value)}
              style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'6px 12px',color:'var(--mist)',fontSize:12,cursor:'pointer'}}>
              {classStudents.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
        )}
        {!rcClass&&<p style={{fontSize:12,color:'var(--mist3)',marginTop:8}}>Select a class and period to continue.</p>}
        {rcClass&&!rcPeriod&&<p style={{fontSize:12,color:'var(--mist3)',marginTop:8}}>Select a period to continue.</p>}
        {rcType==='subject'&&rcClass&&rcPeriod&&!rcSubject&&<p style={{fontSize:12,color:'var(--mist3)',marginTop:8}}>Select a subject to print the subject report.</p>}
        {rcType==='individual'&&rcClass&&rcPeriod&&!rcStudent&&<p style={{fontSize:12,color:'var(--amber)',marginTop:8}}>No student selected — Print All will generate cards for all {classStudents.length} students in this class.</p>}
      </Card>
    </div>
  )
}

// ── ANNOUNCEMENTS ──────────────────────────────────────────────
function Announcements({profile,data,setData,toast,activeYear,isViewingPast}) {
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
    const {data:row,error}=await supabase.from('announcements').insert({...form,active:true,posted_by_id:profile?.id,posted_by_name:profile?.full_name,academic_year:activeYear}).select().single()
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
        {canManage && !isViewingPast && <Btn onClick={openAdd}>+ Post Announcement</Btn>}
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
                <div style={{fontSize:11,color:'var(--mist3)',marginTop:12}}>Posted by <strong style={{color:'var(--mist2)'}}>{a.posted_by_name}</strong> . {fmtDate(a.created_at)}</div>
              </div>
              {canManage && !isViewingPast && (
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
          <Field label='Message' value={form.body} onChange={f('body')} rows={4} required placeholder='Full announcement text...'/>
          <Field label='Target Audience' value={form.target_role} onChange={f('target_role')} options={[{value:'all',label:'Everyone'},{value:'teacher',label:'Teachers Only'},{value:'admin',label:'Admins Only'}]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Posting...</>:'Post Announcement'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── USERS MODULE ───────────────────────────────────────────────

function Users({profile,toast}) {
  const [users,setUsers]       = useState([])
  const [loading,setLoading]   = useState(true)
  const [modal,setModal]       = useState(false)
  const [edit,setEdit]         = useState(null)
  const [form,setForm]         = useState({})
  const [saving,setSaving]     = useState(false)

  const [tempPassword,setTempPassword] = useState('')
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
      const {error} = await supabase.from('profiles').update({full_name:form.full_name,email:form.email,role:form.role}).eq('id',edit.id)
      if(error){ toast(error.message,'error'); setSaving(false); return }
      // If switching away from class teacher, unlink from class
      if(edit.role==='classteacher' && form.role!=='classteacher'){
        await supabase.from('profiles').update({class_id:null}).eq('id',edit.id)
        await supabase.from('classes').update({class_teacher_id:null}).eq('class_teacher_id',edit.id)
      }
      // Re-fetch from DB to confirm the change actually saved
      const {data:refreshed} = await supabase.from('profiles').select('*').eq('id',edit.id).single()
      if(refreshed){
        setUsers(p=>p.map(u=>u.id===edit.id?refreshed:u))
      }
      auditLog(profile,'Users','Updated',`${form.full_name} · Role: ${edit.role}→${form.role}`,{},{...edit},{...form})
      toast('User updated')
      setModal(false)
    } else {
      if(!form.password)return
      const {data:authData,error:authErr} = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name, role: form.role } }
      })
      if(authErr){ toast(authErr.message,'error'); setSaving(false); return }
      const uid = authData?.user?.id
      if(!uid){ toast('User account created but could not get ID.','error'); setSaving(false); return }
      const {error:profErr} = await supabase.from('profiles').upsert({id:uid,full_name:form.full_name,email:form.email,role:form.role,locked:false})
      if(profErr){ toast(profErr.message,'error'); setSaving(false); return }
      setUsers(p=>[...p,{id:uid,full_name:form.full_name,email:form.email,role:form.role,locked:false}])
      auditLog(profile,'Users','Created',`${form.full_name} · ${form.role}`,{},null,{id:uid,full_name:form.full_name,email:form.email,role:form.role})
      toast('User created successfully')
      setModal(false)
    }
    setSaving(false)
  }

  const toggleLock = async id=>{
    const u=users.find(x=>x.id===id)
    if(!u) return
    if(u.id===profile?.id){toast('You cannot lock your own account.','error');return}
    if(u.role==='superadmin'){toast('Super Admin accounts cannot be locked.','error');return}
    const {error} = await supabase.from('profiles').update({locked:!u.locked}).eq('id',id)
    if(error){toast('Failed to update -- check Supabase RLS policies.','error');return}
    setUsers(p=>p.map(x=>x.id===id?{...x,locked:!x.locked}:x))
    auditLog(profile,'Users',u.locked?'Unlocked':'Locked',`${u.full_name} · ${u.email}`,{},{...u},null)
    toast(u.locked ? 'Account unlocked.' : 'Account locked.')
  }

  if(loading) return <LoadingScreen msg='Loading users...'/>
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
              {r.id!==profile?.id && r.role!=='superadmin' &&
                <Btn variant='ghost' size='sm' onClick={()=>toggleLock(r.id)}>{r.locked?'Unlock':'Lock'}</Btn>
              }
            </div>
          )},
        ]}/>
      </Card>
      {modal && (
        <Modal title={edit?'Edit User':'Add New User'} subtitle={edit?`Editing ${edit.full_name}`:'Create a login account for a staff member.'} onClose={()=>setModal(false)}>
          <Field label='Full Name' value={form.full_name} onChange={f('full_name')} required/>
          <Field label='Email Address' value={form.email} onChange={f('email')} type='email' required/>
          {!edit && <Field label='Password' value={form.password} onChange={f('password')} type='password' required/>}
          {edit?.id===profile?.id
            ? <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>Role</div>
                <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',fontSize:13,color:'var(--mist3)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>{ROLE_META[form.role]?.label||form.role}</span>
                  <span style={{fontSize:11,color:'var(--mist3)'}}>Cannot change your own role</span>
                </div>
              </div>
            : <Field label='Role' value={form.role} onChange={f('role')} options={[{value:'admin',label:'Administrator'},{value:'classteacher',label:'Class Teacher'},{value:'teacher',label:'Subject Teacher'}]}/>
          }
          {edit && <p style={{fontSize:12,color:'var(--mist3)',marginTop:-8,marginBottom:8}}>To change a password, contact your Super Admin.</p>}
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:edit?'Save Changes':'Create User'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── AUDIT LOG ──────────────────────────────────────────────────
const MODULE_META = {
  Grades:     { icon:'◎', color:'var(--sky)' },
  Students:   { icon:'◈', color:'var(--emerald)' },
  Fees:       { icon:'◈', color:'var(--gold)' },
  Attendance: { icon:'◉', color:'var(--amber)' },
  Behaviour:  { icon:'◐', color:'var(--rose)' },
  Users:      { icon:'◈', color:'var(--sky)' },
  Settings:   { icon:'◧', color:'var(--mist2)' },
}
const ACTION_COLOR = {
  Created: 'var(--emerald)',
  Updated: 'var(--amber)',
  Deleted: 'var(--rose)',
  Marked:  'var(--sky)',
  Payment: 'var(--gold)',
  Locked:  'var(--rose)',
  Unlocked:'var(--emerald)',
}

function AuditLog({profile}) {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [fModule, setFModule]   = useState('')
  const [fUser,   setFUser]     = useState('')
  const [fSearch, setFSearch]   = useState('')
  const [users,   setUsers]     = useState([])

  useEffect(()=>{
    // 50 days back
    const cutoff = new Date(Date.now() - 50*24*60*60*1000).toISOString()
    Promise.all([
      supabase.from('audit_logs').select('*').gte('created_at',cutoff).order('created_at',{ascending:false}).limit(500),
      supabase.from('profiles').select('id,full_name,email,role')
    ]).then(([{data:logs,error},{data:users}])=>{
      if(error) console.error(error)
      setLogs(logs||[])
      setUsers(users||[])
      setLoading(false)
    })
  },[])

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

  const renderDiff = (log) => {
    if(!log.before_data && !log.after_data) return null
    const before = log.before_data||{}
    const after  = log.after_data||{}
    const keys   = [...new Set([...Object.keys(before),...Object.keys(after)])]
      .filter(k=>!['id','created_at','updated_at','password'].includes(k))
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
                <div style={{color:'var(--emerald)',background:'rgba(45,212,160,0.08)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all'}}>{String(after[k]??'—')}</div>
              </>
            ) : log.action==='Deleted' ? (
              <>
                <div style={{color:'var(--rose)',background:'rgba(240,107,122,0.08)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all',textDecoration:'line-through'}}>{String(before[k]??'—')}</div>
                <div style={{color:'var(--mist3)',fontStyle:'italic'}}>—</div>
              </>
            ) : (
              <>
                <div style={{color:'var(--mist2)',background:'var(--ink3)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all'}}>{String(before[k]??'—')}</div>
                <div style={{color:'var(--emerald)',background:'rgba(45,212,160,0.08)',padding:'3px 8px',borderRadius:4,wordBreak:'break-all'}}>{String(after[k]??'—')}</div>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  if(profile?.role!=='superadmin') return <div style={{padding:48,textAlign:'center',color:'var(--mist3)'}}>Access restricted to superadmin.</div>
  if(loading) return <LoadingScreen msg='Loading audit log...'/>

  return (
    <div>
      <PageHeader title='Audit Log' sub={`${filtered.length} events · last 50 days`}/>

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
function Settings({profile,settings,setSettings,toast,activeYear,onStartNewYear}) {
  const [form,setForm]   = useState(JSON.parse(JSON.stringify(settings||{})))
  const [saving,setSaving] = useState(false)
  const [weightWarning,setWeightWarning] = useState(false)
  const [logoUploading,setLogoUploading] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const canAdmin = ['superadmin','admin'].includes(profile?.role)

  const gradeComponents = form.grade_components || DEFAULT_GRADE_COMPONENTS
  const activeComps = gradeComponents.filter(c=>c.enabled)
  const totalWeight = activeComps.reduce((a,c)=>a+c.weight,0)

  const save = async () => {
    if(totalWeight!==100 && activeComps.length>0){
      setWeightWarning(true)
      setTimeout(()=>setWeightWarning(false),4000)
    }
    setSaving(true)
    const payload = {...form, grade_components: gradeComponents}
    const {error} = await supabase.from('settings').update(payload).eq('id',form.id)
    if(error) toast(error.message,'error')
    else {
      // Build a human-readable summary of what changed
      const changes = []
      if(settings?.school_name !== payload.school_name) changes.push(`School name: ${settings?.school_name}→${payload.school_name}`)
      if(settings?.academic_year !== payload.academic_year) changes.push(`Academic year: ${settings?.academic_year}→${payload.academic_year}`)
      if(settings?.period_type !== payload.period_type) changes.push(`Period type: ${settings?.period_type}→${payload.period_type}`)
      if(settings?.period_count !== payload.period_count) changes.push(`Period count: ${settings?.period_count}→${payload.period_count}`)
      if(JSON.stringify(settings?.grading_scale) !== JSON.stringify(payload.grading_scale)) changes.push('Grading scale updated')
      if(JSON.stringify(settings?.grade_components) !== JSON.stringify(payload.grade_components)) changes.push('Grade components updated')
      if(settings?.school_logo !== payload.school_logo) changes.push('School logo updated')
      const desc = changes.length ? changes.join(' · ') : 'No changes detected'
      // Strip logo from diff — base64 strings are too large for audit storage
      const {school_logo:_bl,...settingsBefore} = settings||{}
      const {school_logo:_al,...settingsAfter}  = payload
      auditLog(profile,'Settings','Updated',desc,{},settingsBefore,settingsAfter)
      setSettings(payload)
      toast('Settings saved')
    }
    setSaving(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if(!file) return
    if(!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/jpg') && !file.type.includes('png')) {
      toast('Please upload a JPG or PNG image','error'); return
    }
    if(file.size > 2*1024*1024) { toast('Image must be under 2MB','error'); return }
    setLogoUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      setForm(p=>({...p, school_logo: base64}))
      setLogoUploading(false)
      toast('Logo uploaded -- click Save Changes to apply')
    }
    reader.readAsDataURL(file)
  }

  const updGrade = (i,k,v)=>{const g=[...form.grading_scale];g[i]={...g[i],[k]:k==='letter'||k==='remark'?v:parseFloat(v)||0};setForm(p=>({...p,grading_scale:g}))}

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
    if(wasEnabled) {
      const key = comps[i].key
      await supabase.from('grades').update({[key]:0}).neq('id','00000000-0000-0000-0000-000000000000')
      auditLog(profile,'Settings','Updated',`Grade component disabled & scores cleared: ${comps[i].label}`,{component:comps[i].label},null,null)
      toast(`${comps[i].label} disabled -- all scores cleared`)
    }
  }

  if(!form.id) return <div style={{padding:48,textAlign:'center',color:'var(--mist3)'}}>Loading settings...</div>
  const curPreview = getCurrency({...form,currency_code:form.currency_code||'GHS'})
  return (
    <div>
      <PageHeader title='System Settings' sub='School configuration, grading scale and academic structure'>
        <Btn onClick={save} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Changes'}</Btn>
      </PageHeader>

      {weightWarning && (
        <div className='fi' style={{background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:'var(--r)',padding:'12px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>(!)</span>
          <span style={{fontSize:13,color:'var(--amber)'}}>Active component weights add up to <strong>{totalWeight}%</strong> -- they should total 100% for accurate grade calculations. Settings saved anyway.</span>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
        <div>
          <Card style={{marginBottom:20}}>
            <SectionTitle>School Information</SectionTitle>
            <Field label='School Name'   value={form.school_name}   onChange={f('school_name')} required/>
            <Field label='Address'       value={form.address}       onChange={f('address')}/>
            <Field label='School Motto'  value={form.motto}         onChange={f('motto')}/>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>Academic Year</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <select value={form.academic_year||''} onChange={e=>setForm(p=>({...p,academic_year:e.target.value}))}
                  style={{flex:1,background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13,cursor:'pointer'}}>
                  {generateYears(form.academic_year||activeYear).map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            {profile?.role==='superadmin' && (
              <div style={{padding:'14px 16px',background:'rgba(45,212,160,0.04)',border:'1px solid rgba(45,212,160,0.15)',borderRadius:'var(--r-sm)',marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--emerald)',marginBottom:4}}>Ready to close this year?</div>
                <div style={{fontSize:12,color:'var(--mist2)',marginBottom:12}}>Archive all {activeYear} data and open a new academic year. All history is preserved.</div>
                <Btn onClick={onStartNewYear} size='sm'>Start New Academic Year &rarr;</Btn>
              </div>
            )}
          </Card>

          {canAdmin && (
            <Card style={{marginBottom:20}}>
              <SectionTitle>School Logo</SectionTitle>
              <p style={{fontSize:12,color:'var(--mist2)',marginBottom:14,lineHeight:1.6}}>Upload a logo to appear on generated reports. JPG only, max 2MB.</p>
              <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
                {form.school_logo ? (
                  <div style={{position:'relative'}}>
                    <img src={form.school_logo} alt='School logo' style={{width:80,height:80,objectFit:'contain',borderRadius:'var(--r-sm)',border:'1px solid var(--line)',background:'white',padding:4}}/>
                    <button onClick={()=>setForm(p=>({...p,school_logo:null}))}
                      style={{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'var(--rose)',color:'white',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none'}}>×</button>
                  </div>
                ) : (
                  <div style={{width:80,height:80,borderRadius:'var(--r-sm)',border:'2px dashed var(--line)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--mist3)',fontSize:11}}>No logo</div>
                )}
                <div>
                  <label style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 16px',background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',cursor:'pointer',fontSize:13,color:'var(--mist)',fontWeight:500}}>
                    {logoUploading?<><Spinner/> Uploading...</>:<>⬆ {form.school_logo?'Replace Logo':'Upload Logo'}</>}
                    <input type='file' accept='.jpg,.jpeg,.png' onChange={handleLogoUpload} style={{display:'none'}}/>
                  </label>
                  <p style={{fontSize:11,color:'var(--mist3)',marginTop:8}}>Will appear top-left on PDF reports</p>
                </div>
              </div>
            </Card>
          )}

          <Card style={{marginBottom:20}}>
            <SectionTitle>Currency</SectionTitle>
            <Field label='Currency' value={form.currency_code||'GHS'} onChange={f('currency_code')}
              options={CURRENCIES.map(c=>({value:c.code,label:`${c.symbol}  ${c.name} (${c.code})`}))}/>
            <div style={{display:'flex',gap:12,alignItems:'center',marginTop:-8,marginBottom:16,flexWrap:'wrap'}}>
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 16px',fontSize:13}}>
                <span style={{color:'var(--mist3)'}}>Preview: </span>
                <span className='mono' style={{color:'var(--gold)',fontWeight:700}}>{fmtMoney(1250,curPreview)}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:12,color:'var(--mist3)'}}>Symbol position:</span>
                {['before','after'].map(pos=>(
                  <button key={pos} onClick={()=>setForm(p=>({...p,currency_position:pos}))}
                    style={{padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',
                      background:(form.currency_position||curPreview.position)===pos?'var(--ink4)':'transparent',
                      color:(form.currency_position||curPreview.position)===pos?'var(--white)':'var(--mist3)',
                      border:`1px solid ${(form.currency_position||curPreview.position)===pos?'var(--line2)':'var(--line)'}`}}>
                    {pos==='before'?'Before (₵100)':'After (100 ₵)'}
                  </button>
                ))}
              </div>
            </div>
            <Field label='Decimal Places' value={form.currency_decimals??2} onChange={v=>setForm(p=>({...p,currency_decimals:parseInt(v)||0}))}
              options={[{value:0,label:'0 -- No decimals (e.g. ₵100)'},{value:2,label:'2 -- Standard (e.g. ₵100.00)'}]}/>
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
                  <button onClick={()=>handleToggle(i)}
                    style={{width:38,height:22,borderRadius:11,background:c.enabled?'var(--emerald)':'var(--line2)',border:'none',cursor:'pointer',transition:'background 0.2s',position:'relative',flexShrink:0}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'white',position:'absolute',top:3,left:c.enabled?19:3,transition:'left 0.2s'}}/>
                  </button>
                  <input value={c.label} onChange={e=>updComponent(i,'label',e.target.value)}
                    style={{flex:1,background:'transparent',border:'none',borderBottom:`1px solid ${c.enabled?'var(--line2)':'transparent'}`,color:c.enabled?'var(--white)':'var(--mist3)',fontSize:13,fontWeight:600,padding:'2px 4px',fontFamily:"'Cabinet Grotesk',sans-serif",cursor:'text'}}/>
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
                {['Min','Max','Letter','GPA','Remark'].map(h=><th key={h} style={{padding:8,textAlign:'left',fontSize:10,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:"'Clash Display',sans-serif"}}>{h}</th>)}
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
                    <td style={{padding:'5px 4px'}}>
                      <input type='text' value={row.remark||''} onChange={e=>updGrade(i,'remark',e.target.value)}
                        placeholder='e.g. Excellent'
                        style={{width:100,background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'6px 8px',color:'var(--white)',fontSize:12}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* ── ACADEMIC CALENDAR ── */}
      {profile?.role==='superadmin' && (
        <div style={{marginTop:20}}>
          <AcademicCalendar
            form={form}
            setForm={setForm}
            activeYear={activeYear}
          />
        </div>
      )}
    </div>
  )
}

// ── ACADEMIC CALENDAR SETTINGS ─────────────────────────────────
function AcademicCalendar({form, setForm, activeYear}) {
  const [vacTab, setVacTab] = useState('vacations')
  // Vacations
  const vacations = form.vacations || []
  const yearVacs  = vacations.filter(v => v.academic_year === activeYear)
  const [vacModal, setVacModal]   = useState(false)
  const [editVac,  setEditVac]    = useState(null)
  const [vacForm,  setVacForm]    = useState({name:'', start_date:'', end_date:'', academic_year:activeYear})
  // Custom holidays
  const customHols = form.custom_holidays || []
  const [holModal, setHolModal]   = useState(false)
  const [holForm,  setHolForm]    = useState({name:'', date:''})
  const [editHol,  setEditHol]    = useState(null)

  const openAddVac = () => {
    setEditVac(null)
    setVacForm({name:'', start_date:'', end_date:'', academic_year:activeYear})
    setVacModal(true)
  }
  const openEditVac = (v) => {
    setEditVac(v)
    setVacForm({...v})
    setVacModal(true)
  }
  const saveVac = () => {
    if(!vacForm.name||!vacForm.start_date||!vacForm.end_date) return
    let updated
    if(editVac) {
      updated = vacations.map(v => v.id===editVac.id ? {...vacForm, id:editVac.id} : v)
    } else {
      updated = [...vacations, {...vacForm, id: Date.now().toString(), academic_year:activeYear}]
    }
    setForm(p=>({...p, vacations:updated}))
    setVacModal(false)
  }
  const delVac = (id) => {
    setForm(p=>({...p, vacations:(p.vacations||[]).filter(v=>v.id!==id)}))
  }

  const openAddHol = () => {
    setEditHol(null)
    setHolForm({name:'', date:''})
    setHolModal(true)
  }
  const openEditHol = (h) => {
    setEditHol(h)
    setHolForm({...h})
    setHolModal(true)
  }
  const saveHol = () => {
    if(!holForm.name||!holForm.date) return
    let updated
    if(editHol) {
      updated = customHols.map(h => h.id===editHol.id ? {...holForm, id:editHol.id} : h)
    } else {
      updated = [...customHols, {...holForm, id: Date.now().toString()}]
    }
    setForm(p=>({...p, custom_holidays:updated}))
    setHolModal(false)
  }
  const delHol = (id) => {
    setForm(p=>({...p, custom_holidays:(p.custom_holidays||[]).filter(h=>h.id!==id)}))
  }

  const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '--'

  return (
    <Card>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <SectionTitle style={{marginBottom:0}}>Academic Calendar</SectionTitle>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setVacTab('vacations')}
            style={{padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',
              background:vacTab==='vacations'?'var(--ink4)':'transparent',
              color:vacTab==='vacations'?'var(--white)':'var(--mist3)',
              border:`1px solid ${vacTab==='vacations'?'var(--line2)':'var(--line)'}`,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
            Vacation Periods
          </button>
          <button onClick={()=>setVacTab('holidays')}
            style={{padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',
              background:vacTab==='holidays'?'var(--ink4)':'transparent',
              color:vacTab==='holidays'?'var(--white)':'var(--mist3)',
              border:`1px solid ${vacTab==='holidays'?'var(--line2)':'var(--line)'}`,fontFamily:"'Cabinet Grotesk',sans-serif"}}>
            Public Holidays
          </button>
        </div>
      </div>

      {vacTab==='vacations' && (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <p style={{fontSize:12,color:'var(--mist2)',lineHeight:1.6}}>
              Attendance marking is blocked on all dates within these periods for <strong style={{color:'var(--gold)'}}>{activeYear}</strong>.
            </p>
            <Btn size='sm' onClick={openAddVac} style={{flexShrink:0,marginLeft:16}}>+ Add Period</Btn>
          </div>
          {yearVacs.length===0 ? (
            <div style={{padding:'24px',textAlign:'center',color:'var(--mist3)',fontSize:13,background:'var(--ink3)',borderRadius:'var(--r-sm)'}}>
              No vacation periods set for {activeYear}.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {yearVacs.map(v=>(
                <div key={v.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'rgba(91,168,245,0.06)',border:'1px solid rgba(91,168,245,0.15)',borderRadius:'var(--r-sm)',gap:12,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--sky)',marginBottom:3}}>{v.name}</div>
                    <div style={{fontSize:11,color:'var(--mist3)'}}>{fmtD(v.start_date)} — {fmtD(v.end_date)}</div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>openEditVac(v)} style={{background:'transparent',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--mist2)',fontSize:11,padding:'4px 10px',cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif"}}>Edit</button>
                    <button onClick={()=>delVac(v.id)} style={{background:'transparent',border:'1px solid rgba(240,107,122,0.3)',borderRadius:'var(--r-sm)',color:'var(--rose)',fontSize:11,padding:'4px 10px',cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif"}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {vacTab==='holidays' && (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <p style={{fontSize:12,color:'var(--mist2)',lineHeight:1.6}}>
              Ghana public holidays are pre-loaded and block attendance automatically. Add school-specific holidays below.
            </p>
            <Btn size='sm' onClick={openAddHol} style={{flexShrink:0,marginLeft:16}}>+ Add Holiday</Btn>
          </div>

          {/* Ghana pre-loaded */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Ghana National Holidays (Pre-loaded)</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {GHANA_PUBLIC_HOLIDAYS.map(h=>(
                <div key={h.id} style={{fontSize:11,color:'var(--mist2)',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:4,padding:'3px 10px'}}>
                  {h.name} <span style={{color:'var(--mist3)',marginLeft:4}}>{String(h.month).padStart(2,'0')}/{String(h.day).padStart(2,'0')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom holidays */}
          <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>School-specific Holidays</div>
          {customHols.length===0 ? (
            <div style={{padding:'18px',textAlign:'center',color:'var(--mist3)',fontSize:13,background:'var(--ink3)',borderRadius:'var(--r-sm)'}}>
              No custom holidays added.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {customHols.map(h=>(
                <div key={h.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'rgba(45,212,160,0.05)',border:'1px solid rgba(45,212,160,0.15)',borderRadius:'var(--r-sm)',gap:12,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--emerald)',marginBottom:2}}>{h.name}</div>
                    <div style={{fontSize:11,color:'var(--mist3)'}}>{fmtD(h.date)}</div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>openEditHol(h)} style={{background:'transparent',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',color:'var(--mist2)',fontSize:11,padding:'4px 10px',cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif"}}>Edit</button>
                    <button onClick={()=>delHol(h.id)} style={{background:'transparent',border:'1px solid rgba(240,107,122,0.3)',borderRadius:'var(--r-sm)',color:'var(--rose)',fontSize:11,padding:'4px 10px',cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif"}}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vacation Modal */}
      {vacModal && (
        <Modal title={editVac?'Edit Vacation Period':'Add Vacation Period'} onClose={()=>setVacModal(false)} width={440}>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Name</div>
            <input value={vacForm.name} onChange={e=>setVacForm(p=>({...p,name:e.target.value}))} placeholder='e.g. Christmas Break'
              style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13,fontFamily:"'Cabinet Grotesk',sans-serif"}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Start Date</div>
              <input type='date' value={vacForm.start_date} onChange={e=>setVacForm(p=>({...p,start_date:e.target.value}))}
                style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13}}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>End Date</div>
              <input type='date' value={vacForm.end_date} onChange={e=>setVacForm(p=>({...p,end_date:e.target.value}))}
                style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13}}/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
            <Btn variant='ghost' onClick={()=>setVacModal(false)}>Cancel</Btn>
            <Btn onClick={saveVac} disabled={!vacForm.name||!vacForm.start_date||!vacForm.end_date}>
              {editVac?'Save Changes':'Add Period'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Holiday Modal */}
      {holModal && (
        <Modal title={editHol?'Edit Holiday':'Add Holiday'} onClose={()=>setHolModal(false)} width={400}>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Holiday Name</div>
            <input value={holForm.name} onChange={e=>setHolForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Founder's Day (School)"
              style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13,fontFamily:"'Cabinet Grotesk',sans-serif"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Date</div>
            <input type='date' value={holForm.date} onChange={e=>setHolForm(p=>({...p,date:e.target.value}))}
              style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
            <Btn variant='ghost' onClick={()=>setHolModal(false)}>Cancel</Btn>
            <Btn onClick={saveHol} disabled={!holForm.name||!holForm.date}>
              {editHol?'Save Changes':'Add Holiday'}
            </Btn>
          </div>
        </Modal>
      )}
    </Card>
  )
}

// ── CLASSES ────────────────────────────────────────────────────
function Classes({profile,data,setData,toast,activeYear,isViewingPast}) {
  const {classes=[],subjects=[],students=[]} = data
  const [allUsers,setAllUsers] = useState([])
  const [selected,setSelected] = useState(null)
  const [classModal,setClassModal] = useState(false)
  const [subjectModal,setSubjectModal] = useState(false)
  const [promoModal,setPromoModal]     = useState(false)
  const [promoStep,setPromoStep]       = useState(1)
  const [promoSource,setPromoSource]   = useState('')
  const [promoDest,setPromoDest]       = useState('')
  const [promoStudents,setPromoStudents] = useState([])
  const [promoting,setPromoting]       = useState(false)
  const [bulkModal,setBulkModal]       = useState(false)
  const [bulkStep,setBulkStep]         = useState(1)
  const [bulkStudents,setBulkStudents] = useState([]) // [{student, fromClass, toClass, action}]
  const [dragging,setDragging]         = useState(null)
  const [expandedBulkClass,setExpandedBulkClass] = useState(null)
  const [editC,setEditC] = useState(null)
  const [editS,setEditS] = useState(null)
  const [cf,setCf] = useState({})
  const [sf,setSf] = useState({})
  const [saving,setSaving] = useState(false)
  const fc = k=>v=>setCf(p=>({...p,[k]:v}))
  const fs = k=>v=>setSf(p=>({...p,[k]:v}))
  useEffect(()=>{ supabase.from('profiles').select('*').then(({data})=>{ if(data) setAllUsers(data) }) },[])
  const teachers = allUsers.filter(u=>u.role==='classteacher')
  // Both subject teachers AND class teachers can be assigned to subjects
  const subjectTeachers = allUsers.filter(u=>u.role==='teacher'||u.role==='classteacher')

  const deleteClass = async cls=>{
    const hasStudents = students.some(s=>s.class_id===cls.id)
    const hasSubjects = subjects.some(s=>s.class_id===cls.id)
    if(hasStudents){toast('Cannot delete -- this class has students assigned to it.','error');return}
    if(hasSubjects){toast('Cannot delete -- this class has subjects. Remove them first.','error');return}
    if(!confirm('Delete "'+cls.name+'"? This cannot be undone.')) return
    const {error}=await supabase.from('classes').delete().eq('id',cls.id)
    if(error){toast(error.message,'error');return}
    if(cls.class_teacher_id)
      await supabase.from('profiles').update({class_id:null}).eq('id',cls.class_teacher_id)
    setData(p=>({...p,classes:p.classes.filter(c=>c.id!==cls.id)}))
    if(selected?.id===cls.id) setSelected(null)
    toast('"'+cls.name+'" deleted.')
  }

  // Classes sorted by sort_order, then alphabetically
  const orderedClasses = [...classes].sort((a,b)=>{
    if(a.sort_order!=null && b.sort_order!=null) return a.sort_order - b.sort_order
    if(a.sort_order!=null) return -1
    if(b.sort_order!=null) return 1
    return a.name.localeCompare(b.name)
  })

  // Drag to reorder
  const handleDragStart = (e, idx) => { setDragging(idx); e.dataTransfer.effectAllowed='move' }
  const handleDragOver  = (e, idx) => { e.preventDefault(); e.dataTransfer.dropEffect='move' }
  const handleDrop      = async (e, idx) => {
    e.preventDefault()
    if(dragging===null||dragging===idx) return
    const reordered = [...orderedClasses]
    const [moved]   = reordered.splice(dragging, 1)
    reordered.splice(idx, 0, moved)
    // Save new sort_order
    const updates = reordered.map((c,i)=>supabase.from('classes').update({sort_order:i}).eq('id',c.id))
    await Promise.all(updates)
    setData(p=>({...p, classes: p.classes.map(c=>{ const idx=reordered.findIndex(r=>r.id===c.id); return idx>=0?{...c,sort_order:idx}:c })}))
    setDragging(null)
  }

  const openPromo = ()=>{setPromoStep(1);setPromoSource('');setPromoDest('');setPromoStudents([]);setPromoModal(true)}

  const buildPromoStudents = (srcId,dstId)=>{
    const src=students.filter(s=>s.class_id===srcId)
    // If no destination or source is terminal, default to graduate
    const srcClass = classes.find(c=>c.id===srcId)
    const defaultAction = (!dstId || srcClass?.is_terminal) ? 'graduate' : 'promote'
    setPromoStudents(src.map(s=>({student:s,destClassId:dstId||'',action:defaultAction})))
  }

  // Bulk promote: build all class chains at once
  const openBulkPromo = () => {
    if(orderedClasses.length<2){ toast('You need at least 2 classes to bulk promote.','error'); return }
    // Build student list: each student gets assigned to next class or graduates
    const rows = []
    orderedClasses.forEach((cls,i)=>{
      const nextClass = !cls.is_terminal ? orderedClasses[i+1] : null
      const classStudents = students.filter(s=>s.class_id===cls.id)
      classStudents.forEach(s=>{
        rows.push({
          student:   s,
          fromClass: cls,
          toClass:   nextClass||null,
          action:    cls.is_terminal ? 'graduate' : (nextClass ? 'promote' : 'graduate'),
          destClassId: nextClass?.id||''
        })
      })
    })
    setBulkStudents(rows)
    setBulkStep(1)
    setBulkModal(true)
  }

  const confirmBulkPromo = async () => {
    setPromoting(true)
    const toPromote  = bulkStudents.filter(p=>p.action==='promote')
    const toRepeat   = bulkStudents.filter(p=>p.action==='repeat')
    const toGraduate = bulkStudents.filter(p=>p.action==='graduate')
    // Write enrolment history
    const enrolmentRows = bulkStudents.map(p=>({student_id:p.student.id,class_id:p.fromClass.id,academic_year:activeYear}))
    await supabase.from('student_year_enrolment').upsert(enrolmentRows,{onConflict:'student_id,academic_year'})
    for(const p of toPromote)
      await supabase.from('students').update({class_id:p.destClassId}).eq('id',p.student.id)
    for(const p of toGraduate)
      await supabase.from('students').update({archived:true,class_id:null,graduation_year:activeYear}).eq('id',p.student.id)
    const destMap     = Object.fromEntries(toPromote.map(p=>[p.student.id,p.destClassId]))
    const gradIds     = toGraduate.map(p=>p.student.id)
    const promoteIds  = toPromote.map(p=>p.student.id)
    setData(prev=>({...prev,students:prev.students.map(s=>{
      if(promoteIds.includes(s.id)) return {...s,class_id:destMap[s.id]}
      if(gradIds.includes(s.id))    return {...s,archived:true,class_id:null}
      return s
    })}))
    auditLog(profile,'Students','Bulk Promote',`${toPromote.length} promoted, ${toGraduate.length} graduated, ${toRepeat.length} repeating`,{},{},{})
    setPromoting(false); setBulkModal(false)
    const parts=[]
    if(toPromote.length)  parts.push(toPromote.length+' promoted')
    if(toGraduate.length) parts.push(toGraduate.length+' graduated')
    if(toRepeat.length)   parts.push(toRepeat.length+' staying back')
    toast(parts.join(', ')+'.')
  }

  const confirmPromo = async ()=>{
    setPromoting(true)
    const toPromote  = promoStudents.filter(p=>p.action==='promote')
    const toRepeat   = promoStudents.filter(p=>p.action==='repeat')
    const toGraduate = promoStudents.filter(p=>p.action==='graduate')
    // Write enrolment history for ALL students in source class before moving them
    const enrolmentRows = promoStudents.map(p=>({
      student_id: p.student.id,
      class_id: promoSource,
      academic_year: activeYear
    }))
    // Upsert — avoid duplicates
    await supabase.from('student_year_enrolment').upsert(enrolmentRows, {onConflict:'student_id,academic_year'})
    for(const p of toPromote)
      await supabase.from('students').update({class_id:p.destClassId}).eq('id',p.student.id)
    for(const p of toGraduate)
      await supabase.from('students').update({archived:true,class_id:null,graduation_year:activeYear}).eq('id',p.student.id)
    const promotedIds  = toPromote.map(p=>p.student.id)
    const graduatedIds = toGraduate.map(p=>p.student.id)
    const destMap      = Object.fromEntries(toPromote.map(p=>[p.student.id,p.destClassId]))
    setData(prev=>({...prev,students:prev.students.map(s=>{
      if(promotedIds.includes(s.id))  return {...s,class_id:destMap[s.id]}
      if(graduatedIds.includes(s.id)) return {...s,archived:true,class_id:null}
      return s
    })}))
    setPromoting(false);setPromoModal(false)
    const parts=[]
    if(toPromote.length)  parts.push(toPromote.length+' promoted')
    if(toGraduate.length) parts.push(toGraduate.length+' graduated')
    if(toRepeat.length)   parts.push(toRepeat.length+' staying back')
    toast(''+parts.join(', ')+'.')
  }
  const saveClass = async ()=>{
    if(!cf.name)return; setSaving(true)
    const cleanName = cf.name.replace(/\b\w/g, c=>c.toUpperCase())
    const newTeacherId = cf.class_teacher_id||null
    const payload = {name:cleanName, class_teacher_id:newTeacherId, is_terminal:!!cf.is_terminal}
    if(editC){
      const {error}=await supabase.from('classes').update(payload).eq('id',editC.id)
      if(error){toast(error.message,'error');setSaving(false);return}
      const oldTeacherId = editC.class_teacher_id
      if(oldTeacherId && oldTeacherId!==newTeacherId)
        await supabase.from('profiles').update({class_id:null}).eq('id',oldTeacherId)
      if(newTeacherId)
        await supabase.from('profiles').update({class_id:editC.id}).eq('id',newTeacherId)
      setData(p=>({...p,classes:p.classes.map(c=>c.id===editC.id?{...c,...payload}:c)}))
      toast('Class updated');setClassModal(false)
    } else {
      const maxOrder = Math.max(-1,...classes.map(c=>c.sort_order??-1))
      const {data:row,error}=await supabase.from('classes').insert({...payload,sort_order:maxOrder+1}).select().single()
      if(error){toast(error.message,'error');setSaving(false);return}
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
  const deleteSubject = async (sub) => {
    if(!confirm(`Delete "${sub.name}"? This will also remove all grade records for this subject.`)) return
    setSaving(true)
    // Delete associated grades first
    await supabase.from('grades').delete().eq('subject_id', sub.id)
    const {error} = await supabase.from('subjects').delete().eq('id', sub.id)
    if(error) toast(error.message,'error')
    else {
      setData(p=>({...p,
        subjects: p.subjects.filter(s=>s.id!==sub.id),
        grades:   p.grades.filter(g=>g.subject_id!==sub.id)
      }))
      auditLog(profile,'Classes','Deleted',`Subject: ${sub.name} · ${selected?.name}`,{},sub,null)
      toast(`"${sub.name}" deleted`)
    }
    setSaving(false)
  }
  const classSubjects = selected ? subjects.filter(s=>s.class_id===selected.id) : []
  const classStudents = selected ? students.filter(s=>s.class_id===selected.id) : []
  return (
    <div>
      <PageHeader title='Classes & Subjects' sub={`${classes.length} classes · ${subjects.length} subjects`}>
        {profile?.role==='superadmin' && !isViewingPast && <>
          <Btn variant='ghost' onClick={openBulkPromo}>⬆ Bulk Promote</Btn>
          <Btn variant='ghost' onClick={openPromo}>Promote Class</Btn>
        </>}
        <Btn variant='ghost' onClick={()=>{setSubjectModal(true);setEditS(null);setSf({name:'',code:'',class_id:selected?.id||'',teacher_id:''})}}>+ Subject</Btn>
        {!isViewingPast && <Btn onClick={()=>{setClassModal(true);setEditC(null);setCf({name:'',class_teacher_id:'',is_terminal:false})}}>+ New Class</Btn>}
      </PageHeader>
      <div style={{display:'grid',gridTemplateColumns:selected?'260px 1fr':'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
        {selected ? (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {orderedClasses.map((c,idx)=>{
              const ct=allUsers.find(u=>u.id===c.class_teacher_id)
              const sc=students.filter(s=>s.class_id===c.id).length
              const isS=selected?.id===c.id
              return(
                <div key={c.id}
                  draggable={!isViewingPast}
                  onDragStart={e=>handleDragStart(e,idx)}
                  onDragOver={e=>handleDragOver(e,idx)}
                  onDrop={e=>handleDrop(e,idx)}
                  onClick={()=>setSelected(isS?null:c)}
                  style={{padding:'14px 16px',borderRadius:'var(--r)',cursor:'pointer',background:isS?'var(--ink3)':'var(--ink2)',border:`1px solid ${isS?'var(--gold)':'var(--line)'}`,boxShadow:isS?'var(--sh-gold)':undefined,transition:'all 0.15s',opacity:dragging===idx?0.5:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <span style={{color:'var(--line2)',fontSize:12,cursor:'grab'}}>⠿</span>
                    <span style={{fontWeight:600,fontSize:13,flex:1}}>{c.name}</span>
                    {c.is_terminal && <span style={{fontSize:9,fontWeight:700,color:'var(--rose)',background:'rgba(240,107,122,0.12)',padding:'2px 6px',borderRadius:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Terminal</span>}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,color:'var(--mist3)'}}>{ct?ct.full_name:'No class teacher'}</span>
                    <Badge color='var(--mist3)'>{sc}</Badge>
                  </div>
                </div>
              )
            })}
            <div style={{fontSize:11,color:'var(--mist3)',textAlign:'center',padding:'8px 0'}}>⠿ Drag to reorder</div>
          </div>
        ) : (
          orderedClasses.map((c,idx)=>{
            const ct=allUsers.find(u=>u.id===c.class_teacher_id)
            const sc=students.filter(s=>s.class_id===c.id).length
            const sj=subjects.filter(s=>s.class_id===c.id).length
            return(
              <div key={c.id} className='fu' onClick={()=>setSelected(c)}
                draggable={!isViewingPast}
                onDragStart={e=>handleDragStart(e,idx)}
                onDragOver={e=>handleDragOver(e,idx)}
                onDrop={e=>handleDrop(e,idx)}
                style={{background:'var(--ink2)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,cursor:'pointer',transition:'all 0.15s',opacity:dragging===idx?0.4:1}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--line2)';e.currentTarget.style.background='var(--ink3)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--line)';e.currentTarget.style.background='var(--ink2)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{color:'var(--line2)',fontSize:14}}>⠿</span>
                  <div className='d' style={{fontSize:17,fontWeight:700,flex:1}}>{c.name}</div>
                  {c.is_terminal && <span style={{fontSize:9,fontWeight:700,color:'var(--rose)',background:'rgba(240,107,122,0.12)',padding:'2px 6px',borderRadius:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Terminal</span>}
                </div>
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
                  <p style={{color:'var(--mist2)',fontSize:13,marginTop:4}}>{classStudents.length} students . {classSubjects.length} subjects</p>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Btn variant='ghost' size='sm' onClick={()=>setSelected(null)}>&larr; Back</Btn>
                  <Btn variant='secondary' size='sm' onClick={()=>{setEditC(selected);setCf({...selected,class_teacher_id:selected.class_teacher_id||''});setClassModal(true)}}>Edit</Btn>
                  {profile?.role==='superadmin' && <Btn variant='danger' size='sm' onClick={()=>deleteClass(selected)}>Delete</Btn>}
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
                {key:'teacher_id',label:'Teacher',render:v=>v?allUsers.find(u=>u.id===v)?.full_name||'--':<span style={{color:'var(--mist3)'}}>Unassigned</span>},
                {key:'id',label:'',render:(v,r)=>(
                  <div style={{display:'flex',gap:6}}>
                    <Btn variant='ghost' size='sm' onClick={()=>{setEditS(r);setSf({...r,teacher_id:r.teacher_id||''});setSubjectModal(true)}}>Edit</Btn>
                    {profile?.role==='superadmin' && <Btn variant='danger' size='sm' onClick={()=>deleteSubject(r)}>Delete</Btn>}
                  </div>
                )},
              ]}/>
            </Card>
          </div>
        )}
      </div>
      {classModal && (
        <Modal title={editC?'Edit Class':'New Class'} onClose={()=>setClassModal(false)}>
          <Field label='Class Name' value={cf.name} onChange={fc('name')} placeholder='e.g. Class 6A, JHS 2B, Form 1A' required/>
          <Field label='Class Teacher' value={cf.class_teacher_id} onChange={fc('class_teacher_id')} options={[{value:'',label:'None -- Unassigned'},...teachers.map(t=>({value:t.id,label:t.full_name}))]}/>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'rgba(240,107,122,0.04)',border:'1px solid rgba(240,107,122,0.15)',borderRadius:'var(--r-sm)',marginBottom:16}}>
            <button onClick={()=>setCf(p=>({...p,is_terminal:!p.is_terminal}))}
              style={{width:38,height:22,borderRadius:11,background:cf.is_terminal?'var(--rose)':'var(--line2)',border:'none',cursor:'pointer',transition:'background 0.2s',position:'relative',flexShrink:0}}>
              <div style={{width:16,height:16,borderRadius:'50%',background:'white',position:'absolute',top:3,left:cf.is_terminal?19:3,transition:'left 0.2s'}}/>
            </button>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:cf.is_terminal?'var(--rose)':'var(--mist)'}}>Terminal class</div>
              <div style={{fontSize:11,color:'var(--mist3)',marginTop:1}}>Students in this class graduate instead of being promoted</div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setClassModal(false)}>Cancel</Btn>
            <Btn onClick={saveClass} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Class'}</Btn>
          </div>
        </Modal>
      )}
      {subjectModal && (
        <Modal title={editS?'Edit Subject':'New Subject'} onClose={()=>setSubjectModal(false)}>
          <Field label='Subject Name' value={sf.name} onChange={fs('name')} required/>
          <Field label='Subject Code' value={sf.code} onChange={fs('code')} placeholder='e.g. MTH-101'/>
          <Field label='Assign to Class' value={sf.class_id} onChange={fs('class_id')} required options={classes.map(c=>({value:c.id,label:c.name}))}/>
          <Field label='Assigned Teacher' value={sf.teacher_id} onChange={fs('teacher_id')} options={[{value:'',label:'Unassigned'},...subjectTeachers.map(t=>({value:t.id,label:t.full_name+(t.role==='classteacher'?' (Class Teacher)':'')}))]}/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <Btn variant='ghost' onClick={()=>setSubjectModal(false)}>Cancel</Btn>
            <Btn onClick={saveSubject} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Subject'}</Btn>
          </div>
        </Modal>
      )}


      {bulkModal && (
        <Modal title='Bulk Promote All Classes' subtitle={bulkStep===1?'Review & Adjust':'Confirm'} onClose={()=>setBulkModal(false)} width={720}>
          {bulkStep===1 && (
            <div>
              {/* Warning if no terminal class */}
              {!orderedClasses.some(c=>c.is_terminal) && (
                <div style={{padding:'10px 14px',background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--amber)',marginBottom:16,display:'flex',gap:8,alignItems:'center'}}>
                  <span>⚠</span>
                  <span>No terminal class set. Students in the last class will default to Graduate. Set a terminal class in Classes to be explicit.</span>
                </div>
              )}

              {/* Chain preview */}
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:16,fontSize:12}}>
                {orderedClasses.map((c,i)=>(
                  <span key={c.id} style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:600,color:c.is_terminal?'var(--rose)':'var(--white)'}}>{c.name}</span>
                    {c.is_terminal
                      ? <span style={{color:'var(--rose)',fontSize:10,fontWeight:700}}>→ GRADUATE</span>
                      : i<orderedClasses.length-1
                        ? <span style={{color:'var(--mist3)'}}>→</span>
                        : <span style={{color:'var(--rose)',fontSize:10,fontWeight:700}}>→ GRADUATE</span>
                    }
                  </span>
                ))}
              </div>

              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:12,lineHeight:1.6}}>
                All students are shown below grouped by class. Change individual outcomes before confirming.
              </p>

              {/* Students grouped by class */}
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {orderedClasses.map((cls,ci)=>{
                  const clsStudents = bulkStudents.filter(p=>p.fromClass.id===cls.id)
                  if(!clsStudents.length) return null
                  const nextClass = !cls.is_terminal ? orderedClasses[ci+1] : null
                  const isExpanded = expandedBulkClass===cls.id
                  const repeatCount = clsStudents.filter(p=>p.action==='repeat').length
                  const gradCount   = clsStudents.filter(p=>p.action==='graduate').length
                  const hasOverrides = repeatCount>0 || gradCount>0
                  return (
                    <div key={cls.id} style={{background:'var(--ink3)',borderRadius:'var(--r-sm)',overflow:'hidden',border:`1px solid ${isExpanded?'var(--line2)':'var(--line)'}`}}>
                      {/* Class header — click to expand */}
                      <div onClick={()=>setExpandedBulkClass(isExpanded?null:cls.id)}
                        style={{padding:'12px 16px',background:'var(--ink4)',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
                        <div style={{flex:1,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--white)'}}>{cls.name}</span>
                          <Badge color='var(--mist3)'>{clsStudents.length} students</Badge>
                          {cls.is_terminal && <span style={{fontSize:10,fontWeight:700,color:'var(--rose)',background:'rgba(240,107,122,0.12)',padding:'2px 6px',borderRadius:4,textTransform:'uppercase'}}>Terminal</span>}
                          {hasOverrides && (
                            <span style={{fontSize:11,color:'var(--amber)'}}>
                              {repeatCount>0 && `${repeatCount} repeating`}
                              {repeatCount>0&&gradCount>0&&' · '}
                              {gradCount>0 && `${gradCount} graduating`}
                            </span>
                          )}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <span style={{fontSize:12,fontWeight:600}}>
                            {cls.is_terminal || !nextClass
                              ? <span style={{color:'var(--rose)'}}>→ Graduate</span>
                              : <span style={{color:'var(--emerald)'}}>→ {nextClass.name}</span>
                            }
                          </span>
                          <span style={{fontSize:11,color:'var(--mist3)',transform:isExpanded?'rotate(180deg)':'none',transition:'transform 0.2s',display:'inline-block'}}>▾</span>
                        </div>
                      </div>

                      {/* Expanded students */}
                      {isExpanded && (
                        <div>
                          {/* Class-level bulk actions */}
                          <div style={{padding:'8px 16px',background:'var(--ink3)',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:11,color:'var(--mist3)',marginRight:4}}>Set all to:</span>
                            {['promote','repeat','graduate'].map(a=>(
                              <button key={a} onClick={e=>{
                                e.stopPropagation()
                                const defaultDest = nextClass?.id||''
                                setBulkStudents(prev=>prev.map(x=>
                                  x.fromClass.id===cls.id ? {...x,action:a,destClassId:a==='promote'?(x.destClassId||defaultDest):x.destClassId} : x
                                ))
                              }}
                                style={{padding:'3px 10px',fontSize:11,fontWeight:600,borderRadius:'var(--r-sm)',cursor:'pointer',border:'1px solid var(--line)',
                                  background:'var(--ink4)',color:a==='promote'?'var(--emerald)':a==='repeat'?'var(--amber)':'var(--rose)'}}>
                                {a.charAt(0).toUpperCase()+a.slice(1)} All
                              </button>
                            ))}
                          </div>
                          {/* Individual students */}
                          <div style={{display:'flex',flexDirection:'column'}}>
                            {clsStudents.map((p,i)=>{
                              const globalIdx = bulkStudents.findIndex(x=>x.student.id===p.student.id)
                              return (
                                <div key={p.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',borderBottom:i<clsStudents.length-1?'1px solid var(--line)':'none',background:p.action==='graduate'?'rgba(240,107,122,0.04)':p.action==='repeat'?'rgba(251,159,58,0.04)':'transparent'}}>
                                  <Avatar name={`${p.student.first_name} ${p.student.last_name}`} size={24}/>
                                  <span style={{flex:1,fontSize:13,fontWeight:500}}>{p.student.first_name} {p.student.last_name}</span>
                                  <div style={{display:'flex',gap:5}}>
                                    {['promote','repeat','graduate'].map(a=>(
                                      <button key={a} onClick={()=>setBulkStudents(prev=>prev.map((x,j)=>j===globalIdx?{...x,action:a}:x))}
                                        style={{padding:'3px 9px',fontSize:11,fontWeight:600,borderRadius:'var(--r-sm)',cursor:'pointer',border:'1px solid',
                                          background:p.action===a?(a==='promote'?'rgba(45,212,160,0.15)':a==='repeat'?'rgba(251,159,58,0.15)':'rgba(240,107,122,0.15)'):'transparent',
                                          color:p.action===a?(a==='promote'?'var(--emerald)':a==='repeat'?'var(--amber)':'var(--rose)'):'var(--mist3)',
                                          borderColor:p.action===a?(a==='promote'?'var(--emerald)':a==='repeat'?'var(--amber)':'var(--rose)'):'var(--line)'}}>
                                        {a.charAt(0).toUpperCase()+a.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                  {p.action==='promote' && (
                                    <select value={p.destClassId}
                                      onChange={e=>setBulkStudents(prev=>prev.map((x,j)=>j===globalIdx?{...x,destClassId:e.target.value}:x))}
                                      style={{background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'4px 8px',color:'var(--mist)',fontSize:11,cursor:'pointer'}}>
                                      {orderedClasses.filter(c=>c.id!==cls.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div style={{padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:16,display:'flex',gap:20,fontSize:12}}>
                <span style={{color:'var(--emerald)'}}>{bulkStudents.filter(p=>p.action==='promote').length} promoting</span>
                <span style={{color:'var(--amber)'}}>{bulkStudents.filter(p=>p.action==='repeat').length} repeating</span>
                <span style={{color:'var(--rose)'}}>{bulkStudents.filter(p=>p.action==='graduate').length} graduating</span>
                <span style={{color:'var(--mist3)'}}>{bulkStudents.length} total students</span>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setBulkModal(false)}>Cancel</Btn>
                <Btn onClick={()=>setBulkStep(2)}>Next - Preview & Confirm</Btn>
              </div>
            </div>
          )}

          {bulkStep===2 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
                Final review. <strong style={{color:'var(--rose)'}}>This cannot be undone.</strong> All promotions happen at once.
              </p>
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,marginBottom:16,maxHeight:360,overflowY:'auto'}}>
                {orderedClasses.map(cls=>{
                  const forClass = bulkStudents.filter(p=>p.fromClass.id===cls.id)
                  if(!forClass.length) return null
                  return (
                    <div key={cls.id} style={{marginBottom:14}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,paddingBottom:4,borderBottom:'1px solid var(--line)'}}>{cls.name}</div>
                      {forClass.map(p=>(
                        <div key={p.student.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0'}}>
                          <span style={{fontWeight:500}}>{p.student.first_name} {p.student.last_name}</span>
                          {p.action==='promote'  && <span style={{color:'var(--emerald)'}}>→ {orderedClasses.find(c=>c.id===p.destClassId)?.name}</span>}
                          {p.action==='repeat'   && <span style={{color:'var(--amber)'}}>Repeating {cls.name}</span>}
                          {p.action==='graduate' && <span style={{color:'var(--rose)'}}>Graduated — archived</span>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div style={{padding:'10px 14px',background:'rgba(232,184,75,0.06)',border:'1px solid rgba(232,184,75,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--mist2)',marginBottom:16}}>
                ⚠ Outstanding fee balances carry over automatically. Archived students' full history is preserved.
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setBulkStep(1)}>← Back</Btn>
                <Btn onClick={confirmBulkPromo} disabled={promoting}>{promoting?<><Spinner/> Promoting...</>:'Confirm Bulk Promotion'}</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
      {promoModal && (
        <Modal title='Promote Students' subtitle={`Step ${promoStep} of 3`} onClose={()=>setPromoModal(false)} width={620}>
          {promoStep===1 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:20,lineHeight:1.6}}>Select the class to promote from and the class students will move to. You can adjust individual students on the next step.</p>
              <Field label='Promote FROM (current class)' value={promoSource} onChange={v=>{setPromoSource(v);setPromoDest('')}}
                options={[{value:'',label:'Select a class...'},...classes.map(c=>({value:c.id,label:`${c.name} (${students.filter(s=>s.class_id===c.id).length} students)`}))]}/>
              {promoSource && (
                <>
                  {classes.find(c=>c.id===promoSource)?.is_terminal
                    ? <div style={{padding:'10px 14px',background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--rose)',marginBottom:8}}>This is a terminal class — students will default to Graduate.</div>
                    : <Field label='Default destination class (optional)' value={promoDest} onChange={setPromoDest}
                        options={[{value:'',label:'Leave blank to default all to Graduate'},...orderedClasses.filter(c=>c.id!==promoSource).map(c=>({value:c.id,label:c.name}))]}/>
                  }
                </>
              )}
              {promoSource && students.filter(s=>s.class_id===promoSource).length===0 && (
                <div style={{padding:'12px 16px',background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)',fontSize:13,color:'var(--rose)',marginTop:8}}>This class has no students.</div>
              )}
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
                <Btn variant='ghost' onClick={()=>setPromoModal(false)}>Cancel</Btn>
                <Btn disabled={!promoSource||students.filter(s=>s.class_id===promoSource).length===0}
                  onClick={()=>{buildPromoStudents(promoSource,promoDest);setPromoStep(2)}}>Next - Review Students</Btn>
              </div>
            </div>
          )}

          {promoStep===2 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
                Set each student's outcome. <strong style={{color:'var(--white)'}}>Promote</strong> moves them to a class. <strong style={{color:'var(--amber)'}}>Repeat</strong> keeps them in <strong style={{color:'var(--gold)'}}>{classes.find(c=>c.id===promoSource)?.name}</strong>. <strong style={{color:'var(--rose)'}}>Graduate</strong> archives them -- they leave the school.
              </p>
              <div style={{maxHeight:340,overflowY:'auto',display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
                {promoStudents.map((p,i)=>(
                  <div key={p.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${p.action==='graduate'?'rgba(240,107,122,0.3)':p.action==='repeat'?'rgba(251,159,58,0.3)':'var(--line)'}`}}>
                    <Avatar name={`${p.student.first_name} ${p.student.last_name}`} size={28}/>
                    <div style={{flex:1,fontSize:13,fontWeight:500}}>{p.student.first_name} {p.student.last_name}</div>
                    <div style={{display:'flex',gap:6}}>
                      {['promote','repeat','graduate'].map(a=>(
                        <button key={a} onClick={()=>setPromoStudents(prev=>prev.map((x,j)=>j===i?{...x,action:a}:x))}
                          style={{padding:'4px 10px',fontSize:11,fontWeight:600,borderRadius:'var(--r-sm)',cursor:'pointer',border:'1px solid',
                            background:p.action===a?(a==='promote'?'rgba(45,212,160,0.15)':a==='repeat'?'rgba(251,159,58,0.15)':'rgba(240,107,122,0.15)'):'transparent',
                            color:p.action===a?(a==='promote'?'var(--emerald)':a==='repeat'?'var(--amber)':'var(--rose)'):'var(--mist3)',
                            borderColor:p.action===a?(a==='promote'?'var(--emerald)':a==='repeat'?'var(--amber)':'var(--rose)'):'var(--line)'}}>
                          {a.charAt(0).toUpperCase()+a.slice(1)}
                        </button>
                      ))}
                    </div>
                    {p.action==='promote' && (
                      <select value={p.destClassId} onChange={e=>setPromoStudents(prev=>prev.map((x,j)=>j===i?{...x,destClassId:e.target.value}:x))}
                        style={{background:'var(--ink4)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'5px 10px',color:'var(--mist)',fontSize:12,cursor:'pointer'}}>
                        {classes.filter(c=>c.id!==promoSource).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',marginBottom:16,fontSize:12,color:'var(--mist2)',display:'flex',gap:16}}>
                <span style={{color:'var(--emerald)'}}>{promoStudents.filter(p=>p.action==='promote').length} promoting</span>
                <span style={{color:'var(--amber)'}}>{promoStudents.filter(p=>p.action==='repeat').length} repeating</span>
                <span style={{color:'var(--rose)'}}>{promoStudents.filter(p=>p.action==='graduate').length} graduating</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setPromoStep(1)}>&larr; Back</Btn>
                <Btn onClick={()=>setPromoStep(3)}>Next - Preview & Confirm</Btn>
              </div>
            </div>
          )}

          {promoStep===3 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>Review what will happen then confirm. <strong style={{color:'var(--rose)'}}>This cannot be undone.</strong></p>
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,marginBottom:16,maxHeight:320,overflowY:'auto'}}>
                {promoStudents.filter(p=>p.action==='promote').map(p=>(
                  <div key={p.student.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid var(--line)'}}>
                    <span style={{fontWeight:500}}>{p.student.first_name} {p.student.last_name}</span>
                    <span style={{color:'var(--emerald)'}}>&rarr; {classes.find(c=>c.id===p.destClassId)?.name}</span>
                  </div>
                ))}
                {promoStudents.filter(p=>p.action==='repeat').map(p=>(
                  <div key={p.student.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid var(--line)',opacity:0.6}}>
                    <span style={{fontWeight:500}}>{p.student.first_name} {p.student.last_name}</span>
                    <span style={{color:'var(--amber)'}}>Repeating — stays in {classes.find(c=>c.id===promoSource)?.name}</span>
                  </div>
                ))}
                {promoStudents.filter(p=>p.action==='graduate').map(p=>(
                  <div key={p.student.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid var(--line)',opacity:0.6}}>
                    <span style={{fontWeight:500}}>{p.student.first_name} {p.student.last_name}</span>
                    <span style={{color:'var(--rose)'}}>Graduated — archived</span>
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 14px',background:'rgba(232,184,75,0.06)',border:'1px solid rgba(232,184,75,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--mist2)',marginBottom:16}}>
                (!) Outstanding fee balances carry over automatically. Archived students' full history is preserved.
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setPromoStep(2)}>&larr; Back</Btn>
                <Btn onClick={confirmPromo} disabled={promoting}>{promoting?<><Spinner/> Promoting...</>:'Confirm Promotion'}</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}// ─────────────────────────────────────────────────────────────
// STEP 1: Add this component to App.jsx
// Paste it just above the main `export default function App()`
// ─────────────────────────────────────────────────────────────

function YearSwitcher({ activeYear, currentYear, selectedYear, setSelectedYear, isMobile }) {
  const [open, setOpen] = useState(false)
  const years = generateYears(currentYear)
  const isViewingPast = selectedYear && selectedYear !== currentYear

  const select = (y) => {
    setSelectedYear(y === currentYear ? null : y)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: isMobile ? '3px 8px' : '4px 10px',
          background: isViewingPast ? 'rgba(251,159,58,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isViewingPast ? 'rgba(251,159,58,0.35)' : 'var(--line2)'}`,
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = isViewingPast ? 'rgba(251,159,58,0.15)' : 'rgba(255,255,255,0.07)'
          e.currentTarget.style.borderColor = isViewingPast ? 'rgba(251,159,58,0.5)' : 'var(--mist3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = isViewingPast ? 'rgba(251,159,58,0.1)' : 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor = isViewingPast ? 'rgba(251,159,58,0.35)' : 'var(--line2)'
        }}
      >
        {/* Calendar icon */}
        <svg width={isMobile ? 10 : 11} height={isMobile ? 10 : 11} viewBox="0 0 12 12" fill="none">
          <rect x="1" y="2" width="10" height="9" rx="1.5" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist2)'} strokeWidth="1.2"/>
          <path d="M1 5h10" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist2)'} strokeWidth="1.2"/>
          <path d="M4 1v2M8 1v2" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist2)'} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>

        <span style={{
          fontSize: isMobile ? 10 : 12,
          fontWeight: 600,
          color: isViewingPast ? 'var(--amber)' : 'var(--mist2)',
          letterSpacing: '0.01em',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          lineHeight: 1,
        }}>
          {activeYear}
        </span>

        {/* Chevron */}
        <svg
          width={8} height={8} viewBox="0 0 8 8" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M1.5 2.5L4 5L6.5 2.5" stroke={isViewingPast ? 'var(--amber)' : 'var(--mist3)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Click-outside backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: isMobile ? '50%' : 0,
            transform: isMobile ? 'translateX(-50%)' : 'none',
            zIndex: 999,
            background: 'var(--ink3)',
            border: '1px solid var(--line2)',
            borderRadius: 10,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            minWidth: 170,
            overflow: 'hidden',
            animation: 'fadeUp 0.18s cubic-bezier(.16,1,.3,1) both',
          }}>
            {/* Header */}
            <div style={{
              padding: '10px 14px 8px',
              borderBottom: '1px solid var(--line)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--mist3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Academic Year
            </div>

            {/* Year list */}
            {[...years].reverse().map(y => {
              const isCurrent = y === currentYear
              const isActive = y === activeYear
              return (
                <button
                  key={y}
                  onClick={() => select(y)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 14px',
                    background: isActive ? 'rgba(232,184,75,0.08)' : 'transparent',
                    borderBottom: '1px solid var(--line)',
                    color: isActive ? 'var(--gold)' : isCurrent ? 'var(--white)' : 'var(--mist2)',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s',
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
                      }}>
                        Current
                      </span>
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


// ── ROOT APP ───────────────────────────────────────────────────
export default function App() {
  const [session,setSession]   = useState(null)
  const [profile,setProfile]   = useState(null)

  const [settings,setSettings] = useState(null)
  const [data,setData]         = useState({students:[],classes:[],subjects:[],grades:[],attendance:[],fees:[],payments:[],behaviour:[],announcements:[],enrolments:[],users:[]})
  const [page,setPage]         = useState('dashboard')
  const [collapsed,setCollapsed] = useState(false)
  const [loading,setLoading]   = useState(true)
  const [toast,setToast]       = useState(null)
  const [drawerOpen,setDrawerOpen] = useState(false)
  const [selectedYear,setSelectedYear] = useState(null) // null = current year
  const [newYearModal,setNewYearModal] = useState(false)
  const [newYearStep,setNewYearStep]   = useState(1)
  const [newYearWorking,setNewYearWorking] = useState(false)
  const isMobile = useIsMobile()

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

  // Close drawer on page change
  useEffect(()=>{ setDrawerOpen(false) },[page])

  // Load all data — re-runs when session or selectedYear changes
  const loadData = useCallback(async (yr, prof, settingsRow) => {
    const year = yr || currentYearFromSettings(settingsRow)
    const [
      {data:students},{data:classes},{data:subjects},
      {data:grades},{data:attendance},{data:fees},
      {data:payments},{data:behaviour},{data:announcements},{data:enrolments},{data:users}
    ] = await Promise.all([
      supabase.from('students').select('*').order('student_id'),
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('grades').select('*').eq('year',year),
      supabase.from('attendance').select('*').eq('academic_year',year).order('date',{ascending:false}),
      supabase.from('fees').select('*').or(`academic_year.eq.${year},arrear_from_year.eq.${year}`),
      supabase.from('payments').select('*').order('created_at',{ascending:false}),
      supabase.from('behaviour').select('*').eq('academic_year',year).order('created_at',{ascending:false}),
      supabase.from('announcements').select('*').eq('academic_year',year).order('created_at',{ascending:false}),
      supabase.from('student_year_enrolment').select('*').eq('academic_year',year),
      supabase.from('profiles').select('*'),
    ])
    setData({
      students:students||[], classes:classes||[], subjects:subjects||[],
      grades:grades||[], attendance:attendance||[], fees:fees||[],
      payments:payments||[], behaviour:behaviour||[], announcements:announcements||[], enrolments:enrolments||[],
      users:users||[]
    })
  },[])

  // Load profile + settings first, then data
  useEffect(()=>{
    if(!session){setProfile(null);setLoading(false);return}
    setLoading(true)
    const loadAll = async ()=>{
      const [{data:prof},{data:settingsRow}] = await Promise.all([
        supabase.from('profiles').select('*').eq('id',session.user.id).single(),
        supabase.from('settings').select('*').single(),
      ])
      setProfile(prof)
      setSettings(settingsRow)
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
      await loadData(selectedYear, prof, settingsRow)
      setLoading(false)
    }
    loadAll()
  },[session])

  // Reload data when year changes
  useEffect(()=>{
    if(!session||!settings) return
    loadData(selectedYear, profile, settings)
  },[selectedYear])

  const [newYearTarget,setNewYearTarget] = useState('')

  const logout = async ()=>{ await supabase.auth.signOut(); setPage('dashboard') }

  const confirmNewYear = async () => {
    if(!newYearTarget) return
    setNewYearWorking(true)
    try {
      // 1. Tag all untagged attendance with current year
      await supabase.from('attendance')
        .update({academic_year: activeYear})
        .is('academic_year', null)

      // 2. Tag all untagged fees with current year
      await supabase.from('fees')
        .update({academic_year: activeYear})
        .is('academic_year', null)

      // 3. Tag all untagged behaviour with current year
      await supabase.from('behaviour')
        .update({academic_year: activeYear})
        .is('academic_year', null)

      // 4. Tag all untagged announcements with current year
      await supabase.from('announcements')
        .update({academic_year: activeYear})
        .is('academic_year', null)

      // 5. Tag all untagged grades with current year
      await supabase.from('grades')
        .update({year: activeYear})
        .is('year', null)

      // 6. Write enrolment snapshot — every active student in their current class
      const activeStudents = data.students.filter(s=>!s.archived && s.class_id)
      if(activeStudents.length > 0) {
        const enrolmentRows = activeStudents.map(s=>({
          student_id: s.id,
          class_id: s.class_id,
          academic_year: activeYear
        }))
        // Delete existing enrolments for this year first to avoid duplicates
        await supabase.from('student_year_enrolment')
          .delete().eq('academic_year', activeYear)
        await supabase.from('student_year_enrolment')
          .insert(enrolmentRows)
      }

      // 7. Carry over outstanding fee balances as arrears
      const outstanding = data.fees.filter(f=>Number(f.amount||0)-Number(f.paid||0)>0)
      if(outstanding.length > 0) {
        const arrearRows = outstanding.map(f=>({
          student_id: f.student_id,
          fee_type: f.fee_type + ' (Arrears from ' + activeYear + ')',
          amount: Number(f.amount||0)-Number(f.paid||0),
          paid: 0,
          academic_year: newYearTarget,
          is_arrear: true,
          arrear_from_year: activeYear
        }))
        await supabase.from('fees').insert(arrearRows)
      }

      // 8. Set entry_year on students that don't have one
      await supabase.from('students')
        .update({entry_year: activeYear})
        .is('entry_year', null)

      // 9. Update settings to new year
      await supabase.from('settings')
        .update({academic_year: newYearTarget})
        .eq('id', settings.id)

      setSettings(p=>({...p, academic_year: newYearTarget}))
      setSelectedYear(null) // switch to new current year
      setNewYearModal(false)
      setNewYearStep(1)
      setNewYearTarget('')
      showToast('New academic year ' + newYearTarget + ' started successfully.')
    } catch(err) {
      showToast('Error: ' + err.message, 'error')
    }
    setNewYearWorking(false)
  }

  if(loading) return <><style>{G}</style><LoadingScreen msg={session?'Loading your workspace...':'Initialising...'}/></>
  if(!session||!profile) return <><style>{G}</style><Login onLogin={p=>setProfile(p)}/></>

  const currentYear = currentYearFromSettings(settings)
  const activeYear  = selectedYear || currentYear
  const isViewingPast = selectedYear && selectedYear !== currentYear
  const props = {profile,data,setData,toast:showToast,settings,activeYear,isViewingPast,reloadData:()=>loadData(activeYear,profile,settings)}

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
      case 'settings':     return <Settings     profile={profile} settings={settings} setSettings={setSettings} toast={showToast} activeYear={activeYear} onStartNewYear={()=>setNewYearModal(true)}/>
      case 'auditlog':     return <AuditLog     profile={profile}/>
      default:             return <Dashboard    {...props} onNav={setPage}/>
    }
  }

  const pageTitles = {dashboard:'Dashboard',students:'Students',classes:'Classes & Subjects',grades:'Grades',attendance:'Attendance',fees:'Fees',behaviour:'Behaviour',reports:'Reports',announcements:'Announcements',users:'Users',settings:'Settings',auditlog:'Audit Log'}

  return (
    <>
      <style>{G}</style>
      <div className='grain' style={{display:'flex',height:'100vh',overflow:'hidden'}}>
        <Sidebar profile={profile} active={page} onNav={setPage} collapsed={collapsed} onToggle={()=>setCollapsed(c=>!c)} onLogout={logout} isMobile={isMobile} drawerOpen={drawerOpen} onDrawerClose={()=>setDrawerOpen(false)}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--ink)'}}>
          {/* Topbar */}
          {isMobile ? (
            <div style={{flexShrink:0,borderBottom:'1px solid var(--line)',background:'var(--ink2)'}}>
              <div style={{height:56,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}>
                <button onClick={()=>setDrawerOpen(true)} style={{width:40,height:40,borderRadius:'var(--r-sm)',background:'var(--ink4)',border:'1px solid var(--line)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,flexShrink:0}}>
                  <div style={{width:18,height:1.5,background:'var(--mist2)',borderRadius:1}}/>
                  <div style={{width:18,height:1.5,background:'var(--mist2)',borderRadius:1}}/>
                  <div style={{width:18,height:1.5,background:'var(--mist2)',borderRadius:1}}/>
                </button>
                <span className='d' style={{fontSize:15,fontWeight:700,letterSpacing:'-0.01em'}}>{pageTitles[page]||'SRMS'}</span>
                <Avatar name={profile?.full_name} size={34} color={ROLE_META[profile?.role]?.bg}/>
              </div>
              {/* Mobile year bar — only superadmin sees switcher */}
              <div style={{height:28,display:'flex',alignItems:'center',justifyContent:'center',gap:8,borderTop:'1px solid var(--line)',background:isViewingPast?'rgba(251,159,58,0.06)':'transparent'}}>
                <span style={{fontSize:10,color:'var(--mist3)',letterSpacing:'0.06em'}}>{settings?.school_name||'SRMS'}</span>
                <span style={{color:'var(--line2)',fontSize:10}}>.</span>
                {profile?.role==='superadmin' ? (
                  <YearSwitcher activeYear={activeYear} currentYear={currentYear} selectedYear={selectedYear} setSelectedYear={setSelectedYear} isMobile={true}/>
                ) : (
                  <span style={{fontSize:10,color:'var(--mist3)'}}>{activeYear}</span>
                )}
                {isViewingPast && <span style={{fontSize:9,fontWeight:700,color:'var(--amber)',background:'rgba(251,159,58,0.12)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:3,padding:'1px 6px',letterSpacing:'0.06em'}}>READ ONLY</span>}
              </div>
            </div>
          ) : (
            <div style={{height:56,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',borderBottom:'1px solid var(--line)',background:'var(--ink2)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span className='d' style={{fontSize:12,color:'var(--mist3)',fontWeight:500,letterSpacing:'0.06em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:160}}>{settings?.school_name||'SRMS'}</span>
                <span style={{color:'var(--line2)'}}>.</span>
                {profile?.role==='superadmin' ? (
                  <YearSwitcher activeYear={activeYear} currentYear={currentYear} selectedYear={selectedYear} setSelectedYear={setSelectedYear} isMobile={false}/>
                ) : (
                  <span style={{fontSize:12,color:'var(--mist3)'}}>{activeYear}</span>
                )}
                {isViewingPast && <span style={{fontSize:10,fontWeight:700,color:'var(--amber)',background:'rgba(251,159,58,0.12)',border:'1px solid rgba(251,159,58,0.3)',borderRadius:4,padding:'2px 8px',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>READ ONLY</span>}
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
          )}
          {/* Content */}
          <div style={{flex:1,overflowY:'auto',padding: isMobile ? '20px 16px' : '32px 36px'}}>
            {renderPage()}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} isMobile={isMobile}/>}

      {newYearModal && (
        <Modal title='Start New Academic Year' subtitle={`Closing ${activeYear}`} onClose={()=>!newYearWorking&&setNewYearModal(false)} width={560}>
          {newYearStep===1 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:20,lineHeight:1.7}}>
                Starting a new academic year will archive all current data under <strong style={{color:'var(--gold)'}}>{activeYear}</strong> and open a fresh year. All previous data remains fully accessible by switching the year in the topbar.
              </p>
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:16,marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>What will happen</div>
                {[
                  ['Students','Active students carry over. Promoted/graduated students stay in their new class/archived status.'],
                  ['Grades','All grades are saved under '+activeYear+'. New year starts with no grades.'],
                  ['Attendance','All attendance saved under '+activeYear+'. New year starts fresh.'],
                  ['Fees','Outstanding balances carry over as arrears. Paid fees archived under '+activeYear+'.'],
                  ['Behaviour','Records carry over -- full history always visible.'],
                  ['Announcements','Current announcements archived. New year starts clean.'],
                ].map(([title,desc])=>(
                  <div key={title} style={{display:'flex',gap:10,marginBottom:10}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:'var(--emerald)',marginTop:5,flexShrink:0}}/>
                    <div><strong style={{fontSize:13}}>{title}</strong><span style={{fontSize:12,color:'var(--mist2)',marginLeft:8}}>{desc}</span></div>
                  </div>
                ))}
              </div>
              <div style={{padding:'12px 16px',background:'rgba(240,107,122,0.06)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--mist2)',marginBottom:20}}>
                (!) Make sure all promotions are complete before starting a new year. This cannot be undone.
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setNewYearModal(false)}>Cancel</Btn>
                <Btn onClick={()=>setNewYearStep(2)}>Continue &rarr;</Btn>
              </div>
            </div>
          )}
          {newYearStep===2 && (
            <div>
              <p style={{fontSize:13,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>Select the new academic year to open:</p>
              <Field label='New Academic Year' value={newYearTarget||''} onChange={v=>setNewYearTarget(v)}
                options={generateYears(currentYear).filter(y=>y>currentYear).map(y=>({value:y,label:y}))}/>
              <p style={{fontSize:12,color:'var(--mist3)',marginBottom:20}}>All existing data will be saved under <strong style={{color:'var(--gold)'}}>{activeYear}</strong>.</p>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setNewYearStep(1)}>&larr; Back</Btn>
                <Btn disabled={!newYearTarget} onClick={()=>setNewYearStep(3)}>Review &rarr;</Btn>
              </div>
            </div>
          )}
          {newYearStep===3 && (
            <div>
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:20,marginBottom:20,textAlign:'center'}}>
                <div style={{fontSize:12,color:'var(--mist3)',marginBottom:8}}>Closing</div>
                <div className='d' style={{fontSize:28,fontWeight:700,color:'var(--rose)',marginBottom:16}}>{activeYear}</div>
                <div style={{fontSize:18,color:'var(--mist3)',marginBottom:8}}>Opening</div>
                <div className='d' style={{fontSize:28,fontWeight:700,color:'var(--emerald)'}}>{newYearTarget}</div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setNewYearStep(2)}>&larr; Back</Btn>
                <Btn variant='danger' onClick={confirmNewYear} disabled={newYearWorking}>
                  {newYearWorking?<><Spinner/> Processing...</>:'Confirm -- Start New Year'}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}