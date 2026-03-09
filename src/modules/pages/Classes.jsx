import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META } from '../lib/constants'
import { fmtDate, fullName } from '../lib/helpers'
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
import DataTable from '../components/DataTable'

// ── CLASSES ────────────────────────────────────────────────────
export default function Classes({profile,data,setData,toast,activeYear,isViewingPast,onPromotionComplete}) {
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
  const [confirmState,setConfirmState] = useState(null)
  const [saving,setSaving] = useState(false)
  const fc = k=>v=>setCf(p=>({...p,[k]:v}))
  const fs = k=>v=>setSf(p=>({...p,[k]:v}))
  useEffect(()=>{ if(!profile?.school_id) return; supabase.from('profiles').select('*').eq('school_id',profile.school_id).then(({data})=>{ if(data) setAllUsers(data) }) },[profile?.school_id])
  const teachers = allUsers.filter(u=>u.role==='classteacher')
  // Both subject teachers AND class teachers can be assigned to subjects
  const subjectTeachers = allUsers.filter(u=>u.role==='teacher'||u.role==='classteacher')

  const deleteClass = async cls=>{
    const hasStudents = students.some(s=>s.class_id===cls.id)
    const hasSubjects = subjects.some(s=>s.class_id===cls.id)
    if(hasStudents){toast('Cannot delete -- this class has students assigned to it.','error');return}
    if(hasSubjects){toast('Cannot delete -- this class has subjects. Remove them first.','error');return}
    setConfirmState({title:`Delete "${cls.name}"?`,body:'This cannot be undone.',icon:'🗑',danger:true,onConfirm:async()=>{
      const {error}=await supabase.from('classes').delete().eq('id',cls.id).eq('school_id',profile?.school_id)
      if(error){toast(error.message,'error');return}
      if(cls.class_teacher_id)
        await supabase.from('profiles').update({class_id:null}).eq('id',cls.class_teacher_id)
      setData(p=>({...p,classes:p.classes.filter(c=>c.id!==cls.id)}))
      if(selected?.id===cls.id) setSelected(null)
      toast('"'+cls.name+'" deleted.')
    }})
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
    const updates = reordered.map((c,i)=>supabase.from('classes').update({sort_order:i}).eq('id',c.id).eq('school_id',profile?.school_id))
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
    const enrolmentRows = bulkStudents.map(p=>({school_id:profile?.school_id,student_id:p.student.id,class_id:p.fromClass.id,academic_year:activeYear}))
    await supabase.from('student_year_enrolment').upsert(enrolmentRows,{onConflict:'school_id,student_id,academic_year'})
    for(const p of toPromote)
      await supabase.from('students').update({class_id:p.destClassId}).eq('id',p.student.id).eq('school_id',profile?.school_id)
    for(const p of toGraduate)
      await supabase.from('students').update({archived:true,class_id:null,graduation_year:activeYear,leaving_reason:'Graduated'}).eq('id',p.student.id).eq('school_id',profile?.school_id)
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
    if(onPromotionComplete) onPromotionComplete()
  }

  const confirmPromo = async ()=>{
    setPromoting(true)
    const toPromote  = promoStudents.filter(p=>p.action==='promote')
    const toRepeat   = promoStudents.filter(p=>p.action==='repeat')
    const toGraduate = promoStudents.filter(p=>p.action==='graduate')
    // Write enrolment history for ALL students in source class before moving them
    const enrolmentRows = promoStudents.map(p=>({
      school_id: profile?.school_id,
      student_id: p.student.id,
      class_id: promoSource,
      academic_year: activeYear
    }))
    // Upsert — avoid duplicates
    await supabase.from('student_year_enrolment').upsert(enrolmentRows, {onConflict:'school_id,student_id,academic_year'})
    for(const p of toPromote)
      await supabase.from('students').update({class_id:p.destClassId}).eq('id',p.student.id).eq('school_id',profile?.school_id)
    for(const p of toGraduate)
      await supabase.from('students').update({archived:true,class_id:null,graduation_year:activeYear,leaving_reason:'Graduated'}).eq('id',p.student.id).eq('school_id',profile?.school_id)
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
      const {error}=await supabase.from('classes').update(payload).eq('id',editC.id).eq('school_id',profile?.school_id)
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
      const {data:row,error}=await supabase.from('classes').insert({...payload,school_id:profile?.school_id,sort_order:maxOrder+1}).select().single()
      if(error){toast(error.message,'error');setSaving(false);return}
      if(newTeacherId && row){
        const {error:teacherErr} = await supabase.from('profiles').update({class_id:row.id}).eq('id',newTeacherId)
        if(teacherErr) toast('Class created but failed to assign teacher: '+teacherErr.message,'error')
      }
      setData(p=>({...p,classes:[...p.classes,row]}))
      toast('Class created');setClassModal(false)
    }
    setSaving(false)
  }
  const saveSubject = async ()=>{
    if(!sf.name||!sf.class_id)return; setSaving(true)
    if(editS){
      const {error}=await supabase.from('subjects').update({...sf,teacher_id:sf.teacher_id||null}).eq('id',editS.id).eq('school_id',profile?.school_id)
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,subjects:p.subjects.map(s=>s.id===editS.id?{...s,...sf,teacher_id:sf.teacher_id||null}:s)}));toast('Subject updated');setSubjectModal(false)}
    } else {
      const {data:row,error}=await supabase.from('subjects').insert({...sf,school_id:profile?.school_id,teacher_id:sf.teacher_id||null}).select().single()
      if(error)toast(error.message,'error')
      else{setData(p=>({...p,subjects:[...p.subjects,row]}));toast('Subject created');setSubjectModal(false)}
    }
    setSaving(false)
  }
  const deleteSubject = async (sub) => {
    setConfirmState({title:`Delete "${sub.name}"?`,body:'This will also remove all grade records for this subject. Cannot be undone.',icon:'🗑',danger:true,onConfirm:async()=>{
    setSaving(true)
    // Delete associated grades first
    await supabase.from('grades').delete().eq('subject_id', sub.id).eq('school_id', profile?.school_id)
    const {error} = await supabase.from('subjects').delete().eq('id', sub.id).eq('school_id', profile?.school_id)
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
    }})
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
                    {c.is_terminal && <span style={{fontSize:9,fontWeight:700,color:'var(--rose)',background:'var(--rose-subtle)',padding:'2px 6px',borderRadius:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Terminal</span>}
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
                  {c.is_terminal && <span style={{fontSize:9,fontWeight:700,color:'var(--rose)',background:'var(--rose-subtle)',padding:'2px 6px',borderRadius:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Terminal</span>}
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
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--rose-subtle)',border:'1px solid var(--rose-line)',borderRadius:'var(--r-sm)',marginBottom:16}}>
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
                <div style={{padding:'10px 14px',background:'var(--amber-subtle)',border:'1px solid var(--amber-line)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--amber)',marginBottom:16,display:'flex',gap:8,alignItems:'center'}}>
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
                          {cls.is_terminal && <span style={{fontSize:10,fontWeight:700,color:'var(--rose)',background:'var(--rose-subtle)',padding:'2px 6px',borderRadius:4,textTransform:'uppercase'}}>Terminal</span>}
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
                                <div key={p.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',borderBottom:i<clsStudents.length-1?'1px solid var(--line)':'none',background:p.action==='graduate'?'var(--rose-subtle)':p.action==='repeat'?'var(--amber-subtle)':'transparent'}}>
                                  <Avatar name={fullName(p.student)} size={24}/>
                                  <span style={{flex:1,fontSize:13,fontWeight:500}}>{fullName(p.student,true)}</span>
                                  <div style={{display:'flex',gap:5}}>
                                    {['promote','repeat','graduate'].map(a=>(
                                      <button key={a} onClick={()=>setBulkStudents(prev=>prev.map((x,j)=>j===globalIdx?{...x,action:a}:x))}
                                        style={{padding:'3px 9px',fontSize:11,fontWeight:600,borderRadius:'var(--r-sm)',cursor:'pointer',border:'1px solid',
                                          background:p.action===a?(a==='promote'?'var(--emerald-subtle)':a==='repeat'?'var(--amber-subtle)':'var(--rose-subtle)'):'transparent',
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
                          <span style={{fontWeight:500}}>{fullName(p.student,true)}</span>
                          {p.action==='promote'  && <span style={{color:'var(--emerald)'}}>→ {orderedClasses.find(c=>c.id===p.destClassId)?.name}</span>}
                          {p.action==='repeat'   && <span style={{color:'var(--amber)'}}>Repeating {cls.name}</span>}
                          {p.action==='graduate' && <span style={{color:'var(--rose)'}}>Graduated — archived</span>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div style={{padding:'10px 14px',background:'var(--gold-subtle)',border:'1px solid var(--gold-line)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--mist2)',marginBottom:10}}>
                ⚠ Outstanding fee balances carry over automatically. Archived students' full history is preserved.
              </div>
              <div style={{padding:'10px 14px',background:'var(--sky-subtle)',border:'1px solid var(--sky-line)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--mist2)',marginBottom:16,display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:14,flexShrink:0}}>🗓</span>
                <span>Once confirmed, you will be prompted to <strong style={{color:'var(--sky)'}}>start the new academic year</strong>. Make sure all classes are ready before proceeding.</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <Btn variant='ghost' onClick={()=>setBulkStep(1)}>← Back</Btn>
                <Btn onClick={confirmBulkPromo} disabled={promoting}>{promoting?<><Spinner/> Promoting...</>:'Confirm & Start New Year'}</Btn>
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
                    ? <div style={{padding:'10px 14px',background:'var(--rose-subtle)',border:'1px solid var(--rose-line)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--rose)',marginBottom:8}}>This is a terminal class — students will default to Graduate.</div>
                    : <Field label='Default destination class (optional)' value={promoDest} onChange={setPromoDest}
                        options={[{value:'',label:'Leave blank to default all to Graduate'},...orderedClasses.filter(c=>c.id!==promoSource).map(c=>({value:c.id,label:c.name}))]}/>
                  }
                </>
              )}
              {promoSource && students.filter(s=>s.class_id===promoSource).length===0 && (
                <div style={{padding:'12px 16px',background:'var(--rose-subtle)',border:'1px solid var(--rose-line)',borderRadius:'var(--r-sm)',fontSize:13,color:'var(--rose)',marginTop:8}}>This class has no students.</div>
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
                  <div key={p.student.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--ink3)',borderRadius:'var(--r-sm)',border:`1px solid ${p.action==='graduate'?'var(--rose-line)':p.action==='repeat'?'var(--amber-line)':'var(--line)'}`}}>
                    <Avatar name={fullName(p.student)} size={28}/>
                    <div style={{flex:1,fontSize:13,fontWeight:500}}>{fullName(p.student,true)}</div>
                    <div style={{display:'flex',gap:6}}>
                      {['promote','repeat','graduate'].map(a=>(
                        <button key={a} onClick={()=>setPromoStudents(prev=>prev.map((x,j)=>j===i?{...x,action:a}:x))}
                          style={{padding:'4px 10px',fontSize:11,fontWeight:600,borderRadius:'var(--r-sm)',cursor:'pointer',border:'1px solid',
                            background:p.action===a?(a==='promote'?'var(--emerald-subtle)':a==='repeat'?'var(--amber-subtle)':'var(--rose-subtle)'):'transparent',
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
                    <span style={{fontWeight:500}}>{fullName(p.student,true)}</span>
                    <span style={{color:'var(--emerald)'}}>&rarr; {classes.find(c=>c.id===p.destClassId)?.name}</span>
                  </div>
                ))}
                {promoStudents.filter(p=>p.action==='repeat').map(p=>(
                  <div key={p.student.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid var(--line)',opacity:0.6}}>
                    <span style={{fontWeight:500}}>{fullName(p.student,true)}</span>
                    <span style={{color:'var(--amber)'}}>Repeating — stays in {classes.find(c=>c.id===promoSource)?.name}</span>
                  </div>
                ))}
                {promoStudents.filter(p=>p.action==='graduate').map(p=>(
                  <div key={p.student.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid var(--line)',opacity:0.6}}>
                    <span style={{fontWeight:500}}>{fullName(p.student,true)}</span>
                    <span style={{color:'var(--rose)'}}>Graduated — archived</span>
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 14px',background:'var(--gold-subtle)',border:'1px solid var(--gold-line)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--mist2)',marginBottom:16}}>
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
      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}