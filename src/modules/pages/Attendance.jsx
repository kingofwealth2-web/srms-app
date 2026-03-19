import { useState } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, STATUS_META } from '../lib/constants'
import { fmtDate, fullName, getHolidayOnDate, getVacationOnDate } from '../lib/helpers'
import { auditLog } from '../lib/auditLog'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Btn from '../components/Btn'
import Field from '../components/Field'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import SectionTitle from '../components/SectionTitle'
import DataTable from '../components/DataTable'
import Card from '../components/Card'
import ConfirmModal from '../components/ConfirmModal'

// ── ATTENDANCE ─────────────────────────────────────────────────
export default function Attendance({profile,data,setData,toast,settings,activeYear,isViewingPast}) {
  const {attendance=[],students=[],classes=[]} = data
  const today = new Date().toISOString().split('T')[0]
  const [date,setDate]     = useState(today)
  const [cid,setCid]       = useState(profile?.role==='classteacher'?profile.class_id:'')
  const [tab,setTab]       = useState('mark')
  const [saving,setSaving] = useState(false)
  const [confirmState,setConfirmState] = useState(null)
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
      setConfirmState({title:'Discard unsaved marks?',body:'Changing class or date will lose your unsaved attendance.',icon:'⚠',danger:true,confirmLabel:'Discard & Continue',onConfirm:()=>{setPendingMarks({});setHasUnsaved(false);if(newCid!==undefined)setCid(newCid);if(newDate!==undefined)setDate(newDate)}});return
    }
    if(!hasUnsaved){
      setPendingMarks({});setHasUnsaved(false)
      if(newCid!==undefined)setCid(newCid)
      if(newDate!==undefined)setDate(newDate)
    }
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
        .map(s=>({school_id:profile?.school_id,student_id:s.id,class_id:cid,date,status:getStatus(s.id)||null,marked_by:profile?.id,academic_year:activeYear}))
        .filter(m=>m.status)
      if(allMarks.length===0){toast('No students marked -- nothing to save','error');setSaving(false);return}
      // Delete existing records for this class+date, then insert fresh
      const {error:delErr} = await supabase.from('attendance')
        .delete()
        .eq('school_id', profile?.school_id)
        .eq('class_id', cid)
        .eq('date', date)
      if(delErr) throw delErr
      const {data:rows,error:insErr} = await supabase.from('attendance')
        .insert(allMarks)
        .select()
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

  const exportAttendanceCsv = () => {
    try{
      if(tab!=='history'){
        toast('Switch to the History tab to export attendance.','error'); return
      }
      if(histRecs.length===0){ toast('No attendance records to export','error'); return }
      const esc = v => {
        if(v===null||v===undefined) return ''
        return String(v).replace(/"/g,'""')
      }
      let csv = 'Date,Class,Student ID,Student,Status\n'
      histRecs.forEach(r=>{
        const cls = classes.find(c=>c.id===r.class_id)
        const s   = students.find(st=>st.id===r.student_id)
        csv += `"${esc(r.date)}","${esc(cls?.name)}","${esc(s?.student_id)}","${esc(s?`${s.first_name} ${s.last_name}`:'')}","${esc(r.status)}"\n`
      })
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `SRMS_Attendance_${activeYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e){
      toast('Export failed. Please try again.','error')
    }
  }

  return (
    <div>
      <PageHeader title='Attendance' sub='Mark and review daily attendance records'>
        <Btn variant={tab==='mark'?'primary':'ghost'} size='sm' onClick={()=>setTab('mark')}>Mark Attendance</Btn>
        <Btn variant={tab==='history'?'primary':'ghost'} size='sm' onClick={()=>setTab('history')}>History</Btn>
        {['superadmin','admin'].includes(profile?.role) && tab==='history' && (
          <Btn variant='ghost' size='sm' onClick={exportAttendanceCsv}>⬇ Export CSV</Btn>
        )}
      </PageHeader>
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          {['superadmin','admin'].includes(profile?.role) && tab==='mark' && !isBlocked && (
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
                      <Avatar name={fullName(r)} size={28}/>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontWeight:600}}>{fullName(r,true)}</span>
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
                          <button key={s} onClick={()=>!isBlocked&&markStudent(r.id,s)}
                            disabled={isBlocked}
                            style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:isBlocked?'not-allowed':'pointer',transition:'all 0.12s',fontFamily:"'Cabinet Grotesk',sans-serif",
                              opacity:isBlocked?0.3:1,
                              background:cur?STATUS_META[s].bg:'transparent',color:cur?STATUS_META[s].color:'var(--mist3)',
                              border:`1px solid ${cur?STATUS_META[s].color:'var(--line)'}`,
                              outline:isPending?`2px solid ${STATUS_META[s].color}`:'none',outlineOffset:1}}
                            onMouseEnter={e=>{if(!cur&&!isBlocked){e.currentTarget.style.borderColor=STATUS_META[s].color;e.currentTarget.style.color=STATUS_META[s].color}}}
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
          {histRecs.length>500&&<div style={{padding:'8px 14px',background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.2)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--amber)',marginBottom:12}}>⚠ Showing the 500 most recent records. Export CSV to access the full history.</div>}
          <DataTable data={histRecs.slice(0,500)} columns={[
            {key:'date',label:'Date',render:v=>fmtDate(v)},
            {key:'class_id',label:'Class',render:v=>classes.find(c=>c.id===v)?.name||'--'},
            {key:'student_id',label:'Student',render:v=>{const s=students.find(x=>x.id===v);return s?fullName(s,true):'--'}},
            {key:'status',label:'Status',render:v=><Badge color={STATUS_META[v]?.color} bg={STATUS_META[v]?.bg}>{v}</Badge>},
          ]}/>
        </Card>
      )}
      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}