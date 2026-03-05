import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, CURRENCIES, GHANA_PUBLIC_HOLIDAYS } from '../lib/constants'
import { fmtDate, DEFAULT_GRADING_SCALE, DEFAULT_GRADE_COMPONENTS, getCurrency, fmtMoney, generateYears } from '../lib/helpers'
import { auditLog } from '../lib/auditLog'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import Card from '../components/Card'

export default function Settings({profile,settings,setSettings,toast,activeYear,onStartNewYear}) {
  const [form,setForm]   = useState(()=>{
    const base = JSON.parse(JSON.stringify(settings||{}))
    if(!base.grading_scale||base.grading_scale.length===0)
      base.grading_scale = JSON.parse(JSON.stringify(DEFAULT_GRADING_SCALE))
    return base
  })
  const [saving,setSaving] = useState(false)
  const [weightWarning,setWeightWarning] = useState(false)
  const [logoUploading,setLogoUploading] = useState(false)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const canAdmin = ['superadmin','admin'].includes(profile?.role)

  // Re-sync form when settings prop updates (e.g. loaded after first mount)
  useEffect(()=>{
    if(!settings?.id) return
    setForm(prev => {
      if(prev.id === settings.id) return prev
      const base = JSON.parse(JSON.stringify(settings))
      if(!base.grading_scale||base.grading_scale.length===0)
        base.grading_scale = JSON.parse(JSON.stringify(DEFAULT_GRADING_SCALE))
      return base
    })
  },[settings?.id])

  const gradeComponents = form.grade_components || DEFAULT_GRADE_COMPONENTS
  const activeComps = gradeComponents.filter(c=>c.enabled)
  const totalWeight = activeComps.reduce((a,c)=>a+c.weight,0)
  // Keep a ref so the save closure always reads the latest grade_components
  const gradeComponentsRef = React.useRef(gradeComponents)
  gradeComponentsRef.current = gradeComponents

  const save = async () => {
    if(!form.id){ toast('Settings not loaded yet — please wait and try again.','error'); return }
    if(totalWeight!==100 && activeComps.length>0){
      setWeightWarning(true)
      setTimeout(()=>setWeightWarning(false),4000)
    }
    setSaving(true)
    const payload = {...form, grade_components: gradeComponentsRef.current}
    const {error} = await supabase.from('settings').update(payload).eq('id',form.id).eq('school_id',profile?.school_id)
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
      // Re-fetch from DB to confirm what was actually written
      const {data: freshSettings} = await supabase.from('settings').select('*').eq('id',form.id).single()
      setSettings(freshSettings || payload)
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

  const updGrade = (i,k,v)=>{const g=[...(form.grading_scale||DEFAULT_GRADING_SCALE)];g[i]={...g[i],[k]:k==='letter'||k==='remark'?v:parseFloat(v)||0};setForm(p=>({...p,grading_scale:g}))}

  const addGradeRow    = () => setForm(p=>({...p, grading_scale:[...(p.grading_scale||DEFAULT_GRADING_SCALE), {min:0,max:0,letter:'',gpa:0,remark:''}]}))
  const removeGradeRow = (i) => setForm(p=>({...p, grading_scale:(p.grading_scale||[]).filter((_,idx)=>idx!==i)}))

  const updComponent = (i,k,v) => {
    setForm(p => {
      const comps = [...(p.grade_components || DEFAULT_GRADE_COMPONENTS)]
      comps[i] = {...comps[i],[k]: k==='label'?v : k==='enabled'?v : parseFloat(v)||0}
      return {...p, grade_components: comps}
    })
  }

  const handleToggle = async (i) => {
    let key, label, wasEnabled
    setForm(p => {
      const comps = [...(p.grade_components || DEFAULT_GRADE_COMPONENTS)]
      wasEnabled = comps[i].enabled
      key = comps[i].key
      label = comps[i].label
      comps[i] = {...comps[i], enabled: !wasEnabled}
      return {...p, grade_components: comps}
    })
    if(wasEnabled) {
      await supabase.from('grades').update({[key]:0}).eq('school_id', profile?.school_id)
      auditLog(profile,'Settings','Updated',`Grade component disabled & scores cleared: ${label}`,{component:label},null,null)
      toast(`${label} disabled -- all scores cleared`)
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
            {/* 1-decimal toggle removed */}
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
                {['Min','Max','Letter','GPA','Remark',''].map(h=><th key={h} style={{padding:8,textAlign:'left',fontSize:10,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:"'Clash Display',sans-serif"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(form.grading_scale||DEFAULT_GRADING_SCALE).map((row,i)=>(
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
                    <td style={{padding:'5px 4px'}}>
                      <button onClick={()=>removeGradeRow(i)} style={{width:26,height:26,borderRadius:'var(--r-sm)',background:'var(--rose-bg,rgba(240,107,122,0.08))',border:'1px solid rgba(240,107,122,0.2)',color:'var(--rose)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addGradeRow} style={{marginTop:10,padding:'6px 14px',borderRadius:'var(--r-sm)',background:'var(--ink3)',border:'1px solid var(--line)',color:'var(--mist2)',fontSize:12,cursor:'pointer'}}>+ Add Row</button>
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