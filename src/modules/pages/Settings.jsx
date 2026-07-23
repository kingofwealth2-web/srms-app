import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, CURRENCIES, GHANA_PUBLIC_HOLIDAYS } from '../lib/constants'
import { fmtDate, DEFAULT_GRADING_SCALE, DEFAULT_NUMBER_GRADING_SCALE, DEFAULT_GRADE_COMPONENTS, getCurrency, fmtMoney, generateYears, fullName, compareClasses } from '../lib/helpers'
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
import ConfirmModal from '../components/ConfirmModal'

export default function Settings({profile,settings,setSettings,toast,activeYear,onStartNewYear,data,setData}) {
  const [form,setForm]   = useState(()=>{
    const base = JSON.parse(JSON.stringify(settings||{}))
    if(!base.grading_scale||base.grading_scale.length===0)
      base.grading_scale = JSON.parse(JSON.stringify(DEFAULT_GRADING_SCALE))
    if(!base.grade_system) base.grade_system = 'letter'
    return base
  })
  const [saving,setSaving] = useState(false)
  const [weightWarning,setWeightWarning] = useState(false)
  const [releases,setReleases] = useState([])
  const [relLoading,setRelLoading] = useState(false)
  const [logoUploading,setLogoUploading] = useState(false)
  const [confirmState,setConfirmState]   = useState(null)
  const f = k=>v=>setForm(p=>({...p,[k]:v}))
  const canAdmin = ['superadmin','admin'].includes(profile?.role)

  useEffect(()=>{
    if(!profile?.school_id) return
    supabase.from('grade_releases').select('*').eq('school_id',profile?.school_id)
      .then(({data,error})=>{
        if(error) toast('Failed to load grade release status: '+error.message,'error')
        else if(data) setReleases(data)
      })
  },[profile?.school_id])

  const periods = settings?.period_type==='term'
    ? Array.from({length:settings?.period_count||2},(_,i)=>`Term ${i+1}`)
    : Array.from({length:settings?.period_count||2},(_,i)=>`Semester ${i+1}`)

  const toggleRelease = async (year, period) => {
    const existing = releases.find(r=>r.academic_year===year&&r.period===period)
    setRelLoading(true)
    if(existing){
      const {error} = await supabase.from('grade_releases').delete().eq('id',existing.id)
      if(error){
        toast('Failed to unrelease grades: '+error.message,'error')
      } else {
        setReleases(p=>p.filter(r=>r.id!==existing.id))
        auditLog(profile,'Settings','Grade Unreleased',`${year} · ${period}`,{year,period},null,null)
      }
    } else {
      const {data:row,error} = await supabase.from('grade_releases').insert({
        school_id: profile?.school_id,
        academic_year: year,
        period,
        released_by: profile?.id,
      }).select().single()
      if(error){
        toast('Failed to release grades: '+error.message,'error')
      } else if(row){
        setReleases(p=>[...p,row])
        auditLog(profile,'Settings','Grade Released',`${year} · ${period}`,{year,period},null,null)
      }
    }
    setRelLoading(false)
  }


  const gradeComponents = form.grade_components || DEFAULT_GRADE_COMPONENTS
  const activeComps = gradeComponents.filter(c=>c.enabled)
  const totalWeight = activeComps.reduce((a,c)=>a+c.weight,0)

  const save = async () => {
    if(!form.id){ toast('Settings not loaded yet — please wait and try again.','error'); return }
    if(totalWeight!==100 && activeComps.length>0){
      setWeightWarning(true)
      setTimeout(()=>setWeightWarning(false),4000)
    }

    // Check if prefix changed — if so, confirm migration first
    const oldPrefix = settings?.student_id_prefix||'STU'
    const newPrefix = (form.student_id_prefix||'STU').trim().toUpperCase()
    const students  = data?.students||[]
    const prefixChanged = newPrefix && newPrefix!==oldPrefix

    if(prefixChanged && students.length>0){
      setConfirmState({
        title: 'Rename all Student IDs?',
        body: `This will update all ${students.length} student ID${students.length!==1?'s':''} from ${oldPrefix}-XXXX to ${newPrefix}-XXXX. Any printed records with old IDs will no longer match. This cannot be undone.`,
        icon: '🔁',
        danger: true,
        confirmLabel: 'Yes, rename all',
        onConfirm: () => doSave(newPrefix, true)
      })
      return
    }

    doSave(newPrefix, false)
  }

  const doSave = async (newPrefix, migrateIds) => {
    setSaving(true)
    const payload = {...form, student_id_prefix: newPrefix, grade_components: gradeComponents}

    // Migrate student IDs if prefix changed
    if(migrateIds){
      const students = data?.students||[]
      const updates = students.map(s=>{
        const num = s.student_id?.split('-').pop()||'0000'
        return {id:s.id, student_id:`${newPrefix}-${num}`}
      })
      const failed = []
      for(const u of updates){
        const {error} = await supabase.from('students').update({student_id:u.student_id}).eq('id',u.id).eq('school_id',profile?.school_id)
        if(error) failed.push(u.id)
      }
      const succeededIds = new Set(updates.filter(u=>!failed.includes(u.id)).map(u=>u.id))
      if(setData) setData(p=>({...p, students:p.students.map(s=>{
        if(!succeededIds.has(s.id)) return s
        const num = s.student_id?.split('-').pop()||'0000'
        return {...s, student_id:`${newPrefix}-${num}`}
      })}))
      if(failed.length>0){
        toast(`${succeededIds.size} student ID${succeededIds.size!==1?'s':''} renamed -- ${failed.length} failed and were left unchanged. Please retry.`,'error')
      } else {
        toast(`${updates.length} student ID${updates.length!==1?'s':''} renamed to ${newPrefix}-XXXX`)
      }
    }

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
      if(JSON.stringify(settings?.vacations) !== JSON.stringify(payload.vacations)) changes.push('Vacations updated')
      if(JSON.stringify(settings?.aggregate) !== JSON.stringify(payload.aggregate)) changes.push('BECE aggregate config updated')
      if(JSON.stringify(settings?.custom_holidays) !== JSON.stringify(payload.custom_holidays)) changes.push('Custom holidays updated')
      if(JSON.stringify(settings?.disabled_holidays) !== JSON.stringify(payload.disabled_holidays)) changes.push('Ghana holiday overrides updated')
      const desc = changes.length ? changes.join(' · ') : 'No changes detected'
      // Strip logo from diff — base64 strings are too large for audit storage
      const {school_logo:_bl,...settingsBefore} = settings||{}
      const {school_logo:_al,...settingsAfter}  = payload
      auditLog(profile,'Settings','Updated',desc,{},settingsBefore,settingsAfter)
      setSettings(payload)
      setForm(JSON.parse(JSON.stringify(payload)))
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
    const comp = (form.grade_components || DEFAULT_GRADE_COMPONENTS)[i]
    if (comp.enabled) {
      // Disabling clears all scores — require confirmation first
      setConfirmState({
        title: `Disable ${comp.label}?`,
        body: `This will immediately clear all ${comp.label} scores for every student in the current year. This cannot be undone.`,
        icon: '⚠',
        danger: true,
        confirmLabel: 'Disable & Clear Scores',
        onConfirm: async () => {
          setForm(p => {
            const comps = [...(p.grade_components || DEFAULT_GRADE_COMPONENTS)]
            comps[i] = {...comps[i], enabled: false}
            return {...p, grade_components: comps}
          })
          await supabase.from('grades').update({[comp.key]:0}).eq('school_id', profile?.school_id).eq('year', activeYear)
          auditLog(profile,'Settings','Updated',`Grade component disabled & scores cleared: ${comp.label}`,{component:comp.label},null,null)
          toast(`${comp.label} disabled — all scores cleared`)
        }
      })
    } else {
      setForm(p => {
        const comps = [...(p.grade_components || DEFAULT_GRADE_COMPONENTS)]
        comps[i] = {...comps[i], enabled: true}
        return {...p, grade_components: comps}
      })
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

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20,alignItems:'start'}}>
        <div>
          <Card style={{marginBottom:20}}>
            <SectionTitle>School Information</SectionTitle>
            <Field label='School Name'   value={form.school_name}   onChange={f('school_name')} required/>
            <Field label='Address'       value={form.address}       onChange={f('address')}/>
            <Field label='School Motto'  value={form.motto}         onChange={f('motto')}/>
            <Field label='Student ID Prefix' value={form.student_id_prefix||''} onChange={f('student_id_prefix')} placeholder='e.g. GMS, KASS, STU' style={{textTransform:'uppercase'}}/>
            <div style={{fontSize:11,color:'var(--mist3)',marginTop:-10,marginBottom:4}}>Used when generating new student IDs — e.g. <strong>GMS</strong>-0001. Only affects new students.</div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>Academic Year</div>
              <div style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',fontSize:13,color:'var(--mist3)'}}>
                {form.academic_year || activeYear}
              </div>
              <div style={{fontSize:11,color:'var(--mist3)',marginTop:5}}>Use "Start New Academic Year" below to change this.</div>
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
            {/* Decimal scores — future feature */}
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
                  <div style={{display:'flex',gap:16,flexWrap:'wrap',paddingLeft:48,marginTop:4}}>
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
            {/* Grade system toggle */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8,fontFamily:"'Clash Display',sans-serif"}}>Grade Display System</div>
              <div style={{display:'flex',gap:8}}>
                {[{key:'letter',label:'Letter (A, B, C)'},{key:'number',label:'Number (1, 2, 3)'}].map(opt=>(
                  <button key={opt.key} onClick={()=>{
                    const next = opt.key
                    const currentSystem = form.grade_system || 'letter'
                    if(next === currentSystem) return
                    // Switch to default scale for the chosen system
                    const defaultScale = next === 'number'
                      ? JSON.parse(JSON.stringify(DEFAULT_NUMBER_GRADING_SCALE))
                      : JSON.parse(JSON.stringify(DEFAULT_GRADING_SCALE))
                    setForm(p=>({...p, grade_system: next, grading_scale: defaultScale}))
                  }} style={{
                    padding:'7px 16px', borderRadius:'var(--r-sm)', fontSize:12, fontWeight:600,
                    cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                    background: (form.grade_system||'letter')===opt.key ? 'var(--gold)' : 'var(--ink3)',
                    color:       (form.grade_system||'letter')===opt.key ? 'var(--ink)'  : 'var(--mist2)',
                    border:      (form.grade_system||'letter')===opt.key ? 'none'        : '1px solid var(--line2)',
                  }}>{opt.label}</button>
                ))}
              </div>
              <div style={{fontSize:11,color:'var(--mist3)',marginTop:6}}>
                Switching system loads default scale for that system. Customise the rows below as needed.
              </div>
            </div>
            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:420}}>
              <thead><tr style={{borderBottom:'1px solid var(--line)'}}>
                {['Min','Max',(form.grade_system||'letter')==='number'?'Number':'Letter','GPA','Remark',''].map(h=><th key={h} style={{padding:8,textAlign:'left',fontSize:10,color:'var(--mist3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:"'Clash Display',sans-serif"}}>{h}</th>)}
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
            </div>
            <button onClick={addGradeRow} style={{marginTop:10,padding:'6px 14px',borderRadius:'var(--r-sm)',background:'var(--ink3)',border:'1px solid var(--line)',color:'var(--mist2)',fontSize:12,cursor:'pointer'}}>+ Add Row</button>
          </Card>
        </div>
      </div>

      {/* ── GRADE RELEASES ── */}
      {canAdmin && (
        <div style={{marginTop:20}}>
          <Card>
            <SectionTitle>Release Grades to Parents</SectionTitle>
            <p style={{fontSize:12,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
              Control when parents can view their children's grades. Released grades are visible in the Parent Portal. Unreleasing will hide them again immediately.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {periods.map(period=>{
                const released = releases.some(r=>r.academic_year===activeYear&&r.period===period)
                return(
                  <div key={period} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--ink3)',border:`1px solid ${released?'rgba(45,212,160,0.2)':'var(--line)'}`,borderRadius:'var(--r-sm)'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14}}>{activeYear} — {period}</div>
                      <div style={{fontSize:11,color:released?'var(--emerald)':'var(--mist3)',marginTop:2}}>
                        {released?'✓ Visible to parents':'Not yet released to parents'}
                      </div>
                    </div>
                    <Btn variant={released?'ghost':'primary'} size='sm' disabled={relLoading}
                      onClick={()=>toggleRelease(activeYear,period)}>
                      {relLoading?<Spinner/>:released?'Unrelease':'Release Grades →'}
                    </Btn>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── BECE AGGREGATE ── */}
      {canAdmin && (
        <div style={{marginTop:20}}>
          <AggregateSection form={form} setForm={setForm} data={data}/>
        </div>
      )}

      {/* ── OPENING ATTENDANCE BALANCE ── */}
      {profile?.role==='superadmin' && (
        <div style={{marginTop:20}}>
          <OpeningBalanceSection
            profile={profile}
            toast={toast}
            activeYear={activeYear}
            data={data}
            setData={setData}
          />
        </div>
      )}

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
      {confirmState && (
        <ConfirmModal
          title={confirmState.title} body={confirmState.body}
          icon={confirmState.icon} danger={confirmState.danger}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={()=>{ confirmState.onConfirm(); setConfirmState(null) }}
          onCancel={()=>setConfirmState(null)}
        />
      )}
    </div>
  )
}

// ── OPENING ATTENDANCE BALANCE ─────────────────────────────────
// One-time, superadmin-only backfill for attendance history that predates
// live tracking (an outage, or a school onboarding mid-term). Stores an
// aggregate present/total day count per student rather than fabricating
// individual daily records for a period nobody can accurately reconstruct.
function OpeningBalanceSection({profile, toast, activeYear, data, setData}) {
  const classes    = [...(data?.classes || [])].sort(compareClasses)
  const students   = data?.students || []
  const attendance = data?.attendance || []
  const openingBalances = (data?.opening_balances || []).filter(b => b.academic_year === activeYear)

  const [selectedClass, setSelectedClass] = useState('')
  const [label, setLabel]         = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [rows, setRows]           = useState({}) // {studentId: {total, present}}
  const [saving, setSaving]       = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const [editSaving, setEditSaving] = useState(false)

  const classStudents = selectedClass ? students.filter(s => s.class_id === selectedClass && !s.archived) : []
  const setRow = (sid, field, val) => setRows(p => ({...p, [sid]: {...(p[sid]||{}), [field]: val}}))

  const saveEntries = async (entries) => {
    setSaving(true)
    const payload = entries.map(e => ({
      school_id:     profile?.school_id,
      student_id:    e.student.id,
      class_id:      selectedClass,
      academic_year: activeYear,
      label:         label.trim(),
      start_date:    startDate,
      end_date:      endDate,
      total_days:    Number(e.total),
      present_days:  Number(e.present || 0),
      created_by:    profile?.id,
    }))
    const {data: inserted, error} = await supabase.from('attendance_opening_balances').insert(payload).select()
    setSaving(false)
    if (error) { toast('Failed to save: ' + error.message, 'error'); return }
    setData(p => ({...p, opening_balances: [...(p.opening_balances||[]), ...(inserted||[])]}))
    setRows({}); setLabel(''); setStartDate(''); setEndDate('')
    toast(`Saved opening balance for ${entries.length} student${entries.length!==1?'s':''}.`)
  }

  const doSaveEntries = () => {
    const entries = classStudents
      .map(s => ({student: s, total: rows[s.id]?.total, present: rows[s.id]?.present}))
      .filter(e => e.total !== undefined && e.total !== '')

    if (!label.trim())            { toast('Please enter a period label.', 'error'); return }
    if (!startDate || !endDate)   { toast('Please enter a start and end date.', 'error'); return }
    if (endDate < startDate)      { toast('End date must be on or after the start date.', 'error'); return }
    if (entries.length === 0)     { toast("Enter at least one student's total days.", 'error'); return }
    for (const e of entries) {
      const total = Number(e.total), present = Number(e.present || 0)
      if (!total || total <= 0)          { toast(`${fullName(e.student, true)}: Total Days must be greater than 0.`, 'error'); return }
      if (present < 0 || present > total){ toast(`${fullName(e.student, true)}: Present Days must be between 0 and Total Days.`, 'error'); return }
    }

    // Overlap check -- warn (don't block) if real attendance already exists for this window
    const studentIds  = new Set(entries.map(e => e.student.id))
    const overlapping = attendance.filter(a => studentIds.has(a.student_id) && a.date >= startDate && a.date <= endDate)
    if (overlapping.length > 0) {
      setConfirmState({
        title: 'Existing attendance records found', icon: '⚠', danger: true, confirmLabel: 'Save Anyway',
        body: `${overlapping.length} real attendance record${overlapping.length!==1?'s':''} already exist for these students within ${fmtDate(startDate)} – ${fmtDate(endDate)}. Saving this opening balance on top of them will double-count those days in reports. Continue anyway?`,
        onConfirm: () => saveEntries(entries),
      })
      return
    }
    saveEntries(entries)
  }

  const deleteEntry = (entry) => {
    const student = students.find(s => s.id === entry.student_id)
    setConfirmState({
      title: 'Delete this opening balance entry?', icon: '🗑', danger: true, confirmLabel: 'Delete',
      body: `This will remove the ${entry.total_days}-day entry for ${student ? fullName(student, true) : 'this student'}. This cannot be undone.`,
      onConfirm: async () => {
        const {error} = await supabase.from('attendance_opening_balances').delete().eq('id', entry.id)
        if (error) { toast('Failed to delete: ' + error.message, 'error'); return }
        setData(p => ({...p, opening_balances: (p.opening_balances||[]).filter(b => b.id !== entry.id)}))
        toast('Entry deleted.')
      },
    })
  }

  const saveEdit = async () => {
    if (!editEntry) return
    const total = Number(editEntry.total_days), present = Number(editEntry.present_days)
    if (!total || total <= 0)           { toast('Total Days must be greater than 0.', 'error'); return }
    if (present < 0 || present > total) { toast('Present Days must be between 0 and Total Days.', 'error'); return }
    setEditSaving(true)
    const {error} = await supabase.from('attendance_opening_balances').update({
      label: editEntry.label, start_date: editEntry.start_date, end_date: editEntry.end_date,
      total_days: total, present_days: present,
    }).eq('id', editEntry.id)
    setEditSaving(false)
    if (error) { toast('Failed to update: ' + error.message, 'error'); return }
    setData(p => ({...p, opening_balances: (p.opening_balances||[]).map(b => b.id===editEntry.id ? {...b, ...editEntry, total_days: total, present_days: present} : b)}))
    setEditEntry(null)
    toast('Entry updated.')
  }

  return (
    <Card>
      <SectionTitle>Opening Attendance Balance</SectionTitle>
      <p style={{fontSize:12,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
        For attendance history that predates live tracking in SRMS -- a system outage, or a school that started using SRMS mid-term. Enter a total/present day count per student instead of marking each day individually. <strong style={{color:'var(--amber)'}}>Only use this for periods with no existing daily attendance records</strong> -- entering both will double-count in reports.
      </p>

      <div style={{marginBottom:16,maxWidth:320}}>
        <Field label='Class' value={selectedClass} onChange={setSelectedClass} options={classes.map(c=>({value:c.id, label:c.name}))}/>
      </div>

      {selectedClass && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'0 14px'}}>
            <Field label='Period Label' value={label} onChange={setLabel} placeholder='e.g. Pre-onboarding period'/>
            <Field label='Start Date' value={startDate} onChange={setStartDate} type='date'/>
            <Field label='End Date' value={endDate} onChange={setEndDate} type='date'/>
          </div>

          {classStudents.length === 0 ? (
            <div style={{padding:20,textAlign:'center',color:'var(--mist3)',fontSize:13}}>No students in this class.</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',marginTop:8,marginBottom:16}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',fontSize:11,color:'var(--mist3)',padding:'6px 8px 6px 0',borderBottom:'1px solid var(--line)'}}>Student</th>
                  <th style={{textAlign:'left',fontSize:11,color:'var(--mist3)',padding:'6px 8px',borderBottom:'1px solid var(--line)',width:120}}>Total Days</th>
                  <th style={{textAlign:'left',fontSize:11,color:'var(--mist3)',padding:'6px 8px',borderBottom:'1px solid var(--line)',width:120}}>Present Days</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map(s=>(
                  <tr key={s.id}>
                    <td style={{padding:'8px 8px 8px 0',fontSize:13}}>{fullName(s,true)}</td>
                    <td style={{padding:'6px 8px'}}>
                      <input type='number' min='0' value={rows[s.id]?.total ?? ''} onChange={e=>setRow(s.id,'total',e.target.value)}
                        style={{width:90,background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'7px 10px',color:'var(--white)',fontSize:13}}/>
                    </td>
                    <td style={{padding:'6px 8px'}}>
                      <input type='number' min='0' value={rows[s.id]?.present ?? ''} onChange={e=>setRow(s.id,'present',e.target.value)}
                        style={{width:90,background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'7px 10px',color:'var(--white)',fontSize:13}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <Btn onClick={doSaveEntries} disabled={saving}>{saving?<><Spinner/> Saving...</>:'Save Entries'}</Btn>
          </div>
        </>
      )}

      {openingBalances.length > 0 && (
        <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--line)'}}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>
            Existing Entries -- {activeYear}
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Student','Period','Dates','Present / Total','Rate',''].map(h=>(
                  <th key={h} style={{textAlign:'left',fontSize:11,color:'var(--mist3)',padding:'6px 8px 6px 0',borderBottom:'1px solid var(--line)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openingBalances.map(b=>{
                const student = students.find(s=>s.id===b.student_id)
                const rate = Math.round(b.present_days/b.total_days*100)
                return (
                  <tr key={b.id}>
                    <td style={{padding:'8px 8px 8px 0',fontSize:13,fontWeight:600}}>{student?fullName(student,true):'--'}</td>
                    <td style={{padding:'8px',fontSize:13,color:'var(--mist2)'}}>{b.label||'--'}</td>
                    <td style={{padding:'8px',fontSize:12,color:'var(--mist3)'}}>{fmtDate(b.start_date)} – {fmtDate(b.end_date)}</td>
                    <td style={{padding:'8px',fontSize:13}}>{b.present_days} / {b.total_days}</td>
                    <td style={{padding:'8px',fontSize:13,fontWeight:600,color:'var(--emerald)'}}>{rate}%</td>
                    <td style={{padding:'8px'}}>
                      <div style={{display:'flex',gap:6}}>
                        <Btn size='sm' variant='ghost' onClick={()=>setEditEntry({...b})}>Edit</Btn>
                        <Btn size='sm' variant='danger' onClick={()=>deleteEntry(b)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editEntry && (
        <Modal title='Edit Opening Balance' onClose={()=>setEditEntry(null)} width={420}>
          <Field label='Period Label' value={editEntry.label||''} onChange={v=>setEditEntry(p=>({...p,label:v}))}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 14px'}}>
            <Field label='Start Date' value={editEntry.start_date} onChange={v=>setEditEntry(p=>({...p,start_date:v}))} type='date'/>
            <Field label='End Date' value={editEntry.end_date} onChange={v=>setEditEntry(p=>({...p,end_date:v}))} type='date'/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 14px'}}>
            <Field label='Total Days' value={editEntry.total_days} onChange={v=>setEditEntry(p=>({...p,total_days:v}))} type='number'/>
            <Field label='Present Days' value={editEntry.present_days} onChange={v=>setEditEntry(p=>({...p,present_days:v}))} type='number'/>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <Btn variant='ghost' onClick={()=>setEditEntry(null)} disabled={editSaving}>Cancel</Btn>
            <Btn onClick={saveEdit} disabled={editSaving}>{editSaving?<><Spinner/> Saving...</>:'Save'}</Btn>
          </div>
        </Modal>
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title} body={confirmState.body}
          icon={confirmState.icon} danger={confirmState.danger}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={()=>{ confirmState.onConfirm(); setConfirmState(null) }}
          onCancel={()=>setConfirmState(null)}
        />
      )}
    </Card>
  )
}

// ── ACADEMIC CALENDAR SETTINGS ─────────────────────────────────
// ── BECE AGGREGATE ─────────────────────────────────────────────
// Opt-in per class. A class with no entry here gets no aggregate on its report
// cards, which is how KG and primary opt out without anyone configuring them.
function AggregateSection({form, setForm, data}) {
  const classes  = [...(data?.classes||[])].sort(compareClasses)
  const subjects = data?.subjects||[]
  const config   = form.aggregate || {}
  const isNumeric = (form.grade_system||'letter')==='number'

  const setClassConfig = (classId, next) => setForm(p=>{
    const agg = {...(p.aggregate||{})}
    if(next) agg[classId] = next
    else delete agg[classId]
    return {...p, aggregate:agg}
  })

  // Decide add-or-remove out here from what the user actually clicked, then
  // apply it inside the updater. Two things force this shape: the updater must
  // merge into the latest state, or two quick ticks build on the same stale
  // list and one is lost; and it must be idempotent, because StrictMode invokes
  // updaters twice in development and a plain flip would just undo itself.
  const toggleCore = (classId, subjectId) => {
    const isCore = (config[classId]?.core||[]).includes(subjectId)
    setForm(p=>{
      const agg = {...(p.aggregate||{})}
      const cur = agg[classId] || {core:[], bestOf:2}
      const core = isCore
        ? cur.core.filter(id=>id!==subjectId)
        : (cur.core.includes(subjectId) ? cur.core : [...cur.core, subjectId])
      agg[classId] = {...cur, core}
      return {...p, aggregate:agg}
    })
  }

  const setBestOf = (classId, n) => setForm(p=>{
    const agg = {...(p.aggregate||{})}
    const cur = agg[classId] || {core:[], bestOf:2}
    agg[classId] = {...cur, bestOf:Math.max(0,n||0)}
    return {...p, aggregate:agg}
  })

  return (
    <Card>
      <SectionTitle>BECE Aggregate</SectionTitle>
      <p style={{fontSize:12,color:'var(--mist2)',marginBottom:16,lineHeight:1.6}}>
        Adds an aggregate to the report cards of the classes you switch on here — the grades of the core
        subjects plus the best of the rest. Leave a class off and its cards are unchanged.
      </p>

      {!isNumeric && (
        <div style={{padding:'12px 16px',background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.25)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--amber)',lineHeight:1.6}}>
          Your grading scale uses letters, so there are no numbers to add up. Switch the Grading Scale above
          to the Number system (grades 1–9) to use aggregates.
        </div>
      )}

      {isNumeric && classes.length===0 && (
        <div style={{fontSize:12,color:'var(--mist3)'}}>No classes yet.</div>
      )}

      {isNumeric && classes.map(cls=>{
        const clsSubjects = subjects.filter(s=>s.class_id===cls.id)
        const cfg         = config[cls.id]
        const on          = !!cfg
        const core        = cfg?.core||[]
        const bestOf      = cfg?.bestOf??2
        const electives   = clsSubjects.length - core.length
        return (
          <div key={cls.id} style={{padding:'12px 14px',marginBottom:8,background:'var(--ink3)',border:`1px solid ${on?'rgba(45,212,160,0.22)':'var(--line)'}`,borderRadius:'var(--r-sm)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>setClassConfig(cls.id, on?null:{core:[],bestOf:2})}
                style={{width:36,height:20,borderRadius:10,background:on?'var(--emerald)':'var(--line2)',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                <div style={{width:14,height:14,borderRadius:'50%',background:'white',position:'absolute',top:3,left:on?19:3,transition:'left 0.2s'}}/>
              </button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{cls.name}</div>
                <div style={{fontSize:11,color:'var(--mist3)',marginTop:1}}>
                  {clsSubjects.length} subject{clsSubjects.length!==1?'s':''}
                  {on && ` · best possible aggregate ${core.length+bestOf}`}
                </div>
              </div>
            </div>

            {on && (
              <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--line)'}}>
                {clsSubjects.length===0 ? (
                  <div style={{fontSize:11,color:'var(--mist3)'}}>Add subjects to this class first.</div>
                ) : (
                  <>
                    <div style={{fontSize:10,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>
                      Core subjects — always counted
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                      {clsSubjects.map(s=>{
                        const picked = core.includes(s.id)
                        return (
                          <button key={s.id} onClick={()=>toggleCore(cls.id,s.id)}
                            style={{padding:'5px 11px',borderRadius:20,fontSize:11,cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif",
                              background:picked?'rgba(45,212,160,0.15)':'transparent',
                              color:picked?'var(--emerald)':'var(--mist3)',
                              border:`1px solid ${picked?'var(--emerald)':'var(--line2)'}`}}>
                            {picked?'✓ ':''}{s.name}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                      <span style={{fontSize:12,color:'var(--mist2)'}}>Best</span>
                      <input type='number' min={0} max={Math.max(0,electives)} value={bestOf}
                        onChange={e=>setBestOf(cls.id, +e.target.value)}
                        style={{width:56,background:'var(--ink4)',border:'1px solid var(--line2)',borderRadius:'var(--r-sm)',padding:'6px 10px',color:'var(--white)',fontSize:12}}/>
                      <span style={{fontSize:12,color:'var(--mist2)'}}>
                        of the remaining {electives} subject{electives!==1?'s':''} also counted
                      </span>
                    </div>
                    {core.length===0 && (
                      <div style={{fontSize:11,color:'var(--amber)',marginTop:10}}>
                        Pick the core subjects — nothing is counted until you do.
                      </div>
                    )}
                    {core.length>0 && electives<bestOf && (
                      <div style={{fontSize:11,color:'var(--amber)',marginTop:10}}>
                        Only {electives} subject{electives!==1?'s':''} left over, so cards will show a provisional aggregate.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </Card>
  )
}

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
  // Disabled (turned off) Ghana national holidays
  const disabledHols = form.disabled_holidays || []
  const toggleGhHoliday = (id) => {
    const isOff = disabledHols.includes(id)
    const updated = isOff ? disabledHols.filter(x=>x!==id) : [...disabledHols, id]
    setForm(p=>({...p, disabled_holidays:updated}))
  }

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
              Ghana public holidays are pre-loaded and block attendance automatically. Toggle any holiday off if your school holds classes that day. Add school-specific holidays below.
            </p>
            <Btn size='sm' onClick={openAddHol} style={{flexShrink:0,marginLeft:16}}>+ Add Holiday</Btn>
          </div>

          {/* Ghana pre-loaded */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Ghana National Holidays (Pre-loaded — click to enable/disable)</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {GHANA_PUBLIC_HOLIDAYS.map(h=>{
                const isOff = disabledHols.includes(h.id)
                return (
                  <button key={h.id} onClick={()=>toggleGhHoliday(h.id)} title={isOff?'Disabled — attendance NOT blocked on this date':'Enabled — attendance blocked on this date'}
                    style={{fontSize:11,cursor:'pointer',fontFamily:"'Cabinet Grotesk',sans-serif",
                      color:isOff?'var(--mist3)':'var(--mist2)',
                      background:isOff?'rgba(240,107,122,0.06)':'var(--ink3)',
                      border:`1px solid ${isOff?'rgba(240,107,122,0.25)':'var(--line)'}`,
                      borderRadius:4,padding:'3px 10px',display:'flex',alignItems:'center',gap:6,
                      textDecoration:isOff?'line-through':'none',opacity:isOff?0.7:1}}>
                    {h.name} <span style={{color:'var(--mist3)',marginLeft:2}}>{String(h.month).padStart(2,'0')}/{String(h.day).padStart(2,'0')}</span>
                    <span style={{fontSize:9,fontWeight:700,color:isOff?'var(--rose)':'var(--emerald)',textDecoration:'none'}}>{isOff?'OFF':'ON'}</span>
                  </button>
                )
              })}
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:20}}>
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