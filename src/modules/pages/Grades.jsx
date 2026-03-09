import { useState, useRef } from 'react'
import { supabase } from '../../supabase'
import { useIsMobile, usePagination } from '../lib/hooks'
import { ROLE_META, LETTER_COLOR } from '../lib/constants'
import { calcTotal, getGradeComponents, getLetter, getGPA, getGradeLetter, getGradeRemark, DEFAULT_GRADING_SCALE, DEFAULT_GRADE_COMPONENTS, fmtDate, csvEscape, ALL_COMPONENTS, fullName } from '../lib/helpers'
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
import DataTable from '../components/DataTable'
import { SkeletonRows } from '../components/Skeleton'
import Pagination from '../components/Pagination'
import ConfirmModal from '../components/ConfirmModal'

// ── GRADES ─────────────────────────────────────────────────────
export default function Grades({profile,data,setData,toast,settings,activeYear,isViewingPast,dataLoading}) {
  const {grades=[],students=[],subjects=[],classes=[]} = data
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
  const [bulkMode,setBulkMode] = useState(false)
  const [confirmState,setConfirmState] = useState(null)
  const [studentSearch,setStudentSearch] = useState('')
  const [showStudentDrop,setShowStudentDrop] = useState(false)
  // bulkRows: { [studentId]: { ...scores, skip:bool, dirty:bool, existingId:string|null } }
  const [bulkRows,setBulkRows] = useState({})
  const [bulkSaving,setBulkSaving] = useState(false)
  const bulkInputRefs = useRef({})
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
    ? students.filter(s=>s.class_id===fc&&!s.archived)
    : myClassIds===null
      ? students.filter(s=>!s.archived)
      : students.filter(s=>myClassIds.includes(s.class_id)&&!s.archived)

  // Grades visible in table
  const myGrades = isAdminGrades
    ? grades
    : grades.filter(g=>viewSubjects.some(s=>s.id===g.subject_id))

  const filtered = myGrades.filter(g=>{
    // Scope to active year — skip only if year is explicitly set to a different year
    if(g.year && g.year !== activeYear) return false
    // Use subject's class_id (not student's current class_id) so that records remain
    // anchored to the class they were recorded for — correct for re-enrolled and promoted students
    const student = students.find(s=>s.id===g.student_id)
    if(!student || student.archived) return false
    if(fc) {
      const subject = subjects.find(s=>s.id===g.subject_id)
      if(!subject || subject.class_id !== fc) return false
    }
    return (!fs||g.subject_id===fs)&&(!fp||g.period===fp)
  })
  const { paged, page, setPage, totalPages } = usePagination(filtered, 50)

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

  const delGrade = async () => {
    if(!edit) return
    setConfirmState({title:'Delete grade record?',body:'This cannot be undone.',icon:'🗑',danger:true,onConfirm:async()=>{
    setSaving(true)
    const {error} = await supabase.from('grades').delete().eq('id', edit.id).eq('school_id', profile?.school_id)
    if(error) toast(error.message,'error')
    else {
      setData(p=>({...p, grades: p.grades.filter(x=>x.id!==edit.id)}))
      const student = students.find(s=>s.id===edit.student_id)
      const subject = subjects.find(s=>s.id===edit.subject_id)
      auditLog(profile,'Grades','Deleted',`${student?.first_name} ${student?.last_name} · ${subject?.name} · ${edit.period}`,{},{...edit},null)
      toast('Grade deleted')
      setModal(false)
    }
    setSaving(false)
    }})
  }

  const save = async () => {
    if(!form.student_id||!form.subject_id){toast('Please select a student and subject','error');return}
    if(scoreWarnings.length>0){toast(`Score exceeds maximum: ${scoreWarnings.map(c=>c.label).join(', ')}`,'error');return}
    // Only save scores for active components; zero out disabled ones
    const scores = ALL_COMPONENTS.reduce((acc,k)=>{
      const comp = allComps.find(c=>c.key===k)
      return {...acc,[k]:comp?.enabled ? (+form[k]||0) : 0}
    },{})
    const { school_id: _sid, ...gClean } = {...form,...scores}
    const g = gClean
    setSaving(true)
    if(edit){
      const {error}=await supabase.from('grades').update(g).eq('id',edit.id).eq('school_id',profile?.school_id)
      if(error)toast(error.message,'error')
      else{
        setData(p=>({...p,grades:p.grades.map(x=>x.id===edit.id?{...x,...g}:x)}))
        const student=students.find(s=>s.id===g.student_id)
        const subject=subjects.find(s=>s.id===g.subject_id)
        auditLog(profile,'Grades','Updated',`${student?.first_name} ${student?.last_name} · ${subject?.name} · ${g.period}`,{},{...edit},{...g})
        toast('Grade updated');setModal(false)
      }
    } else {
      const {data:row,error}=await supabase.from('grades').insert({...g,school_id:profile?.school_id}).select().single()
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

  // ── BULK MODE helpers ───────────────────────────────────────
  const canBulk = !isViewingPast && fc && fs && fp && activeComps.length > 0 && mySubjects.some(s=>s.id===fs)

  const initBulkRows = () => {
    const classStudents = students.filter(s=>s.class_id===fc&&!s.archived)
    const rows = {}
    classStudents.forEach(s=>{
      const existing = grades.find(g=>
        g.student_id===s.id && g.subject_id===fs && g.period===fp &&
        (!g.year || g.year===activeYear)
      )
      const scores = ALL_COMPONENTS.reduce((acc,k)=>({
        ...acc,[k]: existing ? (existing[k]||0) : ''
      }),{})
      rows[s.id] = {
        ...scores,
        skip: false,
        dirty: false,
        existingId: existing?.id || null,
      }
    })
    return rows
  }

  const enterBulkMode = () => {
    setBulkRows(initBulkRows())
    setBulkMode(true)
  }
  const exitBulkMode = () => { setBulkMode(false); setBulkRows({}) }

  const setBulkCell = (studentId, key, val) => {
    setBulkRows(prev=>({
      ...prev,
      [studentId]: {...prev[studentId], [key]: val, dirty: true}
    }))
  }

  const toggleSkip = (studentId) => {
    setBulkRows(prev=>{
      const row = prev[studentId]
      // Only mark dirty if there's an existing record to delete, or it was already dirty
      const shouldDirty = !!row?.existingId || row?.dirty
      return {
        ...prev,
        [studentId]: {...row, skip: !row?.skip, dirty: shouldDirty}
      }
    })
  }

  const bulkStudents = students.filter(s=>s.class_id===fc&&!s.archived)
  const dirtyCount = Object.values(bulkRows).filter(r=>r.dirty).length

  // Keyboard nav: Tab/Enter moves to next cell across rows
  const handleBulkKeyDown = (e, studentId, compKey) => {
    if(e.key !== 'Tab' && e.key !== 'Enter') return
    e.preventDefault()
    const compKeys = activeComps.map(c=>c.key)
    const compIdx = compKeys.indexOf(compKey)
    const studentIds = bulkStudents.map(s=>s.id)
    const studentIdx = studentIds.indexOf(studentId)
    let nextComp = compIdx + 1
    let nextStudent = studentIdx
    if(nextComp >= compKeys.length) { nextComp = 0; nextStudent = studentIdx + 1 }
    // Skip over any skipped rows
    while(nextStudent < studentIds.length && bulkRows[studentIds[nextStudent]]?.skip) {
      nextStudent++
    }
    if(nextStudent >= studentIds.length) { nextStudent = 0 }
    const refKey = `${studentIds[nextStudent]}-${compKeys[nextComp]}`
    bulkInputRefs.current[refKey]?.focus()
  }

  const saveBulk = async () => {
    const subject = subjects.find(s=>s.id===fs)
    const subjectName = subject?.name || ''
    // Validate: check for over-limit scores
    let hasError = false
    bulkStudents.forEach(s=>{
      const row = bulkRows[s.id]
      if(!row || row.skip) return
      activeComps.forEach(c=>{
        if(c.max_score > 0 && +row[c.key] > c.max_score) hasError = true
      })
    })
    if(hasError){ toast('Some scores exceed their maximum. Please fix before saving.','error'); return }

    setBulkSaving(true)
    let insertCount=0, updateCount=0, errorCount=0
    const updatedGrades = [...grades]

    for(const s of bulkStudents){
      const row = bulkRows[s.id]
      if(!row || !row.dirty) continue
      if(row.skip){
        // If skip is toggled on a previously-existing record, delete it
        if(row.existingId){
          const {error} = await supabase.from('grades').delete().eq('id',row.existingId).eq('school_id',profile?.school_id)
          if(!error){
            const idx = updatedGrades.findIndex(g=>g.id===row.existingId)
            if(idx>-1) updatedGrades.splice(idx,1)
            auditLog(profile,'Grades','Deleted',
              `${s.first_name} ${s.last_name} · ${subjectName} · ${fp} (skipped in bulk)`,
              {},{...grades.find(g=>g.id===row.existingId)},null)
          } else { errorCount++ }
        }
        continue
      }
      const scores = ALL_COMPONENTS.reduce((acc,k)=>{
        const comp = allComps.find(c=>c.key===k)
        return {...acc,[k]: comp?.enabled ? (+row[k]||0) : 0}
      },{})
      const payload = {
        school_id: profile?.school_id,
        student_id: s.id,
        subject_id: fs,
        period: fp,
        year: activeYear,
        ...scores,
      }
      if(row.existingId){
        const {error} = await supabase.from('grades').update(payload).eq('id',row.existingId).eq('school_id',profile?.school_id)
        if(!error){
          const idx = updatedGrades.findIndex(g=>g.id===row.existingId)
          if(idx>-1) updatedGrades[idx]={...updatedGrades[idx],...payload}
          auditLog(profile,'Grades','Updated',
            `${s.first_name} ${s.last_name} · ${subjectName} · ${fp} (bulk)`,
            {},{...grades.find(g=>g.id===row.existingId)},{...payload})
          updateCount++
        } else { errorCount++ }
      } else {
        const {data:newRow,error} = await supabase.from('grades').insert(payload).select().single()
        if(!error){
          updatedGrades.push(newRow)
          // Update bulkRows so a second save in the same session updates instead of re-inserts
          setBulkRows(prev=>({...prev,[s.id]:{...prev[s.id],existingId:newRow.id}}))
          auditLog(profile,'Grades','Created',
            `${s.first_name} ${s.last_name} · ${subjectName} · ${fp} (bulk)`,
            {},null,{...payload})
          insertCount++
        } else { errorCount++ }
      }
    }
    setData(p=>({...p,grades:updatedGrades}))
    setBulkSaving(false)
    if(errorCount>0) toast(`Saved with ${errorCount} error(s)`, 'error')
    else {
      const parts=[]
      if(insertCount>0) parts.push(`${insertCount} added`)
      if(updateCount>0) parts.push(`${updateCount} updated`)
      toast(parts.length ? parts.join(', ') : 'No changes to save')
    }
    // Refresh dirty flags
    setBulkRows(prev=>{
      const next={...prev}
      Object.keys(next).forEach(k=>{ next[k]={...next[k],dirty:false} })
      return next
    })
  }

  return (
    <div>
      <PageHeader title='Grades & Records' sub={bulkMode ? `Class View · ${data.classes?.find(c=>c.id===fc)?.name||''} · ${subjects.find(s=>s.id===fs)?.name||''} · ${fp}` : `${filtered.length} grade records`}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {!isViewingPast && activeComps.length>0 && canBulk && (
            <button onClick={bulkMode ? exitBulkMode : enterBulkMode}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:'var(--r-sm)',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                background: bulkMode ? 'rgba(232,184,75,0.15)' : 'var(--ink4)',
                border: bulkMode ? '1px solid rgba(232,184,75,0.4)' : '1px solid var(--line2)',
                color: bulkMode ? 'var(--gold)' : 'var(--mist)'}}>
              <span style={{fontSize:15}}>{bulkMode ? '☰' : '⊞'}</span>
              {bulkMode ? 'List View' : 'Class View'}
            </button>
          )}
          {!bulkMode && (
            isViewingPast
              ? <span style={{fontSize:12,color:'var(--amber)',padding:'8px 16px',background:'rgba(251,159,58,0.08)',border:'1px solid rgba(251,159,58,0.2)',borderRadius:'var(--r-sm)'}}>Read only — viewing {activeYear}</span>
              : activeComps.length===0
                ? <span style={{fontSize:12,color:'var(--rose)',padding:'8px 16px',background:'rgba(240,107,122,0.08)',border:'1px solid rgba(240,107,122,0.2)',borderRadius:'var(--r-sm)'}}>(!) No grade components active. Configure in Settings.</span>
                : <Btn onClick={openAdd}>+ Record Grades</Btn>
          )}
        </div>
      </PageHeader>

      {/* ── FILTERS ── */}
      <Card style={{marginBottom:16,padding:'14px 20px'}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <select value={fc} onChange={e=>{setFc(e.target.value);setFs('');setBulkMode(false)}}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
            {isAdminGrades ? <option value=''>All Classes</option> : <option value=''>All My Classes</option>}
            {teacherClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={fs} onChange={e=>{setFs(e.target.value);setBulkMode(false)}}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer',minWidth:160}}>
            <option value=''>All Subjects</option>
            {fcSubjects.map(s=><option key={s.id} value={s.id}>{s.name}{!fc ? ` — ${data.classes?.find(c=>c.id===s.class_id)?.name||''}` : ''}{!mySubjects.some(m=>m.id===s.id)?' (view only)':''}</option>)}
          </select>
          <select value={fp} onChange={e=>{setFp(e.target.value);setBulkMode(false)}}
            style={{background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'8px 14px',color:'var(--mist)',fontSize:13,cursor:'pointer'}}>
            <option value=''>All Periods</option>
            {periods.map(p=><option key={p}>{p}</option>)}
          </select>
          {!bulkMode && !fc && !fs && !fp && (
            <span style={{fontSize:12,color:'var(--mist3)',marginLeft:4}}>
              ← Select Class + Subject + Period to unlock Class View
            </span>
          )}
          {canBulk && !bulkMode && (
            <span style={{fontSize:12,color:'var(--mist3)',marginLeft:4}}>
              Class View available ↑
            </span>
          )}
        </div>
      </Card>

      {/* ── BULK / CLASS VIEW ── */}
      {bulkMode ? (
        <div>
          {/* Hint bar */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div style={{display:'flex',gap:16,alignItems:'center'}}>
              <span style={{fontSize:12,color:'var(--mist3)'}}>
                <span style={{color:'var(--mist2)',fontWeight:600}}>{bulkStudents.length}</span> students · Tab or Enter to move between cells
              </span>
              <div style={{display:'flex',gap:8,alignItems:'center',fontSize:11,color:'var(--mist3)'}}>
                <span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:'rgba(91,168,245,0.3)',border:'1px solid var(--sky)'}}/>
                <span>Pre-filled (existing record)</span>
                <span style={{marginLeft:8,display:'inline-block',width:8,height:8,borderRadius:2,background:'rgba(232,184,75,0.15)',border:'1px solid rgba(232,184,75,0.4)'}}/>
                <span>Unsaved changes</span>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Btn variant='ghost' onClick={()=>setBulkRows(initBulkRows())}>Reset</Btn>
              <Btn onClick={saveBulk} disabled={bulkSaving||dirtyCount===0}>
                {bulkSaving ? <><Spinner/> Saving...</> : dirtyCount>0 ? `Save ${dirtyCount} change${dirtyCount!==1?'s':''}` : 'No changes'}
              </Btn>
            </div>
          </div>

          {/* Grid */}
          <div style={{overflowX:'auto',borderRadius:'var(--r)',border:'1px solid var(--line)'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth: 400 + activeComps.length*110}}>
              <thead>
                <tr style={{background:'var(--ink3)',borderBottom:'2px solid var(--line2)'}}>
                  <th style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:"'Clash Display',sans-serif",position:'sticky',left:0,background:'var(--ink3)',zIndex:2,minWidth:180}}>Student</th>
                  {activeComps.map(c=>(
                    <th key={c.key} style={{padding:'10px 12px',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:"'Clash Display',sans-serif",minWidth:100}}>
                      {c.label}
                      <span style={{display:'block',fontWeight:400,color:'var(--mist3)',fontSize:10,textTransform:'none',letterSpacing:0,marginTop:1}}>/{c.max_score}</span>
                    </th>
                  ))}
                  <th style={{padding:'10px 12px',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:"'Clash Display',sans-serif",minWidth:110}}>Total</th>
                  <th style={{padding:'10px 12px',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:"'Clash Display',sans-serif",minWidth:70}}>Skip</th>
                </tr>
              </thead>
              <tbody>
                {bulkStudents.map((s,si)=>{
                  const row = bulkRows[s.id] || {}
                  const isExisting = !!row.existingId
                  const isDirty = row.dirty
                  const isSkipped = row.skip
                  const previewScores = ALL_COMPONENTS.reduce((acc,k)=>({...acc,[k]:+row[k]||0}),{})
                  const total = isSkipped ? null : calcTotal(previewScores, allComps)
                  const letter = total !== null ? getLetter(total, scale) : null
                  return (
                    <tr key={s.id} style={{
                      borderBottom:'1px solid var(--line)',
                      background: isSkipped ? 'rgba(255,255,255,0.02)' :
                                  isDirty   ? 'rgba(232,184,75,0.04)' :
                                  isExisting? 'rgba(91,168,245,0.04)' : 'transparent',
                      opacity: isSkipped ? 0.4 : 1,
                      transition:'background 0.15s',
                    }}>
                      {/* Student name — sticky */}
                      <td style={{padding:'8px 16px',position:'sticky',left:0,zIndex:1,
                        background: isSkipped ? 'var(--ink2)' :
                                    isDirty   ? 'rgba(232,184,75,0.06)' :
                                    isExisting? 'rgba(91,168,245,0.05)' : 'var(--ink2)',
                        borderRight:'1px solid var(--line)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <Avatar name={fullName(s)} size={26}/>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:isSkipped?'var(--mist3)':'var(--white)'}}>{fullName(s,true)}</div>
                            {isExisting && !isSkipped && <div style={{fontSize:10,color:'var(--sky)',marginTop:1}}>● existing record</div>}
                          </div>
                        </div>
                      </td>
                      {/* Score inputs */}
                      {activeComps.map(c=>{
                        const val = row[c.key] ?? ''
                        const over = c.max_score>0 && +val > c.max_score
                        const refKey = `${s.id}-${c.key}`
                        return (
                          <td key={c.key} style={{padding:'6px 8px',textAlign:'center'}}>
                            <input
                              ref={el=>{ bulkInputRefs.current[refKey]=el }}
                              type='number'
                              disabled={isSkipped}
                              value={val}
                              onChange={e=>setBulkCell(s.id, c.key, e.target.value)}
                              onKeyDown={e=>handleBulkKeyDown(e, s.id, c.key)}
                              min={0} max={c.max_score||undefined}
                              style={{
                                width:'100%',maxWidth:80,padding:'7px 8px',textAlign:'center',
                                background: over ? 'rgba(240,107,122,0.12)' : 'var(--ink4)',
                                border: `1px solid ${over ? 'var(--rose)' : isDirty ? 'rgba(232,184,75,0.3)' : 'var(--line)'}`,
                                borderRadius:'var(--r-sm)',color: over?'var(--rose)':'var(--white)',
                                fontSize:14,fontFamily:"'JetBrains Mono','Fira Code',monospace",
                                outline:'none',transition:'border-color 0.15s',
                              }}
                            />
                          </td>
                        )
                      })}
                      {/* Running total */}
                      <td style={{padding:'8px 12px',textAlign:'center'}}>
                        {!isSkipped && total!==null ? (
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                            <span className='mono' style={{fontSize:15,fontWeight:700,color:LETTER_COLOR[letter]||'var(--mist)'}}>{total}</span>
                            <Badge color={LETTER_COLOR[letter]||'var(--mist2)'}>{letter}</Badge>
                          </div>
                        ) : <span style={{color:'var(--mist3)',fontSize:12}}>—</span>}
                      </td>
                      {/* Skip toggle */}
                      <td style={{padding:'8px 12px',textAlign:'center'}}>
                        <button
                          onClick={()=>toggleSkip(s.id)}
                          title={isSkipped ? 'Include this student' : 'Skip this student'}
                          style={{
                            width:28,height:28,borderRadius:6,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',
                            background: isSkipped ? 'rgba(240,107,122,0.15)' : 'var(--ink4)',
                            border: `1px solid ${isSkipped ? 'rgba(240,107,122,0.4)' : 'var(--line)'}`,
                            color: isSkipped ? 'var(--rose)' : 'var(--mist3)',
                            transition:'all 0.15s',
                          }}>
                          {isSkipped ? '✕' : '–'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom save bar */}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
            <Btn variant='ghost' onClick={exitBulkMode}>Exit Class View</Btn>
            <Btn onClick={saveBulk} disabled={bulkSaving||dirtyCount===0}>
              {bulkSaving ? <><Spinner/> Saving...</> : dirtyCount>0 ? `Save ${dirtyCount} change${dirtyCount!==1?'s':''}` : 'No changes'}
            </Btn>
          </div>
        </div>
      ) : (
        /* ── NORMAL LIST VIEW ── */
        <Card>
          {dataLoading ? (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody><SkeletonRows count={8} cols={6}/></tbody>
            </table>
          ) : (<>
            <DataTable onRow={isViewingPast?null:(g=>mySubjects.some(s=>s.id===g.subject_id)?openEdit(g):null)} data={paged} columns={[
            {key:'student_id',label:'Student',render:v=>{const s=students.find(x=>x.id===v);return s?(<div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={fullName(s)} size={28}/><span style={{fontWeight:600}}>{fullName(s,true)}</span></div>):'--'}},
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
          <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={50} onPage={setPage}/>
          </>)}
        </Card>
      )}
      {modal && (
        <Modal title={edit?'Edit Grade':'Record Grades'} onClose={()=>setModal(false)} width={600}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <div style={{marginBottom:16,position:'relative'}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--mist2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontFamily:"'Clash Display',sans-serif"}}>Student <span style={{color:'var(--rose)'}}>*</span></div>
              <input
                value={studentSearch || (form.student_id ? fullName(myStudents.find(s=>s.id===form.student_id),true)||'' : '')}
                onChange={e=>{setStudentSearch(e.target.value);setShowStudentDrop(true);if(!e.target.value){f('student_id')('');f('subject_id')('')}}}
                onFocus={()=>{setStudentSearch('');setShowStudentDrop(true)}}
                onBlur={()=>setTimeout(()=>setShowStudentDrop(false),150)}
                placeholder='Search student...'
                style={{width:'100%',background:'var(--ink3)',border:'1px solid var(--line)',borderRadius:'var(--r-sm)',padding:'9px 14px',color:'var(--white)',fontSize:13,boxSizing:'border-box'}}
              />
              {showStudentDrop && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--ink3)',border:'1px solid var(--line2)',borderRadius:'var(--r-sm)',zIndex:50,maxHeight:200,overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
                  {myStudents.filter(s=>{
                    if(!studentSearch) return true
                    const q=studentSearch.toLowerCase()
                    return fullName(s).toLowerCase().includes(q)||s.student_id?.toLowerCase().includes(q)
                  }).slice(0,20).map(s=>(
                    <div key={s.id}
                      onMouseDown={()=>{f('student_id')(s.id);f('subject_id')('');setStudentSearch('');setShowStudentDrop(false)}}
                      style={{padding:'9px 14px',cursor:'pointer',fontSize:13,display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--line)'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--ink4)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{fontWeight:500}}>{fullName(s,true)}</span>
                      <span style={{fontSize:11,color:'var(--mist3)'}}>{data.classes?.find(c=>c.id===s.class_id)?.name||''}</span>
                    </div>
                  ))}
                  {myStudents.filter(s=>!studentSearch||fullName(s).toLowerCase().includes(studentSearch.toLowerCase())).length===0 && (
                    <div style={{padding:'12px 14px',fontSize:12,color:'var(--mist3)'}}>No students found</div>
                  )}
                </div>
              )}
            </div>
            <Field label='Subject' value={form.subject_id} onChange={v=>{f('subject_id')(v)}} required options={(() => {
              // Filter subjects by the selected student's class, not the page-level filter
              const selectedStudent = students.find(s=>s.id===form.student_id)
              const studentClassId  = selectedStudent?.class_id
              const subjectPool     = studentClassId
                ? mySubjects.filter(s=>s.class_id===studentClassId)
                : (fc ? mySubjects.filter(s=>s.class_id===fc) : mySubjects)
              return subjectPool.map(s=>({value:s.id,label:s.name}))
            })()}/>
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
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
            <div>
              {edit && !isViewingPast && (
                <Btn variant='ghost' onClick={delGrade} disabled={saving}
                  style={{color:'var(--rose)',borderColor:'rgba(240,107,122,0.3)'}}>
                  {saving ? <><Spinner/> Deleting...</> : 'Delete Grade'}
                </Btn>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <Btn variant='ghost' onClick={()=>setModal(false)}>Cancel</Btn>
              <Btn onClick={save} disabled={saving||activeComps.length===0}>{saving?<><Spinner/> Saving...</>:'Save Grade'}</Btn>
            </div>
          </div>
        </Modal>
      )}
      {confirmState && <ConfirmModal {...confirmState} onClose={()=>setConfirmState(null)}/>}
    </div>
  )
}