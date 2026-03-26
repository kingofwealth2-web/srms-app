import { useState } from 'react'
import { useIsMobile } from '../lib/hooks'
import { ROLE_META, LETTER_COLOR, FEE_STATUS } from '../lib/constants'
import { fmtDate, calcTotal, getGradeComponents, getLetter, getGPA, getGradeLetter, getGradeRemark, DEFAULT_GRADING_SCALE, getCurrency, fmtMoney, csvEscape, generateYears , fullName } from '../lib/helpers'
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
import KPI from '../components/KPI'
import PlanGate from '../components/PlanGate'

// ── HELPERS ────────────────────────────────────────────────────
const ordinal = n => {
  if(n===null||n===undefined||isNaN(n)) return '--'
  const s=['th','st','nd','rd'], v=n%100
  return n+(s[(v-20)%10]||s[v]||s[0])
}
const abbrSubject = name => {
  if(!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if(words.length>=2) return words.map(w=>w[0].toUpperCase()).join('')
  return name.slice(0,4).toUpperCase()
}

// ── REPORTS ────────────────────────────────────────────────────
export default function Reports({profile,data,settings,activeYear,isViewingPast,toast,planHook}) {
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
    ? students.filter(s=>s.class_id===profile?.class_id&&!s.archived)
    : isTeacher && teacherClassIds
      ? students.filter(s=>teacherClassIds.includes(s.class_id)&&!s.archived)
      : students.filter(s=>!s.archived)
  const searchPool = fc ? roleBasePool.filter(s=>s.class_id===fc) : roleBasePool
  const matchedStudents = studentSearch.length>0
    ? searchPool.filter(s=>fullName(s).toLowerCase().includes(studentSearch.toLowerCase())).slice(0,8)
    : []

  const selectStudent = s => {
    setSelectedStudent(s)
    setStudentSearch(fullName(s,true))
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
  // Assign positions (standard competition ranking with ties: 1,1,3,...)
  let lastScoreAcad = null
  let lastRankAcad  = 0
  let seenAcad      = 0
  const rankedAcademic = sortedAcademic.map(s=>{
    seenAcad++
    const score = s.total||0
    if(lastScoreAcad===null || score!==lastScoreAcad){
      lastRankAcad = seenAcad
      lastScoreAcad = score
    }
    return {...s,position:lastRankAcad}
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
        let lastScore=null,lastRank=0,seen=0
        const ranked=allAcad.map(s=>{
          seen++
          if(lastScore===null || s.total!==lastScore){
            lastRank=seen
            lastScore=s.total
          }
          return {...s,pos:lastRank}
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
      const scope=selectedStudent?`${fullName(selectedStudent,true).replace(/\s+/g,'_')}`:fc?classes.find(c=>c.id===fc)?.name?.replace(/\s+/g,'_'):'All'

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
          .reduce((acc,s,i,arr)=>{
            let rank=i+1
            if(i>0&&(s.total||0)===(arr[i-1].total||0)) rank=acc[i-1].position
            acc.push({...s,position:rank}); return acc
          },[])
        csv='Position,Student ID,Student,'+rcClassSubjects.map(s=>`"${csvEscape(s.name)}"`).join(',')+',Total,Average,Grade,Remark,Status\n'
        rcRanked.forEach(s=>{
          csv+=`${ordinal(s.position)},"${csvEscape(s.student_id)}","${csvEscape(fullName(s))}",`
          csv+=rcClassSubjects.map(sub=>s.scores[sub.id]??'--').join(',')
          csv+=`,${s.total||0},${s.avg??0},${csvEscape(s.letter)},"${csvEscape(s.remark)}",${s.pass===null?'--':s.pass?'Pass':'Fail'}\n`
        })
        const cls=classes.find(c=>c.id===rcClass)
        filename=`SRMS_Broadsheet_${cls?.name?.replace(/\s+/g,'_')||'Class'}_${rcPeriod||'AllPeriods'}.csv`
      } else if(rtype==='academic'){
        if(selectedStudent){
          csv='Subject,'+gradeComps.filter(c=>c.enabled).map(c=>csvEscape(c.label)).join(',')+',Total,Grade,Remark,Status\n'
          grades.filter(g=>g.student_id===selectedStudent.id&&(!fp||g.period===fp)).forEach(g=>{
            const subj=subjects.find(s=>s.id===g.subject_id)
            const tot=calcTotal(g,gradeComps), let_=getLetter(tot,scale), rem=getGradeRemark(tot,scale)
            csv+=`"${csvEscape(subj?.name||'--')}",${gradeComps.filter(c=>c.enabled).map(c=>g[c.key]||0).join(',')},${tot},${csvEscape(let_)},"${csvEscape(rem)}",${tot>=50?'Pass':'Fail'}\n`
          })
        } else {
          const visSubjects=classSubjects.length>0?classSubjects:subjects
          csv='Position,Student ID,Student,'+visSubjects.map(s=>`"${csvEscape(s.name)}"`).join(',')
          // Add component columns per subject
          visSubjects.forEach(sub=>{
            gradeComps.filter(c=>c.enabled).forEach(c=>{ csv+=`,"${csvEscape(sub.name)} - ${csvEscape(c.label)}"` })
          })
          csv+=',Total,Average,Grade,Remark,Status\n'
          rankedAcademic.forEach(s=>{
            let row=`${ordinal(s.position)},"${csvEscape(s.student_id)}","${csvEscape(fullName(s))}"`
            visSubjects.forEach(sub=>{
              const g=grades.find(gr=>gr.student_id===s.id&&gr.subject_id===sub.id&&(!fp||gr.period===fp))
              gradeComps.filter(c=>c.enabled).forEach(c=>{ row+=`,${g?g[c.key]||0:'--'}` })
            })
            row+=`,${s.total||0},${s.avg??0},${csvEscape(s.letter)},"${csvEscape(s.remark||'')}",${s.pass===null?'--':s.pass?'Pass':'Fail'}\n`
            csv+=row
          })
        }
        filename=`SRMS_Academic_${scope}_${fp||'AllPeriods'}.csv`
      } else if(rtype==='attendance'){
        csv='Student ID,Student,Class,Total Days,Present,Absent,Late,Excused,Rate\n'
        attData.forEach(s=>{csv+=`"${s.student_id}","${fullName(s)}","${classes.find(c=>c.id===s.class_id)?.name||'--'}",${s.total},${s.present},${s.absent},${s.late},${s.excused},${s.rate!==null?s.rate+'%':'--'}\n`})
        filename=`SRMS_Attendance_${scope}.csv`
      } else {
        csv='Student ID,Student,Class,Total Owed,Paid,Balance,Status\n'
        feeData.forEach(s=>{csv+=`"${s.student_id}","${fullName(s)}","${classes.find(c=>c.id===s.class_id)?.name||'--'}","${fmtMoney(s.owed,currency)}","${fmtMoney(s.paid,currency)}","${fmtMoney(s.balance,currency)}",${s.feeStatus}\n`})
        filename=`SRMS_Fees_${scope}.csv`
      }
      const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a'); a.href=url; a.download=filename; a.click()
      URL.revokeObjectURL(url)
    } catch(e){ toast('Export failed. Please try again.','error') }
  }

  const scopeLabel = selectedStudent
    ? fullName(selectedStudent,true)
    : fc ? classes.find(c=>c.id===fc)?.name : 'All Students'

  return (
    <div>
      <PageHeader title='Reports & Analytics' sub={`Viewing: ${scopeLabel}`}>
        {isAdmin && rtype!=='reportcards' && <PlanGate planHook={planHook} feature='reportsExcel' mode='inline'><Btn variant='ghost' onClick={exportExcel}>⬇ Export Excel</Btn></PlanGate>}
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
                    <Avatar name={fullName(s)} size={26}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{fullName(s,true)}</div>
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
            {selectedStudent && <Badge color='var(--gold)' bg='rgba(232,184,75,0.1)'>Student: {fullName(selectedStudent)}</Badge>}
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
                              <td style={tdStyle}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={`${selectedStudent.first_name} ${selectedStudent.last_name}`} size={24} photo={selectedStudent.photo}/><span style={{fontWeight:600}}>{fullName(selectedStudent)}</span></div></td>
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
                              <td style={tdStyle}><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={fullName(s)} size={26} photo={s.photo}/><span style={{fontWeight:600}}>{fullName(s)}</span></div></td>
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
            {key:'first_name',label:'Student',render:(v,r)=><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={fullName(r)} size={28}/><span style={{fontWeight:600}}>{fullName(r,true)}</span></div>},
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
            {key:'first_name',label:'Student',render:(v,r)=><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={fullName(r)} size={28}/><span style={{fontWeight:600}}>{fullName(r,true)}</span></div>},
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
          planHook={planHook}
        />
      )}
    </div>
  )
}
// Table cell styles used in reports
const thStyle={padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:'var(--mist3)',textTransform:'uppercase',letterSpacing:'0.1em',whiteSpace:'nowrap',fontFamily:"'Clash Display',sans-serif",background:'var(--ink3)'}
const tdStyle={padding:'11px 12px',fontSize:13,color:'var(--white)',verticalAlign:'middle'}

// ── REPORT CARDS ───────────────────────────────────────────────
function ReportCards({profile,data,settings,activeYear,rcClass,setRcClass,rcPeriod,setRcPeriod,rcType,setRcType,rcSubject,setRcSubject,rcStudent,setRcStudent,rcRemarks,setRcRemarks,rcHeadRemark,setRcHeadRemark,rcResumption,setRcResumption,rcHeadTeacher,setRcHeadTeacher,rcStamp,setRcStamp,rcClassTeacherName,setRcClassTeacherName,exportExcel,planHook}) {
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

  // Rank students by total — proper tie handling (standard competition ranking)
  const rankedStudents = (() => {
    const withGrades    = [...classStudents].map(s=>({...s, total: getStudentTotal(s.id)})).filter(s=>s.total!==null)
    const withoutGrades = [...classStudents].map(s=>({...s, total: null})).filter(s=>getStudentTotal(s.id)===null)
    withGrades.sort((a,b)=>b.total-a.total)
    let lastScore = null
    let lastRank  = 0
    let seen      = 0
    const ranked = []
    withGrades.forEach(s=>{
      seen++
      if(lastScore===null || s.total!==lastScore){
        lastRank = seen
        lastScore = s.total
      }
      ranked.push({...s,position:lastRank})
    })
    return [...ranked, ...withoutGrades.map(s=>({...s,position:null}))]
  })()

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
  const openPrint = (html, w=860, h=960) => {
    const win = window.open('', '_blank', `width=${w},height=${h}`)
    if (!win) { toast('Popup blocked — please allow popups for this site and try again.', 'error'); return }
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const fmtScore = (v) => {
    if(v===null || v===undefined || Number.isNaN(v)) return '--'
    return Math.round(v)
  }

  const logoTag = schoolLogo
    ? `<img src="${schoolLogo}" style="width:60px;height:60px;object-fit:contain;" />`
    : `<div style="width:60px;height:60px;border-radius:50%;background:rgba(251,191,36,0.15);border:2px solid rgba(251,191,36,0.4);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fbbf24;">${schoolName.charAt(0)}</div>`

  const baseStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f0f2f5;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    table{border-collapse:collapse}
    .no-print{display:block}
    @media print{
      @page{margin:8mm}
      .no-print{display:none!important}
      body{background:#fff}
    }
    @media screen{body{padding:20px}}
  `

  // ── BROADSHEET ─────────────────────────────────────────────────
  const printBroadsheet = () => {
    if(!rcClass||!rcPeriod) return
    const cls = classes.find(c=>c.id===rcClass)

    const subjectCols = classSubjects.map(s=>`
      <th style="padding:10px 7px;text-align:center;font-size:8.5px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;border:1px solid #e5e7eb;background:#f9fafb;max-width:72px;word-break:break-word;line-height:1.3;">${s.name}</th>`).join('')

    const rows = rankedStudents.map((s,i)=>{
      const subjectCells = classSubjects.map(sub=>{
        const t = getTotal(s.id,sub.id)
        const c = t===null?'#9ca3af':t<50?'#dc2626':t>=75?'#16a34a':'#1d4ed8'
        const bg= t===null?'#f9fafb':t<50?'#fef2f2':t>=75?'#f0fdf4':'#eff6ff'
        return `<td style="padding:8px 6px;text-align:center;font-size:12px;font-weight:700;border:1px solid #f3f4f6;color:${c};background:${bg};">${t!==null?t:'—'}</td>`
      }).join('')
      const total  = s.total
      const scoredCount = classSubjects.filter(sub=>getTotal(s.id,sub.id)!==null).length
      const avg    = scoredCount>0&&total!==null ? total/scoredCount : null
      const letter = avg!==null ? getGradeLetter(avg,scale) : '--'
      const remark = avg!==null ? getGradeRemark(avg,scale) : '--'
      const posOrd = s.position!==null ? ordinal(s.position) : '—'
      const posC   = s.position===null?'#9ca3af':s.position===1?'#b45309':s.position===2?'#6b7280':s.position===3?'#92400e':'#6d28d9'
      const posBg  = s.position===null?'#f9fafb':s.position===1?'#fef3c7':s.position===2?'#f3f4f6':s.position===3?'#fef3c7':'#f5f3ff'
      const rowBg  = i%2===0?'#ffffff':'#f9fafb'
      return `<tr style="background:${rowBg};">
        <td style="padding:8px 12px;font-size:11px;font-family:monospace;border:1px solid #f3f4f6;color:#6b7280;">${s.student_id}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:600;border:1px solid #f3f4f6;color:#111827;">${s.last_name}, ${s.first_name}</td>
        ${subjectCells}
        <td style="padding:8px 8px;text-align:center;font-size:13px;font-weight:800;border:1px solid #f3f4f6;background:#dbeafe;color:#1e40af;">${total!==null?total:'—'}</td>
        <td style="padding:8px 8px;text-align:center;font-size:12px;font-weight:700;border:1px solid #f3f4f6;background:#dbeafe;color:#1e40af;">${avg!==null?Math.round(avg):'—'}</td>
        <td style="padding:8px 8px;text-align:center;font-size:12px;font-weight:700;border:1px solid #f3f4f6;color:#d97706;">${letter}</td>
        <td style="padding:8px 10px;font-size:11px;border:1px solid #f3f4f6;color:#4b5563;">${remark}</td>
        <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:800;border:1px solid #f3f4f6;color:${posC};background:${posBg};">${posOrd}</td>
      </tr>`
    }).join('')

    const passCount = rankedStudents.filter(s=>{
      if(s.total===null) return false
      const sc=classSubjects.filter(sub=>getTotal(s.id,sub.id)!==null).length
      return sc>0&&s.total/sc>=50
    }).length
    const withT = rankedStudents.filter(s=>s.total!==null)
    const classAvg = withT.length
      ? withT.reduce((a,s)=>{const sc=classSubjects.filter(sub=>getTotal(s.id,sub.id)!==null).length;return a+(sc>0?s.total/sc:0)},0)/withT.length
      : null

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Broadsheet — ${cls?.name} — ${rcPeriod}</title>
    <style>
      ${baseStyles}
      .wrap{background:#fff;border-radius:14px;overflow:hidden;max-width:1120px;margin:0 auto 24px;box-shadow:0 4px 32px rgba(0,0,0,0.1);}
      @media print{@page{size:A4 landscape;margin:8mm}.wrap{box-shadow:none;border-radius:0;max-width:100%}table th,table td{font-size:9px!important;padding:4px 5px!important}}
      @media screen{.wrap{overflow-x:auto}}
    </style></head><body>
    <div class="wrap">
      <div style="height:5px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1e40af 100%);padding:22px 28px;display:flex;align-items:center;gap:18px;">
        ${logoTag}
        <div style="flex:1;">
          <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.01em;">${schoolName}</div>
          ${schoolMotto?`<div style="font-size:10px;color:#93c5fd;margin-top:3px;font-style:italic;">"${schoolMotto}"</div>`:''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:5px;">Terminal Report — Class Broadsheet</div>
          <div style="font-size:22px;font-weight:800;color:#fbbf24;">${cls?.name||'--'}</div>
          <div style="font-size:11px;color:#bfdbfe;margin-top:3px;">${rcPeriod} &nbsp;·&nbsp; ${activeYear}</div>
        </div>
      </div>
      <div style="background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:11px 28px;display:flex;gap:28px;align-items:center;flex-wrap:wrap;">
        <div style="font-size:12px;color:#6b7280;">Students: <strong style="color:#111827;">${rankedStudents.length}</strong></div>
        <div style="font-size:12px;color:#6b7280;">Subjects: <strong style="color:#111827;">${classSubjects.length}</strong></div>
        <div style="font-size:12px;color:#6b7280;">Pass Rate: <strong style="color:${rankedStudents.length&&passCount/rankedStudents.length>=0.7?'#16a34a':'#dc2626'};">${rankedStudents.length?Math.round(passCount/rankedStudents.length*100):0}%</strong></div>
        <div style="font-size:12px;color:#6b7280;">Class Avg: <strong style="color:#1e40af;">${classAvg!==null?fmtScore(classAvg):'--'}</strong></div>
        <div style="margin-left:auto;font-size:10px;color:#9ca3af;">Generated: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
      </div>
      <div style="padding:16px;">
        <table style="width:100%;min-width:600px;">
          <thead>
            <tr>
              <th style="padding:10px 12px;text-align:left;font-size:8.5px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;border:1px solid #e5e7eb;background:#f9fafb;white-space:nowrap;">Student ID</th>
              <th style="padding:10px 12px;text-align:left;font-size:8.5px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;border:1px solid #e5e7eb;background:#f9fafb;white-space:nowrap;">Student Name</th>
              ${subjectCols}
              <th style="padding:10px 8px;text-align:center;font-size:8.5px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.07em;border:1px solid #e5e7eb;background:#dbeafe;">Total</th>
              <th style="padding:10px 8px;text-align:center;font-size:8.5px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.07em;border:1px solid #e5e7eb;background:#dbeafe;">Avg</th>
              <th style="padding:10px 8px;text-align:center;font-size:8.5px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.07em;border:1px solid #e5e7eb;background:#fef9ec;">Grade</th>
              <th style="padding:10px 10px;text-align:left;font-size:8.5px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.07em;border:1px solid #e5e7eb;background:#f9fafb;">Remark</th>
              <th style="padding:10px 10px;text-align:center;font-size:8.5px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.07em;border:1px solid #e5e7eb;background:#f5f3ff;white-space:nowrap;">Position</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:18px 28px 24px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
        <div style="font-size:10px;color:#9ca3af;">${rankedStudents.length} students &nbsp;·&nbsp; ${rcPeriod} &nbsp;·&nbsp; ${activeYear}</div>
        <div style="display:flex;gap:48px;">
          <div style="text-align:center;">
            <div style="width:180px;border-bottom:1.5px solid #9ca3af;height:36px;"></div>
            <div style="font-size:10px;font-weight:600;color:#4b5563;margin-top:5px;">Class Teacher</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${rcClassTeacherName||'_______________________'}</div>
          </div>
          <div style="text-align:center;">
            <div style="width:180px;border-bottom:1.5px solid #9ca3af;height:36px;"></div>
            <div style="font-size:10px;font-weight:600;color:#4b5563;margin-top:5px;">Head Teacher</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${rcHeadTeacher||'_______________________'}</div>
          </div>
        </div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>
    </div>
    <div class="no-print" style="max-width:1120px;margin:0 auto;text-align:center;padding:14px;">
      <button onclick="window.print()" style="padding:12px 36px;background:#1e3a8a;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">⎙ &nbsp;Print Broadsheet</button>
    </div>
    </body></html>`
    openPrint(html, 1200, 860)
  }

  // ── SUBJECT REPORT ─────────────────────────────────────────────
  const printSubjectReport = () => {
    if(!rcClass||!rcPeriod||!rcSubject) return
    const cls = classes.find(c=>c.id===rcClass)
    const sub = subjects.find(s=>s.id===rcSubject)
    const subTeacher = sub?.teacher_id ? users.find(u=>u.id===sub.teacher_id) : null

    const rankedBySub = [...classStudents].map(s=>({...s,score:getTotal(s.id,rcSubject)}))
      .sort((a,b)=>(b.score||0)-(a.score||0))
    let lastScore=null, lastRank=0, seen=0
    const ranked = rankedBySub.map((s)=>{
      if(s.score===null) return {...s,position:null}
      seen++
      if(lastScore===null||s.score!==lastScore){ lastRank=seen; lastScore=s.score }
      return {...s,position:lastRank}
    })

    const withScore = ranked.filter(s=>s.score!==null)
    const passCount = withScore.filter(s=>s.score>=50).length
    const avgScore  = withScore.length ? Math.round(withScore.reduce((a,s)=>a+s.score,0)/withScore.length) : '--'

    const rows = ranked.map((s,i)=>{
      const letter  = s.score!==null ? getGradeLetter(s.score,scale) : '--'
      const remark  = s.score!==null ? getGradeRemark(s.score,scale) : '--'
      const scoreC  = s.score===null?'#9ca3af':s.score<50?'#dc2626':s.score>=75?'#16a34a':'#1d4ed8'
      const posOrd  = s.position!==null ? ordinal(s.position) : '—'
      const posC    = s.position===1?'#b45309':s.position===2?'#6b7280':s.position===3?'#92400e':'#6d28d9'
      const posBg   = s.position===1?'#fef3c7':s.position===2?'#f3f4f6':s.position===3?'#fef3c7':'#f5f3ff'
      return `<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
        <td style="padding:10px 14px;font-size:11px;font-family:monospace;border-bottom:1px solid #f3f4f6;color:#6b7280;">${s.student_id}</td>
        <td style="padding:10px 14px;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;color:#111827;">${s.last_name}, ${s.first_name}${s.middle_name?" "+s.middle_name[0]+".":""}</td>
        <td style="padding:10px 14px;text-align:center;font-size:18px;font-weight:800;border-bottom:1px solid #f3f4f6;color:${scoreC};">${s.score!==null?s.score:'—'}</td>
        <td style="padding:10px 14px;text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid #f3f4f6;color:#d97706;">${letter}</td>
        <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #f3f4f6;color:#4b5563;">${remark}</td>
        <td style="padding:10px 14px;text-align:center;font-size:14px;font-weight:800;border-bottom:1px solid #f3f4f6;color:${posC};background:${posBg};">${posOrd}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Subject Report — ${sub?.name}</title>
    <style>
      ${baseStyles}
      .wrap{background:#fff;border-radius:14px;overflow:hidden;max-width:700px;margin:0 auto 24px;box-shadow:0 4px 32px rgba(0,0,0,0.1);}
      @media print{@page{size:A4 portrait;margin:12mm}.wrap{box-shadow:none;border-radius:0;max-width:100%}}
    </style></head><body>
    <div class="wrap">
      <div style="height:5px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1e40af 100%);padding:22px 28px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;">
          ${logoTag}
          <div>
            <div style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:#fff;">${schoolName}</div>
            ${schoolMotto?`<div style="font-size:10px;color:#93c5fd;font-style:italic;">"${schoolMotto}"</div>`:''}
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:9px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:5px;">Subject Performance Report</div>
            <div style="font-size:22px;font-weight:800;color:#fbbf24;">${sub?.name||'--'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:#bfdbfe;">${cls?.name||'--'} &nbsp;·&nbsp; ${rcPeriod} &nbsp;·&nbsp; ${activeYear}</div>
            ${subTeacher?`<div style="font-size:11px;color:#93c5fd;margin-top:3px;">Teacher: ${subTeacher.full_name}</div>`:''}
          </div>
        </div>
      </div>
      <div style="background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:10px 28px;display:flex;gap:24px;">
        <div style="font-size:12px;color:#6b7280;">Students: <strong style="color:#111827;">${ranked.length}</strong></div>
        <div style="font-size:12px;color:#6b7280;">Pass Rate: <strong style="color:${withScore.length&&passCount/withScore.length>=0.7?'#16a34a':'#dc2626'};">${withScore.length?Math.round(passCount/withScore.length*100):0}%</strong></div>
        <div style="font-size:12px;color:#6b7280;">Class Avg: <strong style="color:#1e40af;">${avgScore}</strong></div>
      </div>
      <div style="padding:16px;">
        <table style="width:100%;">
          <thead>
            <tr style="border-bottom:2px solid #1e3a8a;">
              ${['ID','Student Name','Score','Grade','Remark','Position'].map((h,idx)=>`<th style="padding:10px ${idx<2?14:8}px;text-align:${idx===2||idx===3||idx===5?'center':'left'};font-size:9px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:16px 28px 22px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="font-size:10px;color:#9ca3af;">Generated ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
        <div style="text-align:center;">
          <div style="width:170px;border-bottom:1.5px solid #9ca3af;height:32px;"></div>
          <div style="font-size:10px;font-weight:600;color:#4b5563;margin-top:5px;">Subject Teacher</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${subTeacher?.full_name||'_______________________'}</div>
        </div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>
    </div>
    <div class="no-print" style="max-width:700px;margin:0 auto;text-align:center;padding:14px;">
      <button onclick="window.print()" style="padding:12px 32px;background:#1e3a8a;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#fff;cursor:pointer;">⎙ &nbsp;Print Subject Report</button>
    </div>
    </body></html>`
    openPrint(html, 800, 900)
  }

  // ── INDIVIDUAL REPORT CARD ─────────────────────────────────────
  const buildReportCard = (student) => {
    const cls           = classes.find(c=>c.id===student.class_id)
    const att           = getAttendance(student.id)
    const beh           = getBehaviour(student.id)
    const sPos          = rankedStudents.find(s=>s.id===student.id)?.position||'--'
    const teacherRemark = rcRemarks[student.id]||''

    const activeComps = gradeComps.filter(c=>c.enabled)
    const subjectRows = classSubjects.map((sub,si)=>{
      const g      = grades.find(gr=>gr.student_id===student.id&&gr.subject_id===sub.id&&(!rcPeriod||gr.period===rcPeriod))
      const total  = g ? calcTotal(g,gradeComps) : null
      const letter = total!==null ? getGradeLetter(total,scale) : '--'
      const remark = total!==null ? getGradeRemark(total,scale) : '--'
      const scoreC = total===null?'#9ca3af':total<50?'#dc2626':total>=75?'#16a34a':'#1d4ed8'
      const rowBg  = si%2===0 ? '#ffffff' : '#f9fafb'
      const compCells = activeComps.map(c=>{
        const raw  = g ? (+g[c.key]||0) : null
        const pct  = raw!==null ? Math.round((raw/c.max_score)*100) : null
        const barC = pct===null?'#e5e7eb':pct<50?'#fecaca':pct>=75?'#bbf7d0':'#bfdbfe'
        const barFill = pct===null?'#d1d5db':pct<50?'#ef4444':pct>=75?'#16a34a':'#3b82f6'
        return `<td style="padding:7px 6px;text-align:center;border-bottom:1px solid #f3f4f6;background:${rowBg};">
          ${raw!==null ? `<div style="font-size:12px;font-weight:700;color:#111827;line-height:1;">${raw}<span style="font-size:9px;font-weight:400;color:#9ca3af;">/${c.max_score}</span></div>
          <div style="margin-top:4px;height:4px;border-radius:2px;background:${barC};overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${barFill};border-radius:2px;"></div>
          </div>` : '<span style="color:#d1d5db;font-size:11px;">—</span>'}
        </td>`
      }).join('')
      return `<tr style="background:${rowBg};">
        <td style="padding:8px 12px;font-size:12px;font-weight:600;border-bottom:1px solid #f3f4f6;color:#111827;white-space:nowrap;">${sub.name}</td>
        ${compCells}
        <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #f3f4f6;background:${rowBg};">
          <span style="font-size:15px;font-weight:900;color:${scoreC};">${total!==null?total:'—'}</span>
        </td>
        <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #f3f4f6;background:${rowBg};">
          <span style="display:inline-block;padding:2px 8px;background:${scoreC}18;border:1px solid ${scoreC}40;border-radius:20px;font-size:10px;font-weight:800;color:${scoreC};">${letter}</span>
        </td>
        <td style="padding:8px 10px;font-size:10px;border-bottom:1px solid #f3f4f6;color:#4b5563;background:${rowBg};">${remark}</td>
      </tr>`
    }).join('')

    const subTotals  = classSubjects.map(s=>{
      const g=grades.find(gr=>gr.student_id===student.id&&gr.subject_id===s.id&&(!rcPeriod||gr.period===rcPeriod))
      return g?calcTotal(g,gradeComps):null
    }).filter(t=>t!==null)
    const grandTotal  = subTotals.length ? subTotals.reduce((a,b)=>a+b,0) : null
    const grandAvg    = grandTotal!==null ? grandTotal/subTotals.length : null
    const grandLetter = grandAvg!==null ? getGradeLetter(grandAvg,scale) : '--'
    const grandRemark = grandAvg!==null ? getGradeRemark(grandAvg,scale) : '--'
    const gradeC      = grandAvg===null?'#6b7280':grandAvg>=75?'#16a34a':grandAvg>=50?'#1d4ed8':'#dc2626'

    const photoTag = student.photo
      ? `<img src="${student.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #fbbf24;flex-shrink:0;" />`
      : `<div style="width:80px;height:80px;border-radius:50%;background:rgba(251,191,36,0.15);border:3px solid rgba(251,191,36,0.35);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fbbf24;flex-shrink:0;">${student.first_name[0]}${student.middle_name?student.middle_name[0]:''}${student.last_name[0]}</div>`

    const stampBox = rcStamp
      ? `<div style="width:88px;height:88px;border:2px dashed #d1d5db;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#d1d5db;text-align:center;line-height:1.4;">OFFICIAL<br>STAMP</div>`
      : ''

    const lastPeriodLabel = Array.from({length:settings?.period_count||2},(_,i)=>`${settings?.period_type==='term'?'Term':'Semester'} ${i+1}`).at(-1)
    const isLastPeriod = rcPeriod===lastPeriodLabel

    return `
    <div style="background:#fff;border-radius:14px;overflow:hidden;page-break-after:always;max-width:780px;margin:0 auto 24px;box-shadow:0 4px 32px rgba(0,0,0,0.10);">
      <div style="height:5px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1e40af 100%);padding:22px 28px;display:flex;align-items:center;gap:20px;">
        ${logoTag}
        <div style="flex:1;text-align:center;">
          <div style="font-family:'Playfair Display',serif;font-size:19px;font-weight:700;color:#fff;letter-spacing:-0.01em;">${schoolName}</div>
          ${schoolMotto?`<div style="font-size:10px;color:#93c5fd;margin-top:3px;font-style:italic;">"${schoolMotto}"</div>`:''}
          <div style="display:inline-block;margin-top:8px;padding:4px 18px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);border-radius:20px;">
            <span style="font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.14em;">Student Terminal Report Card</span>
          </div>
        </div>
        ${photoTag}
      </div>

      <!-- Student info bar -->
      <div style="background:#f8fafc;border-bottom:2px solid #e5e7eb;padding:14px 28px;display:flex;gap:0;align-items:stretch;flex-wrap:wrap;">
        <div style="padding:0 20px 0 0;margin-right:20px;border-right:1px solid #e5e7eb;">
          <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Student Name</div>
          <div style="font-size:17px;font-weight:700;color:#111827;font-family:'Playfair Display',serif;">${student.first_name}${student.middle_name?' '+student.middle_name:''}  ${student.last_name}</div>
        </div>
        <div style="padding:0 20px;border-right:1px solid #e5e7eb;">
          <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Student ID</div>
          <div style="font-size:13px;font-weight:600;color:#6b7280;font-family:monospace;">${student.student_id}</div>
        </div>
        <div style="padding:0 20px;border-right:1px solid #e5e7eb;">
          <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Class</div>
          <div style="font-size:13px;font-weight:600;color:#111827;">${cls?.name||'--'}</div>
        </div>
        <div style="padding:0 20px;border-right:1px solid #e5e7eb;">
          <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Period</div>
          <div style="font-size:13px;font-weight:600;color:#111827;">${rcPeriod}</div>
        </div>
        <div style="padding:0 20px;border-right:1px solid #e5e7eb;">
          <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Acad. Year</div>
          <div style="font-size:13px;font-weight:600;color:#111827;">${activeYear}</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:14px;padding-left:16px;">
          <div style="text-align:center;padding:8px 16px;background:#fff;border:2px solid ${gradeC};border-radius:10px;">
            <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">Grade</div>
            <div style="font-size:22px;font-weight:900;color:${gradeC};">${grandLetter}</div>
            <div style="font-size:9px;color:#9ca3af;margin-top:1px;">${grandRemark}</div>
          </div>
          <div style="text-align:center;padding:8px 16px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:10px;">
            <div style="font-size:9px;color:rgba(0,0,0,0.45);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">Position</div>
            <div style="font-size:22px;font-weight:900;color:#111827;">${sPos!=='--'?ordinal(sPos):'--'}</div>
            <div style="font-size:9px;color:rgba(0,0,0,0.45);">of ${classStudents.length}</div>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div style="display:block;">

        <!-- Academic: full width -->
        <div style="padding:20px 28px 0 28px;border-bottom:1px solid #f3f4f6;">
          <div style="font-size:9px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
            <div style="width:3px;height:12px;background:#1e3a8a;border-radius:2px;flex-shrink:0;"></div>
            Academic Performance
          </div>
          <table style="width:100%;">
            <thead>
              <tr style="background:linear-gradient(135deg,#eff6ff,#f8fafc);">
                <th style="padding:8px 12px;text-align:left;font-size:8.5px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;white-space:nowrap;">Subject</th>
                ${activeComps.map(c=>`<th style="padding:8px 6px;text-align:center;font-size:8px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #1e3a8a;white-space:nowrap;">${c.label}<br><span style="font-size:8px;font-weight:400;color:#6b7280;text-transform:none;letter-spacing:0;">(/${c.max_score})</span></th>`).join('')}
                <th style="padding:8px 8px;text-align:center;font-size:8.5px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;white-space:nowrap;">Total<br><span style="font-size:8px;font-weight:400;color:#6b7280;text-transform:none;">/100</span></th>
                <th style="padding:8px 8px;text-align:center;font-size:8.5px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;">Grade</th>
                <th style="padding:8px 10px;text-align:left;font-size:8.5px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #1e3a8a;">Remark</th>
              </tr>
            </thead>
            <tbody>${subjectRows}</tbody>
            <tfoot>
              <tr style="background:linear-gradient(135deg,#eff6ff,#e0f2fe);border-top:2px solid #1e3a8a;">
                <td style="padding:9px 12px;font-size:11px;font-weight:700;color:#1e3a8a;">Average</td>
                ${activeComps.map(()=>'<td style="border-top:2px solid #1e3a8a;"></td>').join('')}
                <td style="padding:9px 8px;text-align:center;font-size:16px;font-weight:900;color:#1e3a8a;">${grandAvg!==null?Math.round(grandAvg):'—'}</td>
                <td style="padding:9px 8px;text-align:center;"><span style="display:inline-block;padding:3px 10px;background:#1e3a8a;border-radius:20px;font-size:11px;font-weight:800;color:#fff;">${grandLetter}</span></td>
                <td style="padding:9px 10px;font-size:10px;color:#4b5563;">${grandRemark}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Bottom: Attendance, Conduct, Remarks -->
        <div style="padding:20px 28px 20px 28px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">

          <!-- Attendance -->
          <div>
            <div style="font-size:9px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
              <div style="width:3px;height:12px;background:#1e3a8a;border-radius:2px;flex-shrink:0;"></div>
              Attendance
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="flex:1;height:7px;background:#f3f4f6;border-radius:4px;overflow:hidden;">
                <div style="width:${att.rate!==null?att.rate:0}%;height:100%;background:${att.rate!==null&&att.rate>=80?'#16a34a':att.rate!==null&&att.rate>=60?'#d97706':'#dc2626'};border-radius:4px;"></div>
              </div>
              <span style="font-size:16px;font-weight:800;color:${att.rate!==null&&att.rate>=80?'#16a34a':att.rate!==null&&att.rate>=60?'#d97706':'#dc2626'};">${att.rate!==null?att.rate+'%':'—'}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
              ${[['Present',att.present,'#16a34a','#f0fdf4'],['Absent',att.absent,'#dc2626','#fef2f2'],['Late',att.late,'#d97706','#fef9ec']].map(([l,v,c,bg])=>`
              <div style="text-align:center;padding:7px 6px;background:${bg};border-radius:8px;border:1px solid ${c}20;">
                <div style="font-size:17px;font-weight:900;color:${c};">${v}</div>
                <div style="font-size:9px;color:#6b7280;margin-top:2px;">${l}</div>
              </div>`).join('')}
            </div>
          </div>

          <!-- Conduct -->
          <div>
            <div style="font-size:9px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
              <div style="width:3px;height:12px;background:#1e3a8a;border-radius:2px;flex-shrink:0;"></div>
              Conduct
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="padding:10px;background:#f0fdf4;border-radius:8px;border:1px solid #16a34a30;text-align:center;">
                <div style="font-size:17px;font-weight:900;color:#16a34a;">🏆 ${beh.achievements}</div>
                <div style="font-size:9px;color:#6b7280;margin-top:3px;">Achievement${beh.achievements!==1?'s':''}</div>
              </div>
              <div style="padding:10px;background:#fef2f2;border-radius:8px;border:1px solid #dc262630;text-align:center;">
                <div style="font-size:17px;font-weight:900;color:#dc2626;">⚡ ${beh.discipline}</div>
                <div style="font-size:9px;color:#6b7280;margin-top:3px;">Discipline note${beh.discipline!==1?'s':''}</div>
              </div>
            </div>
          </div>

          <!-- Teacher Remark -->
          <div>
            <div style="font-size:9px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
              <div style="width:3px;height:12px;background:#1e3a8a;border-radius:2px;flex-shrink:0;"></div>
              Class Teacher's Remark
            </div>
            <div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:4px solid #1e3a8a;font-size:12px;color:#374151;min-height:44px;line-height:1.6;font-style:italic;">${teacherRemark||'<span style="color:#d1d5db;">No remark entered</span>'}</div>
          </div>

          ${rcHeadRemark?`<div style="margin-bottom:14px;">
            <div style="font-size:9px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Head Teacher's Remark</div>
            <div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:4px solid #fbbf24;font-size:12px;color:#374151;line-height:1.6;font-style:italic;">${rcHeadRemark}</div>
          </div>`:''}

          ${rcResumption?`<div style="padding:8px 14px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;font-size:11px;color:#1e3a8a;margin-bottom:10px;"><span style="font-weight:700;">Next Term Resumes:</span> ${rcResumption}</div>`:''}

          ${isLastPeriod?`<div style="padding:8px 14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;font-size:11px;color:#4b5563;margin-bottom:10px;"><span style="font-weight:700;color:#111827;">Promoted to:</span> _______________________________</div>`:''}
        </div>
      </div>

      <!-- Signatures -->
      <div style="padding:16px 28px 20px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
        <div style="font-size:10px;color:#9ca3af;">Generated ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
        <div style="display:flex;gap:36px;align-items:flex-end;">
          <div style="text-align:center;">
            <div style="width:150px;border-bottom:1.5px solid #9ca3af;height:32px;"></div>
            <div style="font-size:10px;font-weight:600;color:#4b5563;margin-top:5px;">Class Teacher</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${rcClassTeacherName||'_________________'}</div>
          </div>
          <div style="text-align:center;">
            <div style="width:150px;border-bottom:1.5px solid #9ca3af;height:32px;"></div>
            <div style="font-size:10px;font-weight:600;color:#4b5563;margin-top:5px;">Head Teacher</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${rcHeadTeacher||'_________________'}</div>
          </div>
          ${stampBox}
        </div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#3b82f6,#1e3a8a);"></div>
    </div>`
  }

  const cardStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f0f2f5;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:block}
    @media print{@page{size:A4 portrait;margin:8mm}body{background:#fff;padding:0}.no-print{display:none!important}}
    @media screen{body{padding:20px}}
  `

  const printOneCard = () => {
    if(!rcStudent) return
    const student = classStudents.find(s=>s.id===rcStudent)
    if(!student) return
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report Card — ${student.first_name}${student.middle_name?' '+student.middle_name:''} ${student.last_name}</title>
    <style>${cardStyles}</style></head>
    <body>${buildReportCard(student)}
    <div class="no-print" style="max-width:800px;margin:0 auto;text-align:center;padding:16px;">
      <button onclick="window.print()" style="padding:12px 36px;background:#1e3a8a;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">⎙ &nbsp;Print Report Card</button>
    </div></body></html>`
    openPrint(html, 860, 960)
  }

  const printAllCards = () => {
    if(!rcClass) return
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report Cards — ${classes.find(c=>c.id===rcClass)?.name}</title>
    <style>${cardStyles}</style></head>
    <body>${classStudents.map(s=>buildReportCard(s)).join('')}
    <div class="no-print" style="max-width:800px;margin:0 auto;text-align:center;padding:16px;">
      <button onclick="window.print()" style="padding:12px 36px;background:#1e3a8a;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">⎙ &nbsp;Print All Cards (${classStudents.length})</button>
    </div></body></html>`
    openPrint(html, 860, 960)
  }

  // ── UI ─────────────────────────────────────────────────────────
  const [previewStudent, setPreviewStudent] = useState('')
  const [showPreview,    setShowPreview]    = useState(false)

  const openPreview = () => {
    const sid = previewStudent||(classStudents[0]?.id||'')
    if(!sid) return
    const student = classStudents.find(s=>s.id===sid)
    if(!student) return
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview — ${student.first_name}${student.middle_name?' '+student.middle_name:''} ${student.last_name}</title>
    <style>${cardStyles}</style></head>
    <body>${buildReportCard(student)}
    <div class="no-print" style="max-width:800px;margin:0 auto;text-align:center;padding:16px;">
      <button onclick="window.print()" style="padding:12px 36px;background:#1e3a8a;border:none;border-radius:8px;font-size:14px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:0.02em;">⎙ &nbsp;Print This Card</button>
    </div></body></html>`
    openPrint(html, 860, 960)
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
              options={[{value:'',label:'Select subject'},...(isTeacher?mySubjects.filter(s=>s.class_id===rcClass):classSubjects).map(s=>({value:s.id,label:s.name}))]}/>
          )}
          {rcType==='individual' && rcClass && (
            <Field label='Student' value={rcStudent} onChange={setRcStudent}
              options={[{value:'',label:'All students'},...classStudents.map(s=>({value:s.id,label:fullName(s,true)}))]}/>
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
                  <Avatar name={fullName(s)} size={26} photo={s.photo}/>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--mist)'}}>{fullName(s,true)}</span>
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
            <PlanGate planHook={planHook} feature='reportsExcel' mode='inline'>
              <Btn variant='ghost' onClick={exportExcel} disabled={!canPrintBroadsheet}>
                ⬇ Export Excel
              </Btn>
            </PlanGate>
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
              {classStudents.map(s=><option key={s.id} value={s.id}>{fullName(s,true)}</option>)}
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